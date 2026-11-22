// 이벤트 한 건의 '장면' 만들기: 심각도·변형·변수를 굴리고, 문구와 효과를 그에 맞게 풀어낸다.
// 굴린 값은 GameState.pendingEvents에 저장하므로 저장 후 이어해도 같은 장면이 나온다.

import { events, rankById, SEVERITY_EFFECT_MULTIPLIER, SEVERITY_WEIGHTS } from '../data'
import type { Rng } from './rng'
import { fillTemplate } from './text'
import type {
  Effects,
  EventConditions,
  EventVarDef,
  EventVarSource,
  GameEvent,
  GameState,
  PendingEvent,
  Severity,
  StatKey,
} from './types'

export const eventById = Object.fromEntries(events.map((e) => [e.id, e])) as Record<string, GameEvent>

const SEVERITIES: Severity[] = [1, 2, 3]

/** 문구에 언제나 쓸 수 있는 변수 */
export const BUILT_IN_VARS = ['name', 'company', 'rank'] as const

export function pendingId(p: string | PendingEvent): string {
  return typeof p === 'string' ? p : p.id
}

export function matchesConditions(c: EventConditions | undefined, s: GameState): boolean {
  if (!c) return true
  if (c.minCareerYear !== undefined && s.careerYear < c.minCareerYear) return false
  if (c.maxCareerYear !== undefined && s.careerYear > c.maxCareerYear) return false
  if (c.minAge !== undefined && s.age < c.minAge) return false
  if (c.maxAge !== undefined && s.age > c.maxAge) return false
  if (c.minCalendarYear !== undefined && s.calendarYear < c.minCalendarYear) return false
  if (c.maxYearsAtCompany !== undefined && s.yearsAtCompany > c.maxYearsAtCompany) return false
  if (c.minJobChanges !== undefined && s.counters.jobChanges < c.minJobChanges) return false
  if (c.maxJobChanges !== undefined && s.counters.jobChanges > c.maxJobChanges) return false
  if (c.companyTypes && !c.companyTypes.includes(s.company.type)) return false
  if (c.industries && !c.industries.includes(s.company.industry)) return false
  if (c.ranks && !c.ranks.includes(s.rank)) return false
  if (c.specialties && !c.specialties.includes(s.profile.specialty)) return false
  if (c.flags && !c.flags.every((f) => s.flags.includes(f))) return false
  if (c.notFlags && c.notFlags.some((f) => s.flags.includes(f))) return false
  if (c.founder !== undefined && c.founder !== Boolean(s.startup)) return false
  return true
}

// ─── 굴리기 ────────────────────────────────────────────

function sourceFor(def: EventVarDef, severity: Severity): EventVarSource {
  return 'bySeverity' in def ? def.bySeverity[severity - 1] : def
}

function rollVar(source: EventVarSource, rng: Rng): string {
  return Array.isArray(source) ? rng.pick(source) : String(rng.int(source.min, source.max))
}

/** 굴리지 않고 정하는 기본값 (예전 세이브의 이벤트용): 목록의 첫 항목, 범위의 최솟값 */
function defaultVar(source: EventVarSource): string {
  return Array.isArray(source) ? source[0] : String(source.min)
}

/** 이벤트가 뽑혔을 때 한 번 굴린다: 심각도 → 변형 → 변수 순서 */
export function rollInstance(event: GameEvent, s: GameState, rng: Rng): PendingEvent {
  const severity: Severity = event.severity ? rng.weighted(SEVERITIES, (v) => SEVERITY_WEIGHTS[v - 1])! : 2

  // 기본 장면(null)과 조건이 맞는 변형 중 하나
  let variant: number | null = null
  if (event.variants?.length) {
    const options: (number | null)[] = [null]
    event.variants.forEach((v, i) => {
      if (matchesConditions(v.conditions, s)) options.push(i)
    })
    variant = rng.pick(options)
  }

  const vars: Record<string, string> = {}
  for (const [key, def] of Object.entries(event.vars ?? {})) vars[key] = rollVar(sourceFor(def, severity), rng)
  return { id: event.id, severity, variant, vars }
}

/** 저장된 항목을 장면으로 바꾼다. 예전 세이브의 문자열 항목은 기본값으로 채운다. 사라진 이벤트면 null */
export function toInstance(p: string | PendingEvent): PendingEvent | null {
  const event = eventById[pendingId(p)]
  if (!event) return null
  if (typeof p !== 'string') return p
  const vars: Record<string, string> = {}
  for (const [key, def] of Object.entries(event.vars ?? {})) vars[key] = defaultVar(sourceFor(def, 2))
  return { id: p, severity: 2, variant: null, vars }
}

// ─── 풀어내기 ──────────────────────────────────────────

/** 문구가 채워지고 효과에 심각도가 반영된, 화면에 그대로 보여줄 이벤트 */
export interface ResolvedEvent extends GameEvent {
  /** 심각도를 굴리는 이벤트만 값이 있다 */
  rolledSeverity: Severity | null
}

/** 심각도에 따라 체력·고과·능력치 변화를 키우거나 줄인다. 0이 아니던 값이 0이 되지는 않는다 */
export function scaleEffects(effects: Effects, severity: Severity): Effects {
  const m = SEVERITY_EFFECT_MULTIPLIER[severity - 1]
  if (m === 1) return effects
  const scale = (v: number) => (v === 0 ? 0 : Math.round(v * m) || Math.sign(v))
  const scaled: Effects = { ...effects }
  if (effects.stamina) scaled.stamina = scale(effects.stamina)
  if (effects.gradeBonus) scaled.gradeBonus = scale(effects.gradeBonus)
  if (effects.stats) {
    scaled.stats = Object.fromEntries(Object.entries(effects.stats).map(([k, v]) => [k, scale(v)])) as Partial<Record<StatKey, number>>
  }
  return scaled
}

export function resolveEvent(instance: PendingEvent, s: GameState): ResolvedEvent {
  const event = eventById[instance.id]
  const scene = (instance.variant !== null && event.variants?.[instance.variant]) || event
  const values: Record<string, string> = {
    name: s.profile.name,
    company: s.company.name,
    rank: rankById[s.rank].label,
    ...instance.vars,
  }
  const fill = (text: string) => fillTemplate(text, values)
  const severity = event.severity ? instance.severity : 2

  return {
    ...event,
    title: fill(scene.title),
    text: fill(scene.text),
    choices: event.choices.map((c) => ({
      ...c,
      label: fill(c.label),
      outcomes: c.outcomes.map((o) => ({ ...o, text: fill(o.text), effects: scaleEffects(o.effects, severity) })),
    })),
    rolledSeverity: event.severity ? instance.severity : null,
  }
}
