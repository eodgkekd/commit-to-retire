// 저장 데이터(localStorage)를 지금 버전이 읽을 수 있는지 검사한다.
// 회사 유형·직급 같은 데이터 id가 바뀌거나 사라지면 예전 세이브가 화면에서 터질 수 있어서,
// 불러오기 전에 걸러낸다. 없어도 되는 필드(예전 세이브에 없던 것)는 검사하지 않는다.

import { companyTypeById, educationById, focusById, industryById, playStyleById, rankById, specialtyById } from '../data'
import { STAT_KEYS } from './rules'
import type { GameState } from './types'

const PHASES = ['year_start', 'event', 'year_end', 'hub', 'retired']

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const known = (id: unknown, table: object) => typeof id === 'string' && Object.hasOwn(table, id)

function validCompany(c: unknown): boolean {
  return isObject(c) && typeof c.name === 'string' && known(c.type, companyTypeById) && known(c.industry, industryById)
}

function validStats(s: unknown): boolean {
  return isObject(s) && STAT_KEYS.every((key) => isNumber(s[key]))
}

export function isLoadableSave(value: unknown): value is GameState {
  if (!isObject(value) || value.version !== 1) return false
  const g = value

  if (!PHASES.includes(g.phase as string)) return false
  if (![g.seed, g.rngState, g.careerYear, g.calendarYear, g.age, g.stamina, g.salary, g.assets].every(isNumber)) return false
  if (!validStats(g.stats) || !validCompany(g.company)) return false
  if (!known(g.rank, rankById) || !known(g.bestRank, rankById)) return false
  if (g.focus !== null && !known(g.focus, focusById)) return false

  const p = g.profile
  if (!isObject(p) || typeof p.name !== 'string' || typeof p.emoji !== 'string') return false
  if (!known(p.education, educationById) || !known(p.specialty, specialtyById) || !known(p.playStyle, playStyleById)) return false

  if (!isObject(g.counters) || !isObject(g.yearStart) || !validStats(g.yearStart.stats)) return false
  for (const key of ['pendingEvents', 'yearEvents', 'offers', 'flags', 'achievements', 'seenEvents', 'history'] as const) {
    if (!Array.isArray(g[key])) return false
  }

  for (const record of g.history as unknown[]) {
    if (!isObject(record) || !validCompany(record.company) || !known(record.rank, rankById)) return false
    if (!validStats(record.statsBefore) || !validStats(record.statsAfter)) return false
    if (!Array.isArray(record.events) || !Array.isArray(record.triggers) || !Array.isArray(record.feed)) return false
  }
  for (const offer of [...(g.offers as unknown[]), ...(Array.isArray(g.postings) ? g.postings : [])]) {
    if (!isObject(offer) || !validCompany(offer.company) || !known(offer.rank, rankById) || !isNumber(offer.salary)) return false
  }

  if (g.phase === 'retired' && !isObject(g.retirement)) return false
  if (g.phase === 'year_end' && (g.history as unknown[]).length === 0) return false
  return true
}
