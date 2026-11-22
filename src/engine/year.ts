// 1년 진행: 연초 집중 선택 → 이벤트 → 연말 계산

import {
  AGE_LAYOFF_CHANCE,
  AGE_LAYOFF_COMPANY_MULTIPLIER,
  AI_CODING_GROWTH_PENALTY,
  BASE_GROWTH,
  BURNOUT_RESET_STAMINA,
  BURNOUTS_TO_RETIRE,
  CODING_SLOWDOWN_AGE,
  CODING_SLOWDOWN_MULTIPLIER,
  companyTypeById,
  DIMINISHING,
  educationById,
  EVENT_COOLDOWN_YEARS,
  events,
  EXIT_CHANCE,
  EXIT_LUCK,
  EXIT_MIN_YEARS,
  EXIT_MULTIPLIER,
  FOCUS_STAT_MULTIPLIER,
  focusById,
  GRADE_SCORE,
  gradeThresholds,
  GROWTH_LUCK,
  industryById,
  MANAGER_GROWTH_SHIFT,
  NO_PROMOTION_FOCUS,
  OVERTIME_COST,
  OVERWORK_WARNING,
  PROMOTION_CHANCE,
  RANK_EXPECTATION,
  rankById,
  REPUTATION_SUBSTANCE,
  RETIRE_AGE,
  SALARY_CAP,
  SAVINGS_RATE,
  SEVERITY_FAIL_MULTIPLIER,
  SPECIALTY_FIT_MULTIPLIER,
  specialtyById,
  STAMINA_RECOVERY,
  UPPER_SEAT_MULTIPLIER,
} from '../data'
import { checkAchievements, evaluateRetirement } from './ending'
import { eventById, matchesConditions, pendingId, resolveEvent, rollInstance, toInstance, type ResolvedEvent } from './events'
import { generateFeed } from './feed'
import { applicationLimit, generatePostings, rollHeadhunterOffer } from './jobs'
import { createRng, type Rng } from './rng'
import { FOUNDER_EVENT_CATEGORIES, settleStartupYear } from './startup'
import {
  aiPressure,
  applyEffects,
  clamp,
  clampStat,
  marketSalary,
  meetsStats,
  nextPromotion,
  STAT_KEYS,
  unlock,
} from './rules'
import type {
  EventOutcome,
  FeedTrigger,
  FocusId,
  GameEvent,
  GameState,
  Grade,
  Stats,
} from './types'

// ─── 연초 ──────────────────────────────────────────────

export function startYear(state: GameState, focus: FocusId): GameState {
  if (state.phase !== 'year_start') throw new Error(`연초가 아니에요: ${state.phase}`)
  const s = structuredClone(state)
  const rng = createRng(s.rngState)

  s.focus = focus
  s.gradeBonus = 0
  s.offerBonus = 0
  s.yearEvents = []
  s.yearStart = { stats: { ...s.stats }, salary: s.salary, incidents: s.counters.incidents }

  const count = rng.chance(0.5) ? 2 : 1
  const pool = events.filter((e) => isEligible(e, s))
  s.eventLastSeen ??= {}
  for (let i = 0; i < count; i++) {
    const picked = pickEvent(pool.filter((e) => !s.pendingEvents.some((p) => pendingId(p) === e.id)), s, rng)
    if (!picked) continue
    s.pendingEvents.push(rollInstance(picked, s, rng))
    s.eventLastSeen[picked.id] = s.calendarYear
  }

  s.phase = 'event'
  s.rngState = rng.state
  return s
}

/**
 * 후보 중 하나를 가중치로 뽑는다.
 * - 최근 EVENT_COOLDOWN_YEARS년 안에 본 이벤트는 뺀다
 * - 이미 여러 번 본 이벤트일수록 덜 나온다 (가중치 ÷ (1 + 본 횟수))
 * - 후보가 전부 최근에 본 것이면 그중 가장 오래전에 본 이벤트들에서 고른다
 */
