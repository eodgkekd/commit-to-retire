import { describe, expect, it } from 'vitest'
import { playToEnd, randomGame } from './bot'
import { isLoadableSave } from './save'
import { chooseEventOption, currentEvent, finishYear, startYear } from './year'

const roundTrip = <T,>(value: T): unknown => JSON.parse(JSON.stringify(value))

describe('저장 데이터 검사', () => {
  it('새 게임과 진행 중인 게임, 끝난 게임을 모두 불러올 수 있다', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const fresh = randomGame(seed)
      expect(isLoadableSave(roundTrip(fresh))).toBe(true)

      let mid = startYear(fresh, 'study')
      expect(isLoadableSave(roundTrip(mid))).toBe(true)
      while (currentEvent(mid)) mid = chooseEventOption(mid, 0).state
      expect(isLoadableSave(roundTrip(finishYear(mid)))).toBe(true)

      expect(isLoadableSave(roundTrip(playToEnd(fresh, 'random', seed)))).toBe(true)
    }
  })

  it('예전 세이브에 없던 선택 필드가 빠져도 불러온다', () => {
    const old = roundTrip(randomGame(1)) as Record<string, unknown>
    for (const key of ['offerBonus', 'postings', 'applicationsLeft', 'eventLastSeen', 'pendingFeedTriggers']) delete old[key]
    expect(isLoadableSave(old)).toBe(true)
  })

  it('없어진 회사 유형·직급이 들어 있으면 거른다', () => {
    const game = randomGame(1)
    expect(isLoadableSave({ ...game, company: { ...game.company, type: 'removed_type' } })).toBe(false)
    expect(isLoadableSave({ ...game, rank: 'removed_rank' })).toBe(false)
    const ended = playToEnd(game, 'random', 1)
    const broken = { ...ended, history: ended.history.map((h, i) => (i === 0 ? { ...h, company: { ...h.company, type: 'removed_type' } } : h)) }
    expect(isLoadableSave(roundTrip(broken))).toBe(false)
  })

  it('형태가 다른 값은 거른다', () => {
    for (const value of [null, undefined, 'text', 42, [], {}, { version: 2 }, { ...randomGame(1), stats: null }, { ...randomGame(1), history: 'x' }]) {
      expect(isLoadableSave(value)).toBe(false)
    }
  })
})
