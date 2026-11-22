// 창업 진로: 사이드 프로젝트를 꾸준히 한 사람이 허브에서 회사를 차린다.
// 해마다 연말에 사업 점수를 굴려 투자 유치 · 버티기 · 폐업 · 엑싯이 정해진다 (수치는 src/data/balance.ts의 STARTUP)

import { companyTypeById, startupNames, STARTUP } from '../data'
import { createRng, type Rng } from './rng'
import { formatSalary, marketSalary, unlock } from './rules'
import type { FeedTrigger, GameState, Grade, IndustryId } from './types'

/** 사이드 프로젝트를 고른 햇수. 창업했던 적이 있으면 그 회사를 접은 뒤부터 센다 */
export function sideProjectYears(s: GameState): number {
  const lastFounderYear = s.history.findLastIndex((r) => r.founder)
  return s.history.slice(lastFounderYear + 1).filter((r) => r.focus === 'side_project').length
}

export function canFoundStartup(s: GameState): boolean {
  return (
    s.phase === 'hub' &&
    !s.startup &&
    s.careerYear >= STARTUP.minCareerYear &&
    s.age <= STARTUP.maxAge &&
    s.assets >= STARTUP.minAssets &&
    sideProjectYears(s) >= STARTUP.minSideProjectYears
  )
}

/** 사이드 프로젝트 조건은 채웠는데 다른 조건이 모자라면 그 이유 (허브 안내용) */
export function startupBlocker(s: GameState): string | null {
  if (s.startup || sideProjectYears(s) < STARTUP.minSideProjectYears) return null
  if (s.age > STARTUP.maxAge) return null
  if (s.careerYear < STARTUP.minCareerYear) return `경력 ${STARTUP.minCareerYear}년 차부터 창업할 수 있어요`
  if (s.assets < STARTUP.minAssets) return `통장에 ${formatSalary(STARTUP.minAssets)} 원은 있어야 창업할 수 있어요`
  return null
}

/** 회사를 그만두고 창업한다. 업종은 지금 일하는 업종을 이어가고, 스타트업이 못 하는 업종이면 새로 고른다 */
export function foundStartup(state: GameState): GameState {
  if (!canFoundStartup(state)) throw new Error('지금은 창업할 수 없어요')
  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  const allowed = companyTypeById.seed.industries
  const industry: IndustryId = allowed.includes(s.company.industry) ? s.company.industry : rng.pick(allowed)
  const used = s.history.map((r) => r.company.name)
  const name = rng.pick(startupNames.filter((n) => !used.includes(n)).concat(used.length >= startupNames.length ? startupNames : []))

  s.company = { name, type: 'seed', industry }
  s.startup = { stage: 0, years: 0 }
  s.salary = STARTUP.salary[0]
  s.yearsAtCompany = 0
  s.unemployed = false
  s.offers = []
  s.postings = []
  s.applicationsLeft = 0
  unlock(s, 'founder')
  if (!s.pendingFeedTriggers?.includes('startupFounded')) {
    s.pendingFeedTriggers = [...(s.pendingFeedTriggers ?? []), 'startupFounded']
  }
  s.rngState = rng.state
  return s
}

/** 올해 사업 점수 (운 제외). 단계 목표와 비교한다 */
export function startupScore(s: GameState): number {
  const { design, communication, domain, reputation } = s.stats
  const focusBonus = STARTUP.focusBonus[s.focus ?? 'rest'] ?? 0
  return (design + communication + domain) / 3 + reputation * STARTUP.reputationWeight + focusBonus + s.gradeBonus
}

/**
 * 창업한 해의 연말 결산. 투자 단계·연봉·자산을 바꾸고 그해 고과(사업 성적)와 피드 사건을 돌려준다.
 * 폐업하면 실직 상태가 되고, 엑싯하면 인수한 회사의 직원이 된다
 */
export function settleStartupYear(s: GameState, rng: Rng): { grade: Grade; trigger: FeedTrigger | null } {
  const startup = s.startup!
  startup.years += 1
  const margin = startupScore(s) + rng.range(-STARTUP.luck, STARTUP.luck) - STARTUP.targets[startup.stage]

  // 월급 없는 단계에서는 모아 둔 돈으로 버틴다
  if (startup.stage === 0) s.assets -= STARTUP.livingCost

  if (startup.stage === STARTUP.targets.length - 1 && margin >= 0 && rng.chance(STARTUP.exitChance)) {
    s.assets += Math.round(rng.range(STARTUP.exitPayout[0], STARTUP.exitPayout[1]))
    s.counters.exits += 1
    unlock(s, 'founder_exit')
    s.company = { ...s.company, name: `${s.company.name} (인수됨)`, type: 'bigtech' }
    s.salary = Math.max(s.salary, marketSalary('bigtech', s.company.industry, s.rank, s.careerYear))
    delete s.startup
    return { grade: 'S', trigger: 'startupExit' }
  }

  const broke = startup.stage === 0 && s.assets < 0
  if (broke || (margin < STARTUP.failMargin && rng.chance(STARTUP.failChance))) {
    // 다니던 회사의 폐업만 세는 '스톡옵션 휴지' 카운터와 별개로, 내 회사는 업적으로만 남긴다
    unlock(s, 'founder_failed')
    s.unemployed = true
    s.salary = STARTUP.salary[startup.stage]
    delete s.startup
    return { grade: 'D', trigger: 'startupFailed' }
  }

  if (margin >= STARTUP.raiseMargin && startup.stage < STARTUP.targets.length - 1) {
    startup.stage += 1
    s.salary = STARTUP.salary[startup.stage]
    return { grade: 'A', trigger: 'startupRaised' }
  }
  return { grade: margin < STARTUP.failMargin ? 'C' : 'B', trigger: null }
}

/** 창업 중에 나오는 이벤트 종류 (나머지는 회사에 다닐 때 일어나는 일이라 빠진다) */
export const FOUNDER_EVENT_CATEGORIES = ['개인', '생활', '업계', '장애'] as const