function pickEvent(candidates: GameEvent[], s: GameState, rng: Rng): GameEvent | undefined {
  const seen = s.eventLastSeen ?? {}
  const times = (e: GameEvent) => s.seenEvents.filter((id) => id === e.id).length
  const weight = (e: GameEvent) => e.weight / (1 + times(e))
  const fresh = candidates.filter((e) => seen[e.id] === undefined || s.calendarYear - seen[e.id] > EVENT_COOLDOWN_YEARS)
  if (fresh.length > 0) return rng.weighted(fresh, weight)
  const oldest = Math.min(...candidates.map((e) => seen[e.id]))
  return rng.weighted(candidates.filter((e) => seen[e.id] === oldest), weight)
}

export function isEligible(event: GameEvent, s: GameState): boolean {
  if (event.once && s.seenEvents.includes(event.id)) return false
  // 창업 중에는 회사 생활 이벤트가 나오지 않는다
  if (s.startup && !event.conditions?.founder) {
    if (!(FOUNDER_EVENT_CATEGORIES as readonly string[]).includes(event.category) || event.conditions?.companyTypes) return false
  }
  return matchesConditions(event.conditions, s)
}

// ─── 이벤트 ────────────────────────────────────────────

/** 지금 처리할 항목. 데이터에서 사라진 이벤트(예전 세이브 등)는 건너뛴다 */
function currentPending(state: GameState) {
  for (const p of state.pendingEvents) {
    const instance = toInstance(p)
    if (instance) return { pending: p, instance }
  }
  return null
}

/** 지금 보여줄 이벤트. 문구의 변수가 채워지고 효과에 심각도가 반영된 상태로 돌려준다 */
export function currentEvent(state: GameState): ResolvedEvent | null {
  const current = currentPending(state)
  return current ? resolveEvent(current.instance, state) : null
}

/** 올해 남은 이벤트 수 (사라진 이벤트는 셈하지 않는다) */
export function remainingEvents(state: GameState): number {
  return state.pendingEvents.filter((p) => eventById[pendingId(p)]).length
}

function hasPendingEvents(state: GameState): boolean {
  return remainingEvents(state) > 0
}

export function chooseEventOption(
  state: GameState,
  choiceIndex: number,
): { state: GameState; outcome: EventOutcome } {
  const current = currentPending(state)
  if (state.phase !== 'event' || !current) throw new Error('진행 중인 이벤트가 없어요')
  const event = resolveEvent(current.instance, state)
  const choice = event.choices[choiceIndex]
  if (!choice) throw new Error(`없는 선택지예요: ${choiceIndex}`)
  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  // 능력치가 모자라거나 일이 클수록 실패 결과가 잘 나온다
  const severity = event.rolledSeverity
  const failMultiplier = checkFailMultiplier(s.stats, choice.check) * (severity ? SEVERITY_FAIL_MULTIPLIER[severity - 1] : 1)
  const outcome = rng.weighted(choice.outcomes, (o) => (o.tone === 'unlucky' ? o.chance * failMultiplier : o.chance))!

  applyEffects(s, outcome.effects)
  s.pendingEvents = s.pendingEvents.slice(state.pendingEvents.indexOf(current.pending) + 1)
  s.seenEvents.push(event.id)
  s.yearEvents.push({
    eventId: event.id,
    choiceIndex,
    outcomeText: outcome.text,
    title: `${event.emoji} ${event.title}`,
    ...(severity ? { severity } : {}),
  })
  s.rngState = rng.state
  return { state: s, outcome }
}

/**
 * 능력치 판정: 실패 결과 확률에 곱할 배수.
 * 가장 모자란 능력치 기준으로, 기준의 절반이면 ×3, 기준과 같으면 ×1, 1.5배면 ×0.5 (최소 ×0.3)
 */
export function checkFailMultiplier(stats: Stats, check: Partial<Stats> | undefined): number {
  const ratios = Object.entries(check ?? {}).map(([key, target]) => stats[key as keyof Stats] / Math.max(1, target ?? 1))
  if (ratios.length === 0) return 1
  const worst = Math.min(...ratios)
  return worst >= 1 ? Math.max(0.3, 1 - (worst - 1)) : 1 + (1 - worst) * 4
}

// ─── 연말 ──────────────────────────────────────────────

