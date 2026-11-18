import { achievementById, companyTypeById, educationById, industryById, rankById, statLabels } from '../data'
import type { EndingResult } from './career'

const PREFIX = '#result='
const MAX_LENGTH = 30000
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
const known = (value: unknown, map: object): value is string => typeof value === 'string' && Object.hasOwn(map, value)

export function validResult(value: unknown): value is EndingResult {
  if (!object(value)) return false
  const { profile, retirement, stats, career, achievements } = value
  if (!object(profile) || !text(profile.name, 100) || !text(profile.emoji, 32) || !known(profile.education, educationById)) return false
  if (!object(retirement) || !['age', 'voluntary', 'burnout', 'startup_quit'].includes(String(retirement.reason)) ||
    !['S', 'A', 'B', 'C', 'D'].includes(String(retirement.fameGrade)) || !text(retirement.title, 100) || !number(retirement.fameScore, 0, 10000)) return false
  if (!known(value.bestRank, rankById) || !number(value.salary, 0, 1e9) || !number(value.assets, -1e9, 1e12) ||
    !number(value.jobChanges, 0, 100) || !number(value.years, 0, 100)) return false
  if (!object(stats) || !Object.keys(statLabels).every((key) => number(stats[key], 0, 100))) return false
  if (!Array.isArray(achievements) || achievements.length > 100 || !achievements.every((id) => known(id, achievementById))) return false
  if (!Array.isArray(career) || career.length > 100) return false
  let lastYear = 0
  for (const period of career) {
    if (!object(period) || !number(period.start, 1900, 3000) || !number(period.end, period.start, 3000) ||
      !Number.isInteger(period.start) || !Number.isInteger(period.end) || period.start <= lastYear || typeof period.gap !== 'boolean' ||
      !known(period.firstRank, rankById) || !known(period.lastRank, rankById) || !object(period.company) ||
      !text(period.company.name, 150) || !known(period.company.type, companyTypeById) || !known(period.company.industry, industryById)) return false
    lastYear = period.end
  }
  return true
}

/** 결과만 URL fragment에 담는다. 서버나 받는 사람의 저장 데이터로 전송하지 않는다. */
export function resultUrl(result: EndingResult, baseUrl: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, result }))
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  if (encoded.length > MAX_LENGTH) throw new Error('공유할 결과가 너무 길어요')
  const url = new URL(baseUrl)
  url.search = ''
  url.hash = `${PREFIX}${encoded}`
  return url.toString()
}

export const SHARE_ID = /^[A-Za-z0-9_-]{16}$/
export type SharedResult = { status: 'none' } | { status: 'invalid' } | { status: 'loading'; id: string } |
  { status: 'unavailable' } | { status: 'valid'; result: EndingResult }

export async function createShortResultUrl(result: EndingResult, baseUrl: string): Promise<string> {
  const response = await fetch('/api/results', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 1, result }), signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(response.status === 429 ? '잠시 후 다시 공유해 주세요.' : '링크를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  const data: unknown = await response.json()
  if (!object(data) || typeof data.id !== 'string' || !SHARE_ID.test(data.id)) throw new Error('공유 서버의 응답을 확인할 수 없어요.')
  const url = new URL(baseUrl)
  url.search = ''
  url.hash = `s=${data.id}`
  return url.toString()
}

export async function loadShortResult(id: string, signal: AbortSignal): Promise<SharedResult> {
  try {
    const response = await fetch(`/api/results/${id}`, { signal, cache: 'no-store' })
    if (!response.ok) return { status: 'unavailable' }
    const data: unknown = await response.json()
    if (!object(data) || data.version !== 1 || !validResult(data.result)) return { status: 'invalid' }
    return { status: 'valid', result: data.result }
  } catch {
    return { status: 'unavailable' }
  }
}

export function readSharedResult(hash: string): SharedResult {
  if (hash.startsWith('#s=')) {
    const id = hash.slice(3)
    return SHARE_ID.test(id) ? { status: 'loading', id } : { status: 'invalid' }
  }
  if (!hash.startsWith(PREFIX)) return { status: 'none' }
  try {
    const encoded = hash.slice(PREFIX.length)
    if (!encoded || encoded.length > MAX_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) return { status: 'invalid' }
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!object(payload) || payload.version !== 1 || !validResult(payload.result)) return { status: 'invalid' }
    return { status: 'valid', result: payload.result }
  } catch {
    return { status: 'invalid' }
  }
}
