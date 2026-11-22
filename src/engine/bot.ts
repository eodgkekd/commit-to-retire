// 자동 플레이 봇. 밸런스 시뮬레이션과 테스트에서 한 판을 끝까지 돌릴 때 쓴다.

import { companyTypeById, companyTypes, FIRST_JOB, focuses, specialties, playStyles, educations, START_AGE_MIN, START_AGE_MAX } from '../data'
import { acceptOffer, canChooseTrack, chooseTrack, declineOffers, nextYear } from './hub'
import { applyToPosting, canSpendGapYear, spendGapYear } from './jobs'
import { createRng, type Rng } from './rng'
import { nextPromotion, pickIndustry } from './rules'
import { applyFirstJobs } from './firstJob'
import { createGame } from './setup'
import type { CompanyTypeId, FocusId, GameState, Profile, StatKey } from './types'
import { acknowledgeYear, chooseEventOption, currentEvent, finishYear, staminaChange, startYear } from './year'

/** 이름 붙은 기본 전략: 무작위 / 일만 하는 사람 / 이직러 */
export type NamedStrategy = 'random' | 'grinder' | 'hopper'

/** 봇의 행동 규칙. 체력이 낮으면 어떤 전략이든 쉰다 */
export interface BotPolicy {
  /** 올해의 집중 */
  focus: (s: GameState, rng: Rng) => FocusId
  /** 리드에서 고를 트랙 */
  track: 'manager' | 'ic' | 'random'
  /** 재직 중 채용 공고 지원: 안 함 / 30% 확률 / 매년 */
  apply: 'never' | 'sometimes' | 'always'
  /** 연봉이 더 높은 제안을 받았을 때 옮길 확률 */
  moveChance: number
}

export type BotStrategy = NamedStrategy | BotPolicy

const NAMED: Record<NamedStrategy, BotPolicy> = {
  random: { focus: (_s, rng) => rng.pick(focuses).id, track: 'random', apply: 'sometimes', moveChance: 1 },
  grinder: { focus: (_s, rng) => rng.pick(['all_in', 'study'] as const), track: 'random', apply: 'never', moveChance: 0.2 },
  hopper: { focus: (_s, rng) => rng.pick(['job_hunt', 'networking', 'study'] as const), track: 'random', apply: 'always', moveChance: 1 },
}

/** 매년 같은 집중만 고르는 전략. 한 버튼 필승법이 생겼는지 확인하는 데 쓴다 */
export function fixedPolicy(focus: FocusId, track: 'manager' | 'ic'): BotPolicy {
  return { focus: () => focus, track, apply: 'never', moveChance: 0 }
}

/** 정해진 순서로 돌아가며 고르는 전략 */
export function cyclePolicy(order: FocusId[], track: 'manager' | 'ic'): BotPolicy {
  return { focus: (s) => order[s.history.length % order.length], track, apply: 'never', moveChance: 0 }
}

const FOCUS_FOR_STAT: Record<StatKey, FocusId> = {
  coding: 'study',
  design: 'study',
  communication: 'networking',
  reputation: 'networking',
  domain: 'all_in',
}

/**
 * 다음 승진 조건을 보고 모자란 능력치를 채우는 전략 (허브의 승진 조건 카드를 읽는 사람).
 * 가장 많이 모자란 능력치에 맞는 집중을 고르고, 다 채웠으면 업무에 올인해 고과를 챙긴다.
 */
export function promotionMindedPolicy(track: 'manager' | 'ic'): BotPolicy {
  return {
    focus: (s) => {
      const next = nextPromotion(s, track)
      if (!next) return 'networking'
      const gaps = (Object.entries(next.rank.minStats) as [StatKey, number][])
        .map(([key, min]) => ({ key, gap: min - s.stats[key] }))
        .filter((g) => g.gap > 0)
        .sort((a, b) => b.gap - a.gap)
      return gaps.length > 0 ? FOCUS_FOR_STAT[gaps[0].key] : 'all_in'
    },
    track,
    apply: 'never',
    moveChance: 0,
  }
}

