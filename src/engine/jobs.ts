// 이직 시장: 헤드헌터 제안, 채용 공고, 지원 전형, 취준 공백기

import {
  AGE_HIRING_PENALTY,
  CHICKEN,
  companyTypeById,
  companyTypes,
  focusById,
  GAP_HIRING_PENALTY,
  ranks,
  rankById,
  RETIRE_AGE,
} from '../data'
import { evaluateRetirement } from './ending'
import { createRng, type Rng } from './rng'
import { clamp, hiringScore, marketSalary, meetsStats, pickCompanyName, pickIndustry, unlock } from './rules'
import type {
  ApplicationResult,
  ChickenOutcome,
  Company,
  CompanyTypeId,
  FocusId,
  GameState,
  Grade,
  HiringStage,
  JobOffer,
  JobPosting,
  RankId,
} from './types'

export const HIRING_STAGES: HiringStage[] = ['resume', 'codingTest', 'techInterview', 'finalInterview']

export const STAGE_LABELS: Record<HiringStage, string> = {
  resume: '서류',
  codingTest: '코딩테스트',
  techInterview: '기술 면접',
  finalInterview: '임원 면접',
}

const POSTINGS_PER_YEAR = 5
/** 취준 1년 생활비 (만 원) */
const GAP_YEAR_COST = 2400

// ─── 연말에 호출: 헤드헌터 제안 + 채용 공고 ─────────────

/** 올해 연말 지원 가능 횟수: 평소 1곳, 이직 준비 3곳, 실직 5곳 */
export function applicationLimit(focus: FocusId | null, unemployed: boolean): number {
  if (unemployed) return 5
  return focus === 'job_hunt' ? 3 : 1
}

/**
 * 헤드헌터 제안 확률. 가만히 있어도 오는 제안이라 드물다.
 * 1~2년차 3%, 3~10년차 12%, 11~20년차 15%, 그 뒤 8% + 평판·네트워킹·고과 보정, 50세 이후 절반
 */
export function headhunterChance(s: GameState, grade: Grade, focus: FocusId): number {
  const y = s.careerYear
  let p = y <= 2 ? 0.03 : y <= 10 ? 0.12 : y <= 20 ? 0.15 : 0.08
  p += s.stats.reputation * 0.003
  p += focusById[focus].offerBonus * 0.05 + (s.offerBonus ?? 0) * 0.1
  if (grade === 'S') p += 0.05
  if (s.age >= 50) p *= 0.5
  return clamp(p, 0, 0.6)
}

export function rollHeadhunterOffer(s: GameState, grade: Grade, focus: FocusId, rng: Rng): JobOffer[] {
  if (!rng.chance(headhunterChance(s, grade, focus))) return []
  // 헤드헌터는 내 이력으로 붙을 만한 회사를 가져온다
  for (let attempt = 0; attempt < 6; attempt++) {
    const type = rng.pick(companyTypes).id
    if (hiringScore(s.stats, s.profile.education, type) < companyTypeById[type].hiringBar) continue
    const industry = pickIndustry(rng, type)
    const name = pickCompanyName(rng, type, [s.company.name, ...closedCompanies(s)])
    if (!name) continue
    const offer = makeOffer(s, { name, type, industry }, postingRank(s, rng), rng)
    if (!worthMoving(s, offer)) continue
    return [{ ...offer, source: 'headhunter' }]
  }
  return []
}

/** 다니다가 폐업한 회사들. 공고와 헤드헌터 제안에 다시 나오지 않는다 */
export function closedCompanies(s: GameState): string[] {
  return s.history.filter((r) => r.triggers.includes('companyClosed')).map((r) => r.company.name)
}

export function generatePostings(s: GameState, rng: Rng): JobPosting[] {
  const postings: JobPosting[] = []
  const used = new Set([s.company.name, ...closedCompanies(s)])
  for (let attempt = 0; attempt < 30 && postings.length < POSTINGS_PER_YEAR; attempt++) {
    const type = rng.pick(companyTypes).id
    const name = pickCompanyName(rng, type, [...used])
    if (!name) continue
    used.add(name)
    const company: Company = { name, type, industry: pickIndustry(rng, type) }
    const rank = postingRank(s, rng)
    const offer = makeOffer(s, company, rank, rng)
    if (!worthMoving(s, offer)) continue
    postings.push({ ...offer, applied: false })
  }
  return postings
}

/** 선택한 트랙 안에서 경력·역량을 갖추면 한 단계 위 포지션도 제안한다. */
function postingRank(s: GameState, rng: Rng): RankId {
  // 쉬어간 해에는 승진 포지션을 제안하지 않는다. 이직 준비는 승진 이직이 가능하다.
  // 실직 중에는 같은 직급으로만 재취업한다.
  if (s.unemployed || (s.focus ?? s.history.at(-1)?.focus) === 'rest') return s.rank
  const up = ranks.find(
    (r) => r.from === s.rank && (r.track === 'common' || r.track === s.preferredTrack || r.track === rankById[s.rank].track) &&
      s.careerYear >= r.minYears && s.yearsAtRank >= 2 && meetsStats(s.stats, r.minStats),
  )
  return up && rng.chance(0.45) ? up.id : s.rank
}

