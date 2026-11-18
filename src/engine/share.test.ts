import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomGame } from './bot'
import { endingResult } from './career'
import { evaluateRetirement } from './ending'
import { createShortResultUrl, loadShortResult, readSharedResult, resultUrl } from './share'
import worker from '../worker'
import { finishYear, startYear } from './year'

function result() {
  const state = startYear(randomGame(42), 'study')
  state.pendingEvents = []
  const game = finishYear(state)
  game.profile.name = '김개발 👩🏽‍💻'
  game.retirement = evaluateRetirement(game, 'voluntary')
  return endingResult(game)
}

describe('결과 공유 링크', () => {
  it('다른 브라우저에서도 링크만으로 모든 표시 항목을 복원한다', () => {
    const original = result()
    original.career.push({ ...original.career[0], start: 2030, end: 2031, gap: true })
    const url = resultUrl(original, 'https://example.com/game/?unrelated=1#old')
    expect(new URL(url).pathname).toBe('/game/')
    expect(new URL(url).search).toBe('')
    expect(readSharedResult(new URL(url).hash)).toEqual({ status: 'valid', result: original })
    expect(original).not.toHaveProperty('seed')
    expect(original).not.toHaveProperty('history')
  })

  it('공유 결과를 다시 공유해도 동일하다', () => {
    const original = result()
    const link = resultUrl(original, 'https://example.com/')
    const decoded = readSharedResult(new URL(link).hash)
    expect(decoded.status).toBe('valid')
    if (decoded.status === 'valid') expect(resultUrl(decoded.result, link)).toBe(link)
  })

  it('빈 경력과 최대 길이의 플레이 이력을 지원한다', () => {
    const original = result()
    const period = original.career[0]
    original.career = []
    expect(readSharedResult(new URL(resultUrl(original, 'https://example.com')).hash).status).toBe('valid')
    original.career = Array.from({ length: 40 }, (_, i) => ({ ...period, start: 2026 + i, end: 2026 + i }))
    expect(readSharedResult(new URL(resultUrl(original, 'https://example.com')).hash).status).toBe('valid')
  })

  it('깨진 링크·알 수 없는 데이터·너무 긴 링크는 오류로 처리한다', () => {
    expect(readSharedResult('')).toEqual({ status: 'none' })
    for (const hash of ['#result=', '#result=invalid!', '#result=' + 'a'.repeat(30001), '#result=' + btoa('{}')]) {
      expect(readSharedResult(hash)).toEqual({ status: 'invalid' })
    }
    for (const patch of [{ bestRank: 'constructor' }, { stats: null }, { salary: -100 }, { career: [{}] }]) {
      const invalid = { ...result(), ...patch }
      const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, result: invalid }))
      const encoded = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
      expect(readSharedResult('#result=' + encoded)).toEqual({ status: 'invalid' })
    }
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('짧은 링크 저장 및 다른 클라이언트 조회', () => {
  it('서버에 저장한 결과를 16자리 ID만으로 다른 클라이언트가 복원한다', async () => {
    const entries = new Map<string, string>()
    const env = {
      SHARED_RESULTS: { get: async (key: string) => entries.get(key) ?? null, put: async (key: string, value: string) => { entries.set(key, value) } },
      SHARE_LIMITER: { limit: async () => ({ success: true }) },
      ASSETS: { fetch: async () => new Response('app') },
    }
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => worker.fetch(new Request(new URL(url, 'https://example.com'), init), env))
    const original = result()
    const url = await createShortResultUrl(original, 'https://example.com/?old=1#result=old')
    expect(url).toMatch(/^https:\/\/example.com\/#s=[A-Za-z0-9_-]{16}$/)
    const state = readSharedResult(new URL(url).hash)
    expect(state.status).toBe('loading')
    if (state.status !== 'loading') throw new Error('짧은 링크 파싱 실패')
    expect(await loadShortResult(state.id, new AbortController().signal)).toEqual({ status: 'valid', result: original })
    expect(entries.size).toBe(1)
  })

  it('저장 실패 시 사용할 수 없는 링크를 반환하지 않는다', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }))
    await expect(createShortResultUrl(result(), 'https://example.com')).rejects.toThrow('저장하지 못했어요')
    vi.stubGlobal('fetch', async () => Response.json({ id: '../invalid' }))
    await expect(createShortResultUrl(result(), 'https://example.com')).rejects.toThrow('응답')
  })

  it('조회 실패는 재시도할 수 있고 기존 긴 링크도 계속 지원한다', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }))
    expect(await loadShortResult('abcdefghijklmnop', new AbortController().signal)).toEqual({ status: 'unavailable' })
    vi.stubGlobal('fetch', async () => Response.json({ version: 1, result: result() }))
    expect((await loadShortResult('abcdefghijklmnop', new AbortController().signal)).status).toBe('valid')
    expect(readSharedResult('#s=bad')).toEqual({ status: 'invalid' })
    expect(readSharedResult(new URL(resultUrl(result(), 'https://example.com')).hash).status).toBe('valid')
  })
})