/** 시드로 무작위 프로필과 첫 회사를 정해 새 게임을 만든다 */
export function randomGame(seed: number): GameState {
  const rng = createRng(seed)
  const profile: Profile = {
    name: '봇',
    emoji: '🤓',
    startAge: rng.int(START_AGE_MIN, START_AGE_MAX),
    education: rng.pick(educations).id,
    specialty: rng.pick(specialties).id,
    playStyle: rng.pick(playStyles).id,
    focusStats: [rng.pick(['coding', 'design', 'communication', 'domain'] as const)],
  }
  // 사람처럼 세 곳에 지원하고, 붙은 곳 중 초봉이 가장 높은 회사로 간다. 다 떨어지면 전형 없는 회사로
  const candidates = companyTypes.map((c) => c.id).filter((id) => !FIRST_JOB.safetyTypes.includes(id))
  const picks: CompanyTypeId[] = []
  while (picks.length < FIRST_JOB.applications) {
    const pick = rng.pick(candidates)
    if (!picks.includes(pick)) picks.push(pick)
  }
  const offers = applyFirstJobs(profile, picks, rng.int(1, 2 ** 31)).filter((r) => !r.failedAt).map((r) => r.type)
  const companyType = offers.length > 0
    ? offers.reduce((best, id) => (companyTypeById[id].baseSalary > companyTypeById[best].baseSalary ? id : best))
    : rng.pick(FIRST_JOB.safetyTypes)
  return createGame({
    profile,
    companyType,
    industry: pickIndustry(rng, companyType),
    seed: rng.int(1, 2 ** 31),
  })
}

/**
 * 고른 집중대로 한 해를 보낸 뒤 예상 체력이 이 값 아래면 쉰다.
 * 연초 화면이 집중별 예상 체력 변화를 보여주므로, 그걸 보고 판단하는 사람과 같은 기준이다.
 * 이벤트로 깎이는 양(한 해 최대 40~50)은 예상에 없어서 여유를 둔다.
 */
export const BOT_SAFE_STAMINA = 25

/** 은퇴할 때까지 플레이한다 */
export function playToEnd(initial: GameState, strategy: BotStrategy = 'random', botSeed = 1): GameState {
  const policy = typeof strategy === 'string' ? NAMED[strategy] : strategy
  const rng = createRng(botSeed)
  let s = initial

  for (let guard = 0; guard < 100 && s.phase !== 'retired'; guard++) {
    // 연초: 체력이 낮으면 쉬고, 아니면 전략대로
    const planned = policy.focus(s, rng)
    s = startYear(s, s.stamina + staminaChange(s, planned) < BOT_SAFE_STAMINA ? 'rest' : planned)

    // 이벤트: 선택지 중 무작위
    for (let event = currentEvent(s); event; event = currentEvent(s)) {
      const choiceIndex = rng.int(0, event.choices.length - 1)
      s = chooseEventOption(s, choiceIndex).state
    }

    s = acknowledgeYear(finishYear(s))
    if (s.phase === 'retired') break

    if (canChooseTrack(s)) {
      s = chooseTrack(s, policy.track === 'random' ? (rng.chance(0.5) ? 'manager' : 'ic') : policy.track)
    }

    // 지원: 실직이면 무조건, 그 밖에는 전략에 따라
    const wantsToApply = policy.apply === 'always' || (policy.apply === 'sometimes' && rng.chance(0.3))
    if (wantsToApply && !s.unemployed) s = applyAll(s, 'salary')

    if (s.offers.length > 0 && !s.unemployed) {
      const best = bestOffer(s)
      const better = s.offers[best].salary > s.salary
      const wantsMove = better && policy.moveChance > 0 && (policy.moveChance >= 1 || rng.chance(policy.moveChance))
      s = wantsMove ? acceptOffer(s, best) : declineOffers(s)
    }

    // 실직: 붙을 때까지 지원하고, 전부 떨어지면 취준 1년
    while (s.phase === 'hub' && s.unemployed) {
      s = applyAll(s, 'easy')
      if (s.offers.length > 0) s = acceptOffer(s, bestOffer(s))
      else if (canSpendGapYear(s)) s = spendGapYear(s)
    }
    if (s.phase === 'retired') break
    s = nextYear(s)
  }
  return s
}

function bestOffer(s: GameState): number {
  return s.offers.reduce((bi, o, i, arr) => (o.salary > arr[bi].salary ? i : bi), 0)
}

/** 남은 지원 횟수를 다 쓴다. salary: 연봉 높은 곳부터, easy: 문턱 낮은 곳부터 */
function applyAll(s: GameState, order: 'salary' | 'easy'): GameState {
  while ((s.applicationsLeft ?? 0) > 0) {
    const candidates = (s.postings ?? [])
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !p.applied)
      .sort((a, b) =>
        order === 'salary'
          ? b.p.salary - a.p.salary
          : companyTypeById[a.p.company.type].hiringBar - companyTypeById[b.p.company.type].hiringBar,
      )
    if (candidates.length === 0) break
    s = applyToPosting(s, candidates[0].i).state
  }
  return s
}
