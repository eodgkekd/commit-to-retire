// 엔딩 결과를 인스타 스토리 비율(1080×1920) 이미지 카드로 그린다

import { achievementById, companyTypeById, rankById } from '../data'
import type { EndingResult, TimelinePoint } from '../engine/career'
import { formatSalary, type FameGrade } from '../engine'

const W = 1080
const H = 1920
const FONT = '"Pretendard Variable", "Pretendard", system-ui, -apple-system, "Segoe UI", sans-serif'

/** 화면의 등급 배지(GRADE_STYLE)와 같은 색 */
const GRADE_COLORS: Record<FameGrade, [string, string]> = {
  S: ['#fcd34d', '#f59e0b'],
  A: ['#60a5fa', '#2563eb'],
  B: ['#94a3b8', '#475569'],
  C: ['#d1d5db', '#9ca3af'],
  D: ['#fdba74', '#f87171'],
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** 폭을 넘으면 말줄임표로 자른다 */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1)
  return out + '…'
}

/** 폭에 맞춰 단어 단위로 줄을 나눈다 (최대 maxLines줄, 넘치면 마지막 줄을 자른다) */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  return [...lines.slice(0, maxLines - 1), fit(ctx, lines.slice(maxLines - 1).join(' '), maxWidth)]
}

export async function drawResultImage(game: EndingResult, reason: string, siteUrl: string): Promise<Blob> {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const r = game.retirement
  const [from, to] = GRADE_COLORS[r.fameGrade]

  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#f8fafc')
  bg.addColorStop(1, '#e2e8f0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#64748b'
  ctx.font = `600 40px ${FONT}`
  ctx.fillText('커밋에서 은퇴까지', W / 2, 130)

  ctx.font = `150px ${FONT}`
  ctx.fillText(game.profile.emoji, W / 2, 290)

  ctx.fillStyle = '#475569'
  ctx.font = `500 38px ${FONT}`
  wrap(ctx, reason, W - 200, 2).forEach((line, i, all) => ctx.fillText(line, W / 2, 440 - (all.length - 1) * 24 + i * 48))

  // 등급 배지
  const badge = ctx.createLinearGradient(W / 2 - 150, 520, W / 2 + 150, 820)
  badge.addColorStop(0, from)
  badge.addColorStop(1, to)
  ctx.fillStyle = badge
  roundRect(ctx, W / 2 - 150, 520, 300, 300, 72)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 200px ${FONT}`
  ctx.fillText(r.fameGrade, W / 2, 680)

  ctx.fillStyle = '#0f172a'
  ctx.font = `800 72px ${FONT}`
  ctx.fillText(fit(ctx, r.title, W - 120), W / 2, 920)
  ctx.fillStyle = '#64748b'
  ctx.font = `500 40px ${FONT}`
  ctx.fillText(`${game.profile.name} · 명성 점수 ${r.fameScore}`, W / 2, 1000)

  // 요약 카드
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 80, 1070, W - 160, 290, 40)
  ctx.fill()
  const rows: [string, string][] = [
    ['최고 직책', rankById[game.bestRank].label],
    ['경력', `${game.years}년 · 이직 ${game.jobChanges}회`],
    ['마지막 연봉', formatSalary(game.salary)],
    ['모은 자산', formatSalary(Math.max(0, game.assets))],
  ]
  rows.forEach(([label, value], i) => {
    const y = 1135 + i * 64
    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'
    ctx.font = `500 38px ${FONT}`
    ctx.fillText(label, 130, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#0f172a'
    ctx.font = `700 38px ${FONT}`
    ctx.fillText(value, W - 130, y)
  })

  // 커리어 경로: 거친 회사 이름 한 줄씩 (공백기 제외). 연봉 그래프가 있으면 2곳, 없으면 4곳까지
  const timeline = game.timeline ?? []
  const hasChart = timeline.length >= 2
  const maxRoute = hasChart ? 2 : 4
  const companies = game.career.filter((p) => !p.gap)
  const route = companies.slice(0, maxRoute).map((p) => `${companyTypeById[p.company.type].emoji} ${p.company.name} · ${p.end - p.start + 1}년`)
  if (companies.length > maxRoute) route.push(`외 ${companies.length - maxRoute}곳`)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#334155'
  ctx.font = `600 36px ${FONT}`
  route.forEach((line, i) => ctx.fillText(fit(ctx, line, W - 160), W / 2, 1420 + i * 52))

  // 연봉 변화 미니 그래프
  if (hasChart) drawSalarySpark(ctx, timeline, 80, 1560, W - 160, 160)

  // 업적: 이모지 줄 + 개수
  const unlocked = game.achievements.map((id) => achievementById[id]).filter(Boolean)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#334155'
  ctx.font = `64px ${FONT}`
  ctx.fillText(unlocked.slice(0, 10).map((a) => a.emoji).join(' ') || '🔒', W / 2, hasChart ? 1775 : 1740)
  ctx.fillStyle = '#64748b'
  ctx.font = `500 36px ${FONT}`
  ctx.fillText(`업적 ${unlocked.length}개 달성`, W / 2, hasChart ? 1838 : 1820)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `500 32px ${FONT}`
  ctx.fillText(siteUrl.replace(/^https?:\/\//, ''), W / 2, 1886)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요'))), 'image/png'))
}


/** 결과 카드의 연봉 변화 그래프 (흰 카드 안에 선 하나, 승진한 해는 점) */
function drawSalarySpark(ctx: CanvasRenderingContext2D, timeline: TimelinePoint[], x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, x, y, w, h, 32)
  ctx.fill()
  ctx.textAlign = 'left'
  ctx.fillStyle = '#64748b'
  ctx.font = `500 28px ${FONT}`
  ctx.fillText('연봉 변화', x + 36, y + 40)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#0f172a'
  ctx.font = `700 28px ${FONT}`
  const first = timeline[0].salary
  const last = timeline[timeline.length - 1].salary
  ctx.fillText(`${formatSalary(first)} → ${formatSalary(last)}`, x + w - 36, y + 40)

  const left = x + 36
  const right = x + w - 36
  const top = y + 74
  const bottom = y + h - 24
  // 작은 그래프라 0이 아니라 최저 연봉부터 그려서 오르내림이 보이게 한다
  const max = Math.max(...timeline.map((p) => p.salary), 1)
  const min = Math.min(...timeline.map((p) => p.salary))
  const span = Math.max(1, max - min)
  const px = (i: number) => left + (i / (timeline.length - 1)) * (right - left)
  const py = (v: number) => bottom - ((v - min) / span) * (bottom - top)
  ctx.strokeStyle = '#2a78d6'
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  timeline.forEach((p, i) => (i === 0 ? ctx.moveTo(px(i), py(p.salary)) : ctx.lineTo(px(i), py(p.salary))))
  ctx.stroke()
  ctx.fillStyle = '#2a78d6'
  timeline.forEach((p, i) => {
    if (!p.promoted) return
    ctx.beginPath()
    ctx.arc(px(i), py(p.salary), 8, 0, Math.PI * 2)
    ctx.fill()
  })
}
