import { describe, expect, it } from 'vitest'
import { FAME_REPUTATION_WEIGHT, focuses, NO_PROMOTION_FOCUS, rankById } from '../data'
import { cyclePolicy, fixedPolicy, playToEnd, promotionMindedPolicy, randomGame } from './bot'
import { evaluateRetirement } from './ending'
import { nextPromotion } from './rules'
import { createGame } from './setup'
import type { FocusId, GameState, Profile } from './types'
import { chooseEventOption, finishYear, staminaChange, startYear } from './year'

const profile: Profile = {
  name: '테스트',
  emoji: '🤓',
  startAge: 26,
  education: 'local_cs',
  specialty: 'backend',
  playStyle: 'builder',
  focusStats: ['coding', 'design'],
}

const game = (seed = 1) => createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed })

function playYear(state: GameState, focus: FocusId): GameState {
  let s = startYear(state, focus)
  while (s.pendingEvents.length > 0) s = chooseEventOption(s, 0).state
  return finishYear(s)
}

describe('승진 심사', () => {
  /** 주니어 승진 조건(코딩 40, 1년차)을 넉넉히 채운 신입 */
  const ready = (seed: number): GameState => ({ ...game(seed), stats: { coding: 90, design: 90, communication: 90, domain: 90, reputation: 50 } })

  it('쉬어가기·이직 준비를 고른 해에는 조건을 채워도 승진하지 않는다', () => {
    for (const focus of NO_PROMOTION_FOCUS) {
      for (let seed = 1; seed <= 40; seed++) {
        const s = playYear(ready(seed), focus)
        expect(s.rank, `${focus} seed ${seed}`).toBe('newbie')
        expect(s.history[0].triggers).not.toContain('promoted')
      }
    }
  })

  it('일한 해에는 같은 조건에서 승진한다', () => {
    const promoted = Array.from({ length: 40 }, (_, i) => playYear(ready(i + 1), 'all_in')).filter((s) => s.rank === 'junior')
    expect(promoted.length).toBeGreaterThan(20)
  })

  it('다음 승진 대상은 회사 승진 속도를 반영한다', () => {
    const s = { ...game(), rank: 'mid' as const }
    expect(nextPromotion(s)!.rank.id).toBe('senior')
    expect(nextPromotion(s)!.minCareerYear).toBe(7)
    const seedStartup = { ...s, company: { ...s.company, type: 'seed' as const } }
    expect(nextPromotion(seedStartup)!.minCareerYear).toBe(5)
  })

  it('리드는 트랙을 골라야 다음 직급이 정해진다', () => {
    const lead = { ...game(), rank: 'lead' as const }
    expect(nextPromotion(lead)).toBeNull()
    expect(nextPromotion(lead, 'ic')!.rank.id).toBe('staff')
    expect(nextPromotion({ ...lead, preferredTrack: 'manager' })!.rank.id).toBe('em')
    expect(nextPromotion({ ...lead, rank: 'cto', preferredTrack: 'manager' })).toBeNull()
  })
})

describe('평판', () => {
  it('실력이 높을수록 같은 네트워킹으로 평판이 더 오른다', () => {
    let low = 0
    let high = 0
    for (let seed = 1; seed <= 30; seed++) {
      const weak = { ...game(seed), stats: { coding: 35, design: 30, communication: 40, domain: 30, reputation: 10 } }
      const strong = { ...game(seed), stats: { coding: 85, design: 80, communication: 40, domain: 70, reputation: 10 } }
      low += playYear(weak, 'networking').stats.reputation - 10
      high += playYear(strong, 'networking').stats.reputation - 10
    }
    expect(high).toBeGreaterThan(low * 2)
  })

  it('명성 점수에서 평판은 정해진 비중만큼만 들어간다', () => {
    const base = { ...game(), achievements: [] as string[] }
    const famous = evaluateRetirement({ ...base, stats: { ...base.stats, reputation: 100 } }, 'voluntary').fameScore
    const unknown = evaluateRetirement({ ...base, stats: { ...base.stats, reputation: 0 } }, 'voluntary').fameScore
    expect(famous - unknown).toBe(Math.round(100 * FAME_REPUTATION_WEIGHT))
  })
})

describe('체력 예상', () => {
  it('연초에 보여주는 예상 변화가 실제 연말 체력과 같다 (이벤트가 체력을 건드리지 않은 해)', () => {
    let checked = 0
    for (let seed = 1; seed <= 60; seed++) {
      for (const f of focuses) {
        const before = { ...game(seed), stamina: 60 }
        let s = startYear(before, f.id)
        let touched = false
        while (s.pendingEvents.length > 0) {
          const { state, outcome } = chooseEventOption(s, 0)
          if (outcome.effects.stamina) touched = true
          s = state
        }
        if (touched) continue
        expect(finishYear(s).stamina, `${f.id} seed ${seed}`).toBe(Math.min(100, 60 + staminaChange(before, f.id)))
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('야근이 심한 회사일수록 같은 집중의 체력 소모가 크다', () => {
    const calm = { ...game(), company: { ...game().company, type: 'finance_public' as const } }
    const harsh = { ...game(), company: { ...game().company, type: 'sme_si' as const } }
    expect(staminaChange(calm, 'study')).toBeGreaterThan(staminaChange(harsh, 'study'))
    expect(staminaChange(harsh, 'rest')).toBeGreaterThan(0)
  })
})

describe('전략 봇', () => {
  it('고정·순환·승진 조건 전략 모두 은퇴까지 돌아간다', () => {
    const strategies = [fixedPolicy('networking', 'manager'), cyclePolicy(['study', 'all_in', 'networking'], 'ic'), promotionMindedPolicy('manager')]
    for (const strategy of strategies) {
      for (let seed = 1; seed <= 10; seed++) {
        const s = playToEnd(randomGame(seed), strategy, seed)
        expect(s.phase).toBe('retired')
      }
    }
  })

  it('쉬기만 하면 신입에서 거의 벗어나지 못한다', () => {
    const best = Array.from({ length: 20 }, (_, i) => playToEnd(randomGame(i + 1), fixedPolicy('rest', 'ic'), i + 1)).map((s) => rankById[s.bestRank].fameScore)
    // 예전에는 실직 후 승진 포지션으로 재취업하는 구멍이 있었다. 지금은 막혔지만 여유를 두고 주니어까지 허용
    expect(Math.max(...best)).toBeLessThanOrEqual(rankById.junior.fameScore)
  })
})