function worthMoving(s: GameState, offer: JobOffer): boolean {
  return s.unemployed || offer.salary > s.salary || rankById[offer.rank].fameScore > rankById[s.rank].fameScore
}

export function makeOffer(s: GameState, company: Company, rank: RankId, rng: Rng): JobOffer {
  // 자금 여력이 있는 스타트업의 경력자 영입 예산. 모든 스타트업의 현금 보상을 보장하지는 않는다.
  const recruitmentPremium = ['series_b', 'unicorn'].includes(company.type) &&
    ['chaebol', 'chaebol_si', 'bigtech', 'foreign'].includes(s.company.type) && s.careerYear >= 4 && !s.unemployed
  const raise = s.unemployed ? rng.range(0.9, 1.1) : recruitmentPremium ? rng.range(1.2, 1.4) : rng.range(1.08, 1.3)
  const market = marketSalary(company.type, company.industry, rank, s.careerYear)
  const salaryCeiling = Math.round(market * (recruitmentPremium ? 2.4 : 1.8))
  // 최초 제안은 예산의 일부를 남겨 협상 여지를 둔다. 현 연봉을 반복해서 무한 증폭시키지 않는다.
  const salary = Math.round(Math.min(Math.max(s.salary * raise, market), salaryCeiling / 1.15))
  return { company, rank, salary, salaryCeiling, recruitmentPremium }
}

export const NEGOTIATION_RAISES = [5, 10, 20] as const
export type NegotiationRaise = typeof NEGOTIATION_RAISES[number]

/** 오퍼마다 한 번. 거절되어도 원래 제안은 남고, RNG 상태와 결과는 저장된다. */
export function negotiateOffer(state: GameState, index: number, percent: NegotiationRaise): GameState {
  if (state.phase !== 'hub') throw new Error('허브에서만 협상할 수 있어요')
  const offer = state.offers[index]
  if (!offer) throw new Error('없는 제안이에요')
  if (offer.negotiation) throw new Error('이미 협상을 마친 제안이에요')
  if (!NEGOTIATION_RAISES.includes(percent)) throw new Error('지원하지 않는 협상 조건이에요')
  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  const requestedSalary = Math.round(offer.salary * (1 + percent / 100))
  const ceiling = offer.salaryCeiling ?? Math.round(offer.salary * 1.15)
  const chance = clamp(0.6 + s.stats.communication * 0.003 + s.stats.reputation * 0.001 - percent * 0.025 - (s.unemployed ? 0.1 : 0), 0.1, 0.9)
  const accepted = rng.chance(chance) && requestedSalary <= ceiling
  s.offers[index] = { ...offer, salary: accepted ? requestedSalary : offer.salary,
    negotiation: { requestedSalary, originalSalary: offer.salary, accepted } }
  s.rngState = rng.state
  return s
}

// ─── 허브에서 호출: 지원하기 ────────────────────────────

/** 단계별 통과 확률. 기준보다 높을수록 잘 붙는다 (5%~95%) */
export function stagePassChance(s: GameState, type: CompanyTypeId, stage: HiringStage, rankUp: boolean): number {
  const bar = companyTypeById[type].hiringBar
  const { coding, design, communication } = s.stats
  const careerExpectation = Math.min(s.careerYear * 2.5, 40)
  const stretch = rankUp ? 8 : 0
  const [value, target] = (() => {
    switch (stage) {
      case 'resume':
        return [hiringScore(s.stats, s.profile.education, type), bar + careerExpectation + stretch]
      case 'codingTest':
        return [coding, 35 + bar * 0.5 + stretch]
      case 'techInterview':
        return [(coding + design) / 2, 30 + bar * 0.5 + Math.min(s.careerYear, 20) + stretch]
      case 'finalInterview':
        return [communication, 25 + bar * 0.4 + stretch]
    }
  })()
  const jobHuntBonus = s.history[s.history.length - 1]?.focus === 'job_hunt' ? 0.1 : 0
  return clamp(0.5 + (value - target) / 40 + jobHuntBonus - agePenalty(s, stage) - gapPenalty(s, stage), 0.05, 0.95)
}

/** 40대부터 서류와 면접에서 나이가 걸린다. 코딩테스트는 점수로만 본다 */
export function agePenalty(s: GameState, stage: HiringStage): number {
  if (stage === 'codingTest') return 0
  const { from, perYear, max } = AGE_HIRING_PENALTY
  return Math.min(max, Math.max(0, s.age - from + 1) * perYear)
}

