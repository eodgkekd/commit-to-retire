import { describe, expect, it } from 'vitest'
import { randomGame } from './bot'
import { careerPeriodLabel, endingResult, endingShareText, summarizeCareer } from './career'
import { evaluateRetirement } from './ending'
import { corporateTitle, rankDisplay } from './rules'
import { finishYear, startYear } from './year'
import type { FocusId, YearRecord } from './types'

function completeYear(focus: FocusId = 'study') {
  const state = startYear(randomGame(42), focus)
  state.pendingEvents = []
  return finishYear(state)
}

describe('커리어 요약', () => {
  const base = completeYear().history[0]
  const record = (year: number, changes: Partial<YearRecord> = {}): YearRecord => ({
    ...base, calendarYear: year, triggers: [], ...changes,
  })

  it('승진해도 연속 재직은 합치고 최초·마지막 직책을 남긴다', () => {
    const result = summarizeCareer([record(2022, { rank: 'newbie' }), record(2023, { rank: 'junior' })])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ start: 2022, end: 2023, firstRank: 'newbie', lastRank: 'junior' })
    expect(careerPeriodLabel(result[0])).toBe('2022~2023')
  })

  it('공백기와 재입사는 별도 기간으로 묶는다', () => {
    const result = summarizeCareer([record(2022), record(2023, { gap: true }), record(2024, { gap: true }), record(2025)])
    expect(result.map((p) => [p.start, p.end, p.gap])).toEqual([[2022, 2022, false], [2023, 2024, true], [2025, 2025, false]])
  })

  it('회사 변경, 이직 기록, 불연속 연도는 합치지 않는다', () => {
    expect(summarizeCareer([record(2022), record(2023, { company: { ...base.company, name: '다른 회사' } })])).toHaveLength(2)
    expect(summarizeCareer([record(2022), record(2023, { triggers: ['jobChanged'] })])).toHaveLength(2)
    expect(summarizeCareer([record(2022), record(2024)])).toHaveLength(2)
    expect(summarizeCareer([])).toEqual([])
  })

  it('공유 문구에 결과와 기간별 커리어를 포함한다', () => {
    const game = completeYear()
    game.history = [record(2022), record(2023)]
    game.retirement = evaluateRetirement(game, 'voluntary')
    const text = endingShareText(endingResult(game))
    expect(text).toContain(game.retirement.title)
    expect(text).toContain(`2022~2023 ${base.company.name}`)
    expect(text).toContain(game.profile.name)
  })
})

describe('집중 훈련', () => {
  it.each(['coding', 'design', 'communication'] as const)('%s를 선택하면 같은 조건의 기술 공부보다 해당 능력치가 더 오른다', (focus) => {
    const training = completeYear(focus)
    const study = completeYear('study')
    expect(training.stats[focus]).toBeGreaterThan(study.stats[focus])
    expect(training.history[0].focus).toBe(focus)
    expect(training.stamina).toBe(study.stamina)
  })
})

describe('회사 직급', () => {
  it('연차에 따라 사원 → 대리 → 과장 → 차장 → 부장으로 오른다', () => {
    expect(corporateTitle('junior', 1)).toBe('사원')
    expect(corporateTitle('junior', 4)).toBe('대리')
    expect(corporateTitle('mid', 8)).toBe('과장')
    expect(corporateTitle('senior', 12)).toBe('차장')
    expect(corporateTitle('senior', 16)).toBe('부장')
  })

  it('직책이 빨리 오르면 직급도 따라 올라가고, 임원은 임원 직급이다', () => {
    expect(corporateTitle('senior', 5)).toBe('과장')
    expect(corporateTitle('lead', 6)).toBe('차장')
    expect(corporateTitle('director', 10)).toBe('이사')
    expect(corporateTitle('cto', 25)).toBe('전무')
  })

  it('화면 표시는 "직급 · 직책", 창업 중이면 대표', () => {
    expect(rankDisplay('lead', 13)).toBe('차장 · 테크리드')
    expect(rankDisplay('lead', 13, true)).toBe('대표')
  })
})
