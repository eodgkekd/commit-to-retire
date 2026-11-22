// 밸런스 시뮬레이션: 봇으로 수백 판을 돌려 분포를 출력한다.
// 실행: npm run balance

import { expect, it } from 'vitest'
import { companyTypes, educations, focuses, rankById } from '../data'
import { BOT_SAFE_STAMINA, cyclePolicy, fixedPolicy, playToEnd, promotionMindedPolicy, randomGame, type BotStrategy } from './bot'
import { formatSalary } from './rules'
import type { GameState } from './types'

const GAMES = 600

function pct(n: number, total: number) {
  return `${((n / total) * 100).toFixed(1)}%`
}

function countBy<T>(list: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of list) out[key(x)] = (out[key(x)] ?? 0) + 1
  return out
}

function avg(list: number[]) {
  return list.reduce((a, b) => a + b, 0) / Math.max(1, list.length)
}

function report(label: string, games: GameState[]) {
  const n = games.length
  const lines: string[] = [`\n===== ${label} (${n}판) =====`]

  const best = countBy(games, (g) => rankById[g.bestRank].label)
  lines.push('최고 직책: ' + Object.entries(best).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, n)}`).join(' / '))

  const fame = countBy(games, (g) => g.retirement!.fameGrade)
  lines.push('엔딩 등급: ' + ['S', 'A', 'B', 'C', 'D'].map((k) => `${k} ${pct(fame[k] ?? 0, n)}`).join(' / '))

  const reason = countBy(games, (g) => g.retirement!.reason)
  lines.push('은퇴 사유: ' + Object.entries(reason).map(([k, v]) => `${k} ${pct(v, n)}`).join(' / '))

  lines.push(`평균 플레이 턴: ${avg(games.map((g) => g.history.length)).toFixed(1)}년`)
  lines.push(`평균 최종 연봉: ${formatSalary(Math.round(avg(games.map((g) => g.salary))))}`)
  lines.push(`평균 자산: ${formatSalary(Math.round(avg(games.map((g) => g.assets))))}`)
  lines.push(`평균 번아웃: ${avg(games.map((g) => g.counters.burnouts)).toFixed(2)}회, 평균 이직: ${avg(games.map((g) => g.counters.jobChanges)).toFixed(1)}회`)
  lines.push(`평균 명성 점수: ${avg(games.map((g) => g.retirement!.fameScore)).toFixed(0)}`)
  const founded = games.filter((g) => g.achievements.includes('founder')).length
  if (founded > 0) {
    const exited = games.filter((g) => g.achievements.includes('founder_exit')).length
    lines.push(`창업: ${pct(founded, n)}, 매각까지 간 판 ${pct(exited, n)}, 폐업해 본 판 ${pct(games.filter((g) => g.achievements.includes('founder_failed')).length, n)}`)
  }

  // 시니어 도달 연차
  const seniorYears = games
    .map((g) => g.history.findIndex((h) => ['senior', 'lead', 'em', 'staff', 'director', 'principal', 'vp', 'fellow', 'cto'].includes(h.rank)))
    .filter((i) => i >= 0)
    .map((i) => i + 1)
  lines.push(`시니어 도달: ${pct(seniorYears.length, n)}, 평균 ${avg(seniorYears).toFixed(1)}년차`)

  const ach = countBy(games.flatMap((g) => g.achievements), (a) => a)
  lines.push('업적 달성률: ' + Object.entries(ach).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, n)}`).join(' / '))

  const grades = countBy(games.flatMap((g) => g.history), (h) => h.grade)
  const totalYears = games.reduce((a, g) => a + g.history.length, 0)
  lines.push('고과 분포: ' + ['S', 'A', 'B', 'C', 'D'].map((k) => `${k} ${pct(grades[k] ?? 0, totalYears)}`).join(' / '))

  console.log(lines.join('\n'))
}

function breakdown(games: GameState[]) {
  const lines = ['\n===== 학력별 평균 명성 / 첫 회사별 평균 명성 =====']
  for (const e of educations) {
    const g = games.filter((x) => x.profile.education === e.id)
    lines.push(`${e.label}: ${avg(g.map((x) => x.retirement!.fameScore)).toFixed(0)} (${g.length}판)`)
  }
  lines.push('')
  for (const c of companyTypes) {
    const g = games.filter((x) => x.history[0].company.type === c.id)
    if (g.length) lines.push(`${c.label}: ${avg(g.map((x) => x.retirement!.fameScore)).toFixed(0)} (${g.length}판)`)
  }
  console.log(lines.join('\n'))
}

