import { describe, expect, it, vi } from 'vitest'
import worker from './worker'
import { randomGame } from './engine/bot'
import { endingResult } from './engine/career'
import { evaluateRetirement } from './engine/ending'

function fixture() {
  const game = randomGame(1)
  game.retirement = evaluateRetirement(game, 'voluntary')
  return { version: 1, result: endingResult(game) }
}
function env() {
  return {
    SHARED_RESULTS: { get: vi.fn(async (_id: string): Promise<string | null> => null), put: vi.fn(async () => {}) },
    SHARE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    ASSETS: { fetch: vi.fn(async () => new Response('app')) },
  }
}
const post = (body: unknown, headers = {}) => new Request('https://example.com/api/results', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
})

describe('공유 Worker API', () => {
  it('잘못된 결과와 큰 요청은 저장하지 않는다', async () => {
    const bindings = env()
    expect((await worker.fetch(post({ version: 1, result: {} }), bindings)).status).toBe(400)
    expect((await worker.fetch(post('a'.repeat(24001)), bindings)).status).toBe(413)
    expect((await worker.fetch(post(fixture(), { 'Content-Type': 'text/plain' }), bindings)).status).toBe(415)
    expect(bindings.SHARED_RESULTS.put).not.toHaveBeenCalled()
  })

  it('다른 출처 요청과 과도한 생성 요청을 차단한다', async () => {
    const bindings = env()
    expect((await worker.fetch(post(fixture(), { Origin: 'https://other.example' }), bindings)).status).toBe(403)
    bindings.SHARE_LIMITER.limit.mockResolvedValue({ success: false })
    expect((await worker.fetch(post(fixture()), bindings)).status).toBe(429)
    expect(bindings.SHARED_RESULTS.put).not.toHaveBeenCalled()
  })

  it('저장소 실패를 성공으로 알리지 않는다', async () => {
    const bindings = env()
    bindings.SHARED_RESULTS.put.mockRejectedValue(new Error('offline'))
    expect((await worker.fetch(post(fixture()), bindings)).status).toBe(503)
  })

  it('없는 ID 조회는 캐시하지 않고 API 외 요청은 정적 앱으로 보낸다', async () => {
    const bindings = env()
    const missing = await worker.fetch(new Request('https://example.com/api/results/abcdefghijklmnop'), bindings)
    expect(missing.status).toBe(404)
    expect(missing.headers.get('Cache-Control')).toBe('no-store')
    expect((await worker.fetch(new Request('https://example.com/api/results/bad'), bindings)).status).toBe(404)
    expect(bindings.SHARED_RESULTS.get).toHaveBeenCalledTimes(1)
    expect(await (await worker.fetch(new Request('https://example.com/'), bindings)).text()).toBe('app')
  })
})