export function finishYear(state: GameState): GameState {
  if (state.phase !== 'event' || hasPendingEvents(state)) {
    throw new Error('이벤트를 모두 끝내야 연말로 갈 수 있어요')
  }
  const s = structuredClone(state)
  s.pendingEvents = []
  const rng = createRng(s.rngState)
  // 작년 허브에서 넘어온 사건(이직)을 올해 피드에 반영하고 비운다
  const triggers: FeedTrigger[] = [...(s.pendingFeedTriggers ?? [])]
  delete s.pendingFeedTriggers
  const rankBefore = s.rank
  // 올해 이벤트로 회사를 떠났다 (희망퇴직·권고사직)
  const leftMidYear = s.unemployed
  const founderYear = Boolean(s.startup)

  // 장애 배지는 실제로 장애 대응을 한 해에만 붙는다 (막아낸 해에는 안 붙음). 연초 기록이 없는 예전 세이브는 이벤트 종류로 판정
  const hadIncident =
    s.yearStart.incidents !== undefined
      ? s.counters.incidents > s.yearStart.incidents
      : s.yearEvents.some((e) => eventById[e.eventId]?.category === '장애')
  if (hadIncident) triggers.push('incident')

  growStats(s, rng)

  // 체력과 번아웃
  const burnedOut = updateStamina(s)
  if (burnedOut) triggers.push('burnout')

  let grade: Grade
  if (s.startup && !leftMidYear) {
    // 창업: 고과·승진·회사 사건 대신 사업 결산 (투자 유치·폐업·엑싯)
    const result = settleStartupYear(s, rng)
    grade = burnedOut && result.grade !== 'S' ? 'D' : result.grade
    if (result.trigger) triggers.push(result.trigger)
  } else {
    // 고과와 연봉
    grade = burnedOut ? 'D' : gradeFor(s, rng)
    let raise = leftMidYear ? 0 : gradeThresholds.find((g) => g.grade === grade)!.raise
    // 시장 연봉보다 많이 받고 있으면 인상 폭이 줄어든다
    if (s.salary > currentMarket(s) * SALARY_CAP.overMarket) raise *= SALARY_CAP.raiseMultiplier
    s.salary = Math.round(s.salary * (1 + raise))

    // 승진
    if (!burnedOut && !leftMidYear && tryPromotion(s, grade, rng)) triggers.push('promoted')

    // 회사 사건 (폐업·구조조정·엑싯), 40대부터는 나이 때문인 권고사직
    const companyEvent = leftMidYear ? 'layoff' : (rollCompanyRisk(s, rng) ?? rollAgeLayoff(s, rng))
    if (companyEvent) triggers.push(companyEvent)
  }
  // 창업 중 이벤트로 회사를 접었다
  if (leftMidYear && s.startup) {
    unlock(s, 'founder_failed')
    delete s.startup
  }

  // 저축
  s.assets += Math.round(s.salary * SAVINGS_RATE)

  // 이직 시장: 가끔 오는 헤드헌터 제안 + 직접 지원할 채용 공고
  s.offers = rollHeadhunterOffer(s, grade, s.focus!, rng)
  s.postings = generatePostings(s, rng)
  s.applicationsLeft = applicationLimit(s.focus, s.unemployed)

  s.yearsAtCompany += 1
  s.yearsAtRank = s.rank === rankBefore ? s.yearsAtRank + 1 : 0
  checkAchievements(s)

  s.history.push({
    ...(founderYear ? { founder: true } : {}),
    calendarYear: s.calendarYear,
    age: s.age,
    company: { ...s.company },
    rank: s.rank,
    focus: s.focus!,
    grade,
    salaryBefore: s.yearStart.salary,
    salaryAfter: s.salary,
    statsBefore: s.yearStart.stats,
    statsAfter: { ...s.stats },
    events: s.yearEvents,
    triggers,
    feed: generateFeed(s, grade, triggers, rng),
  })

  // 다음 해 준비
  s.careerYear += 1
  s.calendarYear += 1
  s.age += 1
  s.focus = null
  s.yearEvents = []

  if (s.age >= RETIRE_AGE) s.retirement = evaluateRetirement(s, 'age')
  else if (s.counters.burnouts >= BURNOUTS_TO_RETIRE) s.retirement = evaluateRetirement(s, 'burnout')

  s.phase = 'year_end'
  s.rngState = rng.state
  return s
}

