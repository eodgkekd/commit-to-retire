// 엔딩 화면의 커리어 그래프: 연봉 변화(승진·이직 표시)와 능력치 변화. 손가락/마우스를 올리면 그해 기록을 보여준다.

import { useState, type PointerEvent, type ReactNode } from 'react'
import { rankById, statLabels } from '../data'
import type { TimelinePoint } from '../engine/career'
import { formatSalary } from '../engine'

const W = 320
const H = 150
const PAD = { left: 34, right: 10, top: 10, bottom: 22 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** 능력치 선 색 (검증한 범주형 팔레트 순서 그대로) */
const STAT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
const STAT_KEYS = ['coding', 'design', 'communication', 'domain', 'reputation'] as const
const SALARY_COLOR = '#2a78d6'
const GRID = '#e5e7eb'
const MUTED = '#6b7280'

function xAt(i: number, n: number) {
  return PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W)
}

/** 보기 좋은 눈금 간격 */
function niceStep(max: number, ticks: number) {
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!
}

/** 가로 위치로 가장 가까운 해를 찾는 공통 hover 처리 */
function useHover(n: number) {
  const [index, setIndex] = useState<number | null>(null)
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setIndex(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))))
  }
  return { index, onMove, onLeave: () => setIndex(null) }
}

function YearAxis({ timeline }: { timeline: TimelinePoint[] }) {
  const n = timeline.length
  const every = Math.max(1, Math.ceil(n / 5))
  return (
    <>
      {timeline.map((p, i) =>
        i % every === 0 || i === n - 1 ? (
          <text key={p.year} x={xAt(i, n)} y={H - 6} fontSize="10" fill={MUTED} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {p.year}
          </text>
        ) : null,
      )}
    </>
  )
}

function Crosshair({ x }: { x: number }) {
  return <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" />
}

function Tooltip({ children }: { children: ReactNode }) {
  return <div className="mt-2 min-h-[2.75rem] rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-gray-700">{children}</div>
}

export function SalaryChart({ timeline }: { timeline: TimelinePoint[] }) {
  const n = timeline.length
  const { index, onMove, onLeave } = useHover(n)
  const max = Math.max(...timeline.map((p) => p.salary), 1)
  const step = niceStep(max, 3)
  const top = Math.ceil(max / step) * step
  const y = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H
  const points = timeline.map((p, i) => `${xAt(i, n)},${y(p.salary)}`).join(' ')
  const area = `${xAt(0, n)},${y(0)} ${points} ${xAt(n - 1, n)},${y(0)}`
  const hovered = index !== null ? timeline[index] : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="연도별 연봉 변화 그래프">
        {Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step).map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.left - 4} y={y(v) + 3} fontSize="10" fill={MUTED} textAnchor="end">
              {v === 0 ? '0' : v >= 10000 ? `${v / 10000}억` : `${(v / 1000).toLocaleString('ko-KR')}천`}
            </text>
          </g>
        ))}
        <polygon points={area} fill={SALARY_COLOR} opacity="0.12" />
        <polyline points={points} fill="none" stroke={SALARY_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* 이직한 해는 속이 빈 점, 승진한 해는 채운 점 */}
        {timeline.map((p, i) =>
          p.moved ? (
            <circle key={`m${p.year}`} cx={xAt(i, n)} cy={y(p.salary)} r="4" fill="#fff" stroke={SALARY_COLOR} strokeWidth="2" />
          ) : p.promoted ? (
            <circle key={`p${p.year}`} cx={xAt(i, n)} cy={y(p.salary)} r="4" fill={SALARY_COLOR} stroke="#fff" strokeWidth="2" />
          ) : null,
        )}
        <YearAxis timeline={timeline} />
        {hovered && index !== null && (
          <>
            <Crosshair x={xAt(index, n)} />
            <circle cx={xAt(index, n)} cy={y(hovered.salary)} r="4.5" fill={SALARY_COLOR} stroke="#fff" strokeWidth="2" />
          </>
        )}
        <rect x={PAD.left} y={0} width={PLOT_W} height={H} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave} style={{ touchAction: 'pan-y' }} />
      </svg>
      <div className="mt-1 flex gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SALARY_COLOR }} /> 승진
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: SALARY_COLOR }} /> 회사 옮김
        </span>
      </div>
      <Tooltip>
        {hovered ? (
          <>
            <span className="font-semibold text-gray-900">
              {hovered.year}년 · {hovered.age}세
            </span>{' '}
            · {hovered.gap ? '취업 준비' : rankById[hovered.rank].label}
            <br />
            연봉 <span className="font-semibold text-gray-900 tabular-nums">{formatSalary(hovered.salary)}</span>
            {hovered.promoted ? ' · 🎉 승진' : ''}
            {hovered.moved ? ' · 💼 회사 옮김' : ''}
          </>
        ) : (
          <span className="text-gray-400">그래프를 누르거나 손가락으로 훑으면 그해 기록이 보여요.</span>
        )}
      </Tooltip>
    </div>
  )
}

export function StatsChart({ timeline }: { timeline: TimelinePoint[] }) {
  const n = timeline.length
  const { index, onMove, onLeave } = useHover(n)
  const y = (v: number) => PAD.top + PLOT_H - (v / 100) * PLOT_H
  const hovered = index !== null ? timeline[index] : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="연도별 능력치 변화 그래프">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.left - 4} y={y(v) + 3} fontSize="10" fill={MUTED} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {STAT_KEYS.map((key, k) => (
          <polyline
            key={key}
            points={timeline.map((p, i) => `${xAt(i, n)},${y(p.stats[k])}`).join(' ')}
            fill="none"
            stroke={STAT_COLORS[k]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <YearAxis timeline={timeline} />
        {hovered && index !== null && (
          <>
            <Crosshair x={xAt(index, n)} />
            {STAT_KEYS.map((key, k) => (
              <circle key={key} cx={xAt(index, n)} cy={y(hovered.stats[k])} r="4" fill={STAT_COLORS[k]} stroke="#fff" strokeWidth="2" />
            ))}
          </>
        )}
        <rect x={PAD.left} y={0} width={PLOT_W} height={H} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave} style={{ touchAction: 'pan-y' }} />
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
        {STAT_KEYS.map((key, k) => (
          <span key={key} className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded" style={{ background: STAT_COLORS[k] }} /> {statLabels[key]}
          </span>
        ))}
      </div>
      <Tooltip>
        {hovered ? (
          <>
            <span className="font-semibold text-gray-900">
              {hovered.year}년 · {hovered.age}세
            </span>
            <br />
            {STAT_KEYS.map((key, k) => (
              <span key={key} className="mr-2 inline-flex items-center gap-1 tabular-nums">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: STAT_COLORS[k] }} />
                {statLabels[key]} <span className="font-semibold text-gray-900">{hovered.stats[k]}</span>
              </span>
            ))}
          </>
        ) : (
          <span className="text-gray-400">그래프를 누르면 그해 능력치가 보여요.</span>
        )}
      </Tooltip>
    </div>
  )
}
