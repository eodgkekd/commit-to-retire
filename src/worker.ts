import { SHARE_ID, validResult } from './engine/share'

interface Env {
  SHARED_RESULTS: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> }
  SHARE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> }
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const MAX_BYTES = 24000
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    try {
      if (url.pathname === '/api/results' && request.method === 'POST') {
        const origin = request.headers.get('Origin')
        if (origin && origin !== url.origin) return json({ error: '다른 사이트에서는 저장할 수 없어요.' }, 403)
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON 형식이 필요해요.' }, 415)
        if (!(await env.SHARE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'local' })).success) {
          return json({ error: '잠시 후 다시 시도해 주세요.' }, 429)
        }
        // 헤더를 신뢰하지 않고 실제 요청 바이트 수를 제한한다.
        const reader = request.body?.getReader()
        if (!reader) return json({ error: '결과가 없어요.' }, 400)
        const chunks: Uint8Array[] = []
        let size = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_BYTES) {
            await reader.cancel()
            return json({ error: '결과가 너무 커요.' }, 413)
          }
          chunks.push(value)
        }
        const bytes = new Uint8Array(size)
        let offset = 0
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
        let data: unknown
        try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) } catch { return json({ error: '잘못된 결과예요.' }, 400) }
        if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('result' in data) || !validResult(data.result)) {
          return json({ error: '잘못된 결과예요.' }, 400)
        }
        const id = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))).replaceAll('+', '-').replaceAll('/', '_')
        await env.SHARED_RESULTS.put(id, JSON.stringify({ version: 1, result: data.result }))
        return json({ id }, 201)
      }
      const match = url.pathname.match(/^\/api\/results\/([^/]+)$/)
      if (match && request.method === 'GET' && SHARE_ID.test(match[1])) {
        const result = await env.SHARED_RESULTS.get(match[1])
        if (!result) return json({ error: '결과를 찾지 못했어요. 공유 직후라면 잠시 후 다시 시도해 주세요.' }, 404)
        return new Response(result, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
      }
      return json({ error: '없는 API예요.' }, 404)
    } catch {
      return json({ error: '공유 저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
    }
  },
}