/** 연말 결과 화면을 닫는다 → 허브 또는 엔딩 */
export function acknowledgeYear(state: GameState): GameState {
  if (state.phase !== 'year_end') throw new Error('연말 결과 화면이 아니에요')
  return { ...state, phase: state.retirement ? 'retired' : 'hub' }
}

// ─── 연말 세부 규칙 (수치는 src/data/balance.ts) ────────

function growStats(s: GameState, rng: Rng): void {
  const company = companyTypeById[s.company.type]
  const industry = industryById[s.company.industry]
  const edu = educationById[s.profile.education]
  const focus = focusById[s.focus!]
  const fit = specialtyById[s.profile.specialty].goodIndustries.includes(s.company.industry)
  const track = rankById[s.rank].track
  const ai = aiPressure(s.calendarYear)
  // 평판은 내세울 실력이 있어야 오른다 (올해 성장 전의 실력 기준)
  const bestSkill = Math.max(s.stats.coding, s.stats.design, s.stats.domain)
  const substance = clamp(
    (bestSkill - REPUTATION_SUBSTANCE.floor) / (REPUTATION_SUBSTANCE.full - REPUTATION_SUBSTANCE.floor),
    REPUTATION_SUBSTANCE.min,
    1,
  )

  for (const key of STAT_KEYS) {
    // 그냥 다니며 느는 양 + 올해의 집중으로 얻는 양에 회사·업종·학력 배수를 곱한다
    let g = BASE_GROWTH[key] + (focus.statGain[key] ?? 0)
    if (track === 'manager') g += MANAGER_GROWTH_SHIFT[key] ?? 0
    g *= company.growth * (industry.growth[key] ?? 1) * edu.growthMultiplier
    if (s.profile.focusStats.includes(key)) g *= FOCUS_STAT_MULTIPLIER
    if (fit && (key === 'domain' || key === 'design')) g *= SPECIALTY_FIT_MULTIPLIER
    if (key === 'coding') g *= 1 - ai * AI_CODING_GROWTH_PENALTY
    if (key === 'coding' && s.age >= CODING_SLOWDOWN_AGE) g *= CODING_SLOWDOWN_MULTIPLIER
    g = Math.max(0, g)
    if (key === 'reputation') g *= substance
    // 높을수록 덜 자란다
    g *= clamp((100 - s.stats[key]) / DIMINISHING.divisor, DIMINISHING.min, DIMINISHING.max)
    g *= rng.range(GROWTH_LUCK[0], GROWTH_LUCK[1])
    s.stats[key] = clampStat(s.stats[key] + g)
  }
  for (const flag of focus.setFlags ?? []) if (!s.flags.includes(flag)) s.flags.push(flag)
}

/** 이 집중을 고르면 올해 체력이 얼마나 변하는지 (이벤트로 깎이는 양은 빼고). 연초 화면에도 보여준다 */
export function staminaChange(s: GameState, focus: FocusId): number {
  const overtime = companyTypeById[s.company.type].overtime
  const recovery = s.age >= STAMINA_RECOVERY.oldAge ? STAMINA_RECOVERY.old : STAMINA_RECOVERY.young
  return recovery + focusById[focus].stamina - OVERTIME_COST[overtime]
}

/**
 * 쉬지 않고는 버티기 힘든 회사인지. 공부만 해도 체력이 기준 이상 깎이면 그 1년 변화량을, 아니면 null.
 * 허브에서 '야근이 적은 회사로 옮기라'는 신호를 보여 줄 때 쓴다
 */
export function overworkDrain(s: GameState): number | null {
  if (s.unemployed) return null
  const change = staminaChange(s, OVERWORK_WARNING.focus)
  return change <= OVERWORK_WARNING.stamina ? change : null
}