/** 취업 준비로 보낸 해가 이어질수록 서류에서 "공백기가 기네요"를 듣는다 */
export function gapPenalty(s: GameState, stage: HiringStage): number {
  if (stage !== 'resume') return 0
  let years = 0
  for (let i = s.history.length - 1; i >= 0 && s.history[i].gap; i--) years++
  return years * GAP_HIRING_PENALTY
}

export function applyToPosting(state: GameState, index: number): { state: GameState; result: ApplicationResult } {
  if (state.phase !== 'hub') throw new Error('허브에서만 지원할 수 있어요')
  const posting = state.postings?.[index]
  if (!posting) throw new Error(`없는 공고예요: ${index}`)
  if (posting.applied) throw new Error('이미 지원한 공고예요')
  if ((state.applicationsLeft ?? 0) <= 0) throw new Error('올해 지원 횟수를 다 썼어요')

  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  const rankUp = posting.rank !== s.rank
  const passed: HiringStage[] = []
  let failedAt: HiringStage | null = null

  for (const stage of HIRING_STAGES) {
    if (rng.chance(stagePassChance(s, posting.company.type, stage, rankUp))) {
      passed.push(stage)
    } else {
      failedAt = stage
      break
    }
  }

  s.postings![index] = { ...posting, applied: true, result: failedAt ?? 'passed' }
  s.applicationsLeft = (s.applicationsLeft ?? 0) - 1
  if (!failedAt) s.offers.push({ company: posting.company, rank: posting.rank, salary: posting.salary,
    salaryCeiling: posting.salaryCeiling, recruitmentPremium: posting.recruitmentPremium, source: 'application' })
  s.rngState = rng.state
  return { state: s, result: { posting: s.postings![index], passed, failedAt } }
}

// ─── 실직 후 전부 탈락: 취준 1년 ─────────────────────────

export function canSpendGapYear(s: GameState): boolean {
  return s.phase === 'hub' && s.unemployed && s.offers.length === 0 && (s.applicationsLeft ?? 0) === 0
}

/** 연봉 없이 1년을 보내고 다시 지원한다. 경력 연차는 늘지 않는다 */
export function spendGapYear(state: GameState): GameState {
  if (!canSpendGapYear(state)) throw new Error('지금은 공백기를 보낼 수 없어요')
  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  const statsBefore = { ...s.stats }

  s.assets -= GAP_YEAR_COST
  s.stamina = clamp(s.stamina + 30, 0, 100)
  s.stats.coding = Math.min(100, s.stats.coding + rng.int(1, 3))
  s.history.push({
    gap: true,
    calendarYear: s.calendarYear,
    age: s.age,
    company: { ...s.company },
    rank: s.rank,
    focus: 'job_hunt',
    grade: 'D',
    salaryBefore: s.salary,
    salaryAfter: s.salary,
    statsBefore,
    statsAfter: { ...s.stats },
    events: [],
    triggers: [],
    feed: [],
  })
  s.calendarYear += 1
  s.age += 1
  s.postings = generatePostings(s, rng)
  s.applicationsLeft = applicationLimit(null, true)
  if (s.age >= RETIRE_AGE) {
    s.retirement = evaluateRetirement(s, 'age')
    s.phase = 'retired'
  }
  s.rngState = rng.state
  return s
}


// ─── 실직한 40대: 치킨집 창업 ───────────────────────────

export function canOpenChickenShop(s: GameState): boolean {
  return s.phase === 'hub' && s.unemployed && s.age >= CHICKEN.minAge
}

/** 치킨집 결과 확률. 소통이 높을수록 단골이 생긴다 */
export function chickenChances(s: GameState): Record<ChickenOutcome, number> {
  const d = s.stats.communication - CHICKEN.communicationPivot
  const franchise = clamp(CHICKEN.chances.franchise + d * 0.003, 0.03, 0.3)
  const closed = clamp(CHICKEN.chances.closed - d * 0.005, 0.25, 0.75)
  return { franchise, closed, local: 1 - franchise - closed }
}

/** 퇴직금과 모은 돈으로 치킨집을 차리고 은퇴한다 */
export function openChickenShop(state: GameState): GameState {
  if (!canOpenChickenShop(state)) throw new Error('지금은 치킨집을 차릴 수 없어요')
  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  const chances = chickenChances(s)
  const outcome = rng.weighted<ChickenOutcome>(['franchise', 'local', 'closed'], (o) => chances[o])!

  s.assets -= CHICKEN.cost
  if (outcome === 'local') s.assets += CHICKEN.localYearlyProfit * Math.max(1, RETIRE_AGE - s.age)
  if (outcome === 'franchise') s.assets += CHICKEN.franchiseProfit
  unlock(s, outcome === 'franchise' ? 'chicken_franchise' : 'chicken_shop')

  s.retirement = { ...evaluateRetirement(s, 'chicken'), chicken: outcome }
  s.phase = 'retired'
  s.rngState = rng.state
  return s
}