/** 한 전략의 결과 요약 한 줄 + 수치 */
function summarize(label: string, games: GameState[]) {
  const n = games.length
  const share = (grade: string) => games.filter((g) => g.retirement!.fameGrade === grade).length / n
  const best = countBy(games, (g) => rankById[g.bestRank].label)
  const top = Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} ${pct(v, n)}`).join(', ')
  const fame = avg(games.map((g) => g.retirement!.fameScore))
  const burnout = games.filter((g) => g.retirement!.reason === 'burnout').length
  const reputation = avg(games.map((g) => g.stats.reputation))
  const line =
    `${label.padEnd(22)} 명성 ${fame.toFixed(0).padStart(3)} | ` +
    ['S', 'A', 'B', 'C', 'D'].map((k) => `${k} ${(share(k) * 100).toFixed(0).padStart(2)}%`).join(' ') +
    ` | 평판 ${reputation.toFixed(0)} | 번아웃 은퇴 ${pct(burnout, n)} | ${top}`
  return { label, line, fame, s: share('S'), d: share('D') }
}

const FIXED_GAMES = 400
/** 매년 같은 집중만 고르는 전략이 이 비율보다 자주 S를 받으면 필승법이 생긴 것이다 */
const MAX_FIXED_S = 0.2

const run = (strategy: BotStrategy, n: number) => Array.from({ length: n }, (_, i) => playToEnd(randomGame(i + 1), strategy, i + 1))

it('밸런스 리포트', () => {
  const all: GameState[] = []
  for (const strategy of ['random', 'grinder', 'hopper', 'founder'] as const) {
    const games = run(strategy, GAMES)
    report(strategy, games)
    all.push(...games)
  }
  breakdown(all)
}, 900_000)

it('한 가지 집중만 고르는 전략은 필승법이 아니다', () => {
  const tracks = ['ic', 'manager'] as const
  const fixed = focuses.flatMap((f) =>
    // 쉬어가기·이직 준비만 하면 리드까지 못 가므로 트랙을 나눠 볼 필요가 없다
    (f.id === 'rest' || f.id === 'job_hunt' ? (['ic'] as const) : tracks).map((track) =>
      summarize(`매년 ${f.label} (${track})`, run(fixedPolicy(f.id, track), FIXED_GAMES)),
    ),
  )
  const mixed = tracks.flatMap((track) => [
    summarize(`공부·올인·네트워킹 순환 (${track})`, run(cyclePolicy(['study', 'all_in', 'networking'], track), FIXED_GAMES)),
    summarize(`승진 조건 따라가기 (${track})`, run(promotionMindedPolicy(track), FIXED_GAMES)),
  ])

  console.log(
    [
      '',
      `===== 고정 전략 (${FIXED_GAMES}판씩, 예상 체력이 ${BOT_SAFE_STAMINA} 아래로 떨어질 해에는 쉼) =====`,
      ...fixed.map((r) => r.line),
      '',
      '----- 섞어 쓰는 전략 (참고) -----',
      ...mixed.map((r) => r.line),
    ].join('\n'),
  )

  // 사이드 프로젝트만 하다 창업하는 것도 한 버튼 전략이다
  const founder = summarize('사이드 → 창업 반복', run('founder', FIXED_GAMES))
  fixed.push(founder)
  console.log(founder.line)

  for (const r of fixed) expect(r.s, `${r.label}의 S 비율`).toBeLessThanOrEqual(MAX_FIXED_S)
  // 조건을 보고 섞어 쓰는 쪽이 어떤 한 버튼 전략보다 평균 명성이 높아야 한다
  const bestFixed = Math.max(...fixed.map((r) => r.fame))
  const bestMixed = Math.max(...mixed.map((r) => r.fame))
  expect(bestMixed, `섞어 쓰는 전략 ${bestMixed.toFixed(0)} vs 고정 전략 ${bestFixed.toFixed(0)}`).toBeGreaterThan(bestFixed)
}, 1_800_000)
