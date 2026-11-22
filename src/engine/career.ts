import { rankById } from '../data'
import { formatSalary } from './rules'
import type { Company, GameState, RankId, YearRecord } from './types'

export interface CareerPeriod {
  start: number
  end: number
  company: Company
  gap: boolean
  firstRank: RankId
  lastRank: RankId
}

/** 공유에 필요한 결과만 담고 진행 상태나 이벤트 이력은 제외한다. */
export interface EndingResult {
  profile: Pick<GameState['profile'], 'name' | 'emoji' | 'education'>
  retirement: NonNullable<GameState['retirement']>
  bestRank: GameState['bestRank']
  salary: number
  assets: number
  stats: GameState['stats']
  achievements: string[]
  jobChanges: number
  years: number
  career: CareerPeriod[]
  /** 해마다의 연말 기록 (엔딩 그래프용). 예전에 공유된 결과에는 없을 수 있다 */
  timeline?: TimelinePoint[]
}

/** 그래프 한 점: 그해 연말의 연봉·능력치와 일어난 일 */
export interface TimelinePoint {
  year: number
  age: number
  /** 연말 연봉 (만 원) */
  salary: number
  rank: RankId
  /** 코딩·설계·소통·도메인·평판 (정수) */
  stats: [number, number, number, number, number]
  /** 그해 승진했으면 true */
  promoted?: boolean
  /** 그해 회사를 옮겼거나 떠났으면 true (이직·폐업·권고사직·창업) */
  moved?: boolean
  /** 실직 공백기 */
  gap?: boolean
}

export function endingResult(game: GameState): EndingResult {
  if (!game.retirement) throw new Error('아직 은퇴 결과가 없어요')
  return {
    profile: { name: game.profile.name, emoji: game.profile.emoji, education: game.profile.education },
    retirement: { ...game.retirement }, bestRank: game.bestRank,
    salary: game.salary, assets: game.assets, stats: { ...game.stats },
    achievements: [...game.achievements], jobChanges: game.counters.jobChanges,
    years: game.history.length, career: summarizeCareer(game.history),
    timeline: careerTimeline(game.history),
  }
}

const MOVE_TRIGGERS = ['jobChanged', 'companyClosed', 'layoff', 'startupFounded', 'startupFailed', 'startupExit'] as const

export function careerTimeline(history: YearRecord[]): TimelinePoint[] {
  return history.map((r) => {
    const s = r.statsAfter
    return {
      year: r.calendarYear,
      age: r.age,
      salary: r.salaryAfter,
      rank: r.rank,
      stats: [s.coding, s.design, s.communication, s.domain, s.reputation].map((v) => Math.round(v)) as TimelinePoint['stats'],
      ...(r.triggers.includes('promoted') ? { promoted: true } : {}),
      ...(r.triggers.some((t) => (MOVE_TRIGGERS as readonly string[]).includes(t)) ? { moved: true } : {}),
      ...(r.gap ? { gap: true } : {}),
    }
  })
}

/** 연속 재직만 합친다. 공백기와 재입사는 별도 기간으로 남긴다. */
export function summarizeCareer(history: YearRecord[]): CareerPeriod[] {
  const periods: CareerPeriod[] = []
  for (const record of history) {
    const previous = periods.at(-1)
    const gap = !!record.gap
    if (previous && previous.end + 1 === record.calendarYear && previous.gap === gap &&
      (gap || (!record.triggers.includes('jobChanged') && previous.company.name === record.company.name &&
        previous.company.type === record.company.type && previous.company.industry === record.company.industry))) {
      previous.end = record.calendarYear
      previous.lastRank = record.rank
    } else {
      periods.push({ start: record.calendarYear, end: record.calendarYear, company: { ...record.company }, gap,
        firstRank: record.rank, lastRank: record.rank })
    }
  }
  return periods
}

export function careerPeriodLabel(period: CareerPeriod): string {
  return period.start === period.end ? `${period.start}` : `${period.start}~${period.end}`
}

export function endingShareText(game: EndingResult): string {
  const retirement = game.retirement!
  return [
    '커밋에서 은퇴까지',
    `${game.profile.name} · ${retirement.fameGrade}등급 · ${retirement.title}`,
    `최고 직책 ${rankById[game.bestRank].label} · 이직 ${game.jobChanges}회`,
    `모은 자산 ${formatSalary(Math.max(0, game.assets))}`,
    '', '커리어 요약',
    ...game.career.map((p) => `${careerPeriodLabel(p)} ${p.gap ? '취업 준비' : p.company.name}`),
  ].join('\n')
}