/** 체력 갱신. 번아웃이면 true */
function updateStamina(s: GameState): boolean {
  const next = s.stamina + staminaChange(s, s.focus!)
  if (next <= 0) {
    s.counters.burnouts += 1
    s.stamina = BURNOUT_RESET_STAMINA
    return true
  }
  s.stamina = clamp(next, 0, 100)
  return false
}

export function performance(s: GameState): number {
  const ai = aiPressure(s.calendarYear)
  const { coding, design, communication, domain } = s.stats
  switch (rankById[s.rank].track) {
    case 'manager':
      return communication * 0.5 + domain * 0.3 + design * 0.2
    case 'ic':
      return design * 0.5 + coding * (0.3 - ai * 0.1) + domain * (0.2 + ai * 0.1)
    default:
      // 리드 전에도 소통을 조금 본다 (세미나만 열심히 한 사람이 고과에서 완전히 무시되지 않게)
      return coding * (0.45 - ai * 0.2) + design * 0.25 + domain * (0.2 + ai * 0.2) + communication * 0.1
  }
}

function gradeFor(s: GameState, rng: Rng): Grade {
  const focus = focusById[s.focus!]
  let score = GRADE_SCORE.base + (performance(s) - RANK_EXPECTATION[s.rank]) * GRADE_SCORE.perPoint
  score += focus.gradeBonus + s.gradeBonus + rng.range(-GRADE_SCORE.luck, GRADE_SCORE.luck)
  if (s.stamina < GRADE_SCORE.lowStamina) score -= GRADE_SCORE.lowStaminaPenalty
  return gradeThresholds.find((g) => score >= g.minScore)!.grade
}

function currentMarket(s: GameState): number {
  return marketSalary(s.company.type, s.company.industry, s.rank, s.careerYear)
}

function tryPromotion(s: GameState, grade: Grade, rng: Rng): boolean {
  // 쉬거나 이직을 준비한 해는 승진 심사 대상이 아니다
  if (NO_PROMOTION_FOCUS.includes(s.focus!)) return false
  const target = nextPromotion(s)
  const next = target && s.careerYear >= target.minCareerYear && meetsStats(s.stats, target.rank.minStats) ? target.rank : null
  // 리드 위로는 자리가 적다
  const seats = rankById[s.rank].track === 'common' && s.rank !== 'lead' ? 1 : UPPER_SEAT_MULTIPLIER
  if (!next || !rng.chance(PROMOTION_CHANCE[grade] * seats)) return false

  s.rank = next.id
  s.salary = Math.round(s.salary * (1 + next.salaryBump))
  if (rankById[next.id].fameScore > rankById[s.bestRank].fameScore) s.bestRank = next.id
  return true
}

/** 40대부터 해마다 굴리는 권고사직. 나이가 많을수록 잘 잘린다 */
function rollAgeLayoff(s: GameState, rng: Rng): FeedTrigger | null {
  const step = AGE_LAYOFF_CHANCE.find(([age]) => s.age >= age)
  if (!step) return null
  if (!rng.chance(step[1] * (AGE_LAYOFF_COMPANY_MULTIPLIER[s.company.type] ?? 1))) return null
  s.unemployed = true
  return 'layoff'
}

function rollCompanyRisk(s: GameState, rng: Rng): FeedTrigger | null {
  const type = s.company.type
  if (!rng.chance(companyTypeById[type].risk)) return null

  if (type === 'seed' || type === 'series_b' || type === 'unicorn') {
    if (s.yearsAtCompany >= EXIT_MIN_YEARS && rng.chance(EXIT_CHANCE[type])) {
      s.assets += Math.round(s.salary * EXIT_MULTIPLIER[type] * rng.range(EXIT_LUCK[0], EXIT_LUCK[1]))
      s.counters.exits += 1
      unlock(s, 'stock_lottery')
      if (type !== 'unicorn') s.company = { ...s.company, name: `${s.company.name} (인수됨)`, type: 'bigtech' }
      return 'exit'
    }
    s.counters.startupFailures += 1
    s.unemployed = true
    return 'companyClosed'
  }
  s.unemployed = true
  return 'layoff'
}
