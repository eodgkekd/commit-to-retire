// 공통 UI 조각. 모바일 우선: 폭 최대 28rem, 하단 고정 버튼.

import type { ReactNode } from 'react'
import { achievementById, BURNOUTS_TO_RETIRE, companyTypeById, industryById, statLabels } from '../data'
import { formatSalary, rankDisplay, type Effects, type GameState, type StatKey, type Stats } from '../engine'

export function Screen({
  children,
  footer,
}: {
  children: ReactNode
  /** 화면 아래에 고정되는 버튼 영역 */
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:shadow-sm">
      <main className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-6">{children}</main>
      {footer && (
        <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:rounded-b-3xl">
          {footer}
        </div>
      )}
    </div>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  const styles = {
    primary: 'bg-blue-500 text-white active:bg-blue-600 disabled:bg-blue-200',
    secondary: 'bg-gray-100 text-gray-800 active:bg-gray-200 disabled:text-gray-400',
    danger: 'bg-white text-red-500 ring-1 ring-red-200 active:bg-red-50',
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl py-4 text-base font-semibold transition ${styles}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-gray-50 p-4 ${className}`}>{children}</section>
}

/** 선택형 카드 (학력, 집중, 선택지 등) */
export function Choice({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl p-4 text-left transition ${
        selected
          ? 'bg-blue-50 ring-2 ring-blue-500'
          : disabled
            ? 'bg-gray-50 opacity-50'
            : 'bg-gray-50 active:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

export function Title({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      {eyebrow && <p className="text-sm text-gray-500">{eyebrow}</p>}
      <h1 className="text-2xl font-bold leading-snug text-gray-900">{children}</h1>
    </header>
  )
}

export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-6 bg-blue-500' : 'w-3 bg-gray-200'}`} />
      ))}
    </div>
  )
}

const STAT_ORDER: StatKey[] = ['coding', 'design', 'communication', 'domain', 'reputation']

export function StatBars({ stats, before }: { stats: Stats; before?: Stats }) {
  return (
    <div className="flex flex-col gap-2">
      {STAT_ORDER.map((key) => {
        const diff = before ? stats[key] - before[key] : 0
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 text-gray-500">{statLabels[key]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${stats[key]}%` }} />
            </div>
            <span className="w-8 text-right font-semibold tabular-nums">{stats[key]}</span>
            {before && (
              <span className={`w-9 text-right text-xs tabular-nums ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                {diff > 0 ? `+${diff}` : diff < 0 ? diff : '-'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function StaminaBar({ value }: { value: number }) {
  const color = value >= 60 ? 'bg-emerald-500' : value >= 30 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-12 shrink-0 text-gray-500">체력</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-semibold tabular-nums">{value}</span>
    </div>
  )
}

/** 게임 중 상단 프로필 카드 */
export function StatusHeader({ game }: { game: GameState }) {
  const company = companyTypeById[game.company.type]
  const industry = industryById[game.company.industry]
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-3xl">{game.profile.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{game.profile.name}</p>
          <p className="truncate text-sm font-medium text-gray-600">{rankDisplay(game.rank, game.careerYear, Boolean(game.startup))}</p>
          {game.unemployed ? (
            <p className="truncate text-sm font-medium text-red-500">🎒 실직 중 · 전 직장 {game.company.name}</p>
          ) : (
            <p className="truncate text-sm text-gray-500">
              {company.emoji} {game.company.name} · {industry.label}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {game.calendarYear}년 · {game.age}세
          </p>
          <p className="font-semibold tabular-nums">{formatSalary(game.salary)}</p>
        </div>
      </div>
      <StaminaBar value={game.stamina} />
      {game.counters.burnouts > 0 && (
        <p className="text-xs font-medium text-red-500">
          🫠 번아웃 {game.counters.burnouts}/{BURNOUTS_TO_RETIRE} · {BURNOUTS_TO_RETIRE}번이면 은퇴해요
        </p>
      )}
    </Card>
  )
}

type Tone = 'gray' | 'blue' | 'red' | 'green' | 'amber'

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)

/** 선택 결과로 실제 바뀐 수치를 칩으로 보여준다. 확률은 보여주지 않는다 */
export function EffectChips({ effects }: { effects: Effects }) {
  const chips: { text: string; tone: Tone }[] = []
  const add = (text: string, good: boolean) => chips.push({ text, tone: good ? 'green' : 'red' })

  if (effects.stamina) add(`체력 ${signed(effects.stamina)}`, effects.stamina > 0)
  for (const key of STAT_ORDER) {
    const delta = effects.stats?.[key]
    if (delta) add(`${statLabels[key]} ${signed(delta)}`, delta > 0)
  }
  if (effects.gradeBonus) add(`고과 점수 ${signed(effects.gradeBonus)}`, effects.gradeBonus > 0)
  if (effects.salaryPct) add(`연봉 ${signed(Math.round(effects.salaryPct * 100))}%`, effects.salaryPct > 0)
  if (effects.assets) add(`자산 ${effects.assets > 0 ? '+' : '−'}${formatSalary(Math.abs(effects.assets))}`, effects.assets > 0)
  if (effects.offerBonus) chips.push({ text: '헤드헌터 연락 ↑', tone: 'blue' })
  if (effects.jobLoss) chips.push({ text: '회사를 떠나요', tone: 'red' })
  const achievement = effects.achievement ? achievementById[effects.achievement] : undefined
  if (achievement) chips.push({ text: `🏆 ${achievement.title}`, tone: 'amber' })

  if (chips.length === 0) return <p className="text-sm text-gray-400">달라진 건 없어요</p>
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {chips.map((c) => (
        <Badge key={c.text} tone={c.tone}>
          {c.text}
        </Badge>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'blue' | 'red' | 'green' | 'amber' }) {
  const styles = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>{children}</span>
}
