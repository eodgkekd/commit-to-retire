import { describe, expect, it } from 'vitest'
import { playToEnd, randomGame } from './bot'
import { acceptOffer, nextYear } from './hub'
import { createRng } from './rng'
import { createGame, firstJobOptions, startingStats } from './setup'
import type { GameState, Profile } from './types'
import { companyTypeById, events, ranks } from '../data'
import { acknowledgeYear, checkFailMultiplier, chooseEventOption, currentEvent, finishYear, isEligible, overworkDrain, startYear } from './year'

/** 선택지는 언제나 고를 수 있으니 첫 번째를 고른다 */
const freeChoice = (_s: GameState) => 0

describe('능력치 판정', () => {
  const stats = { coding: 50, design: 25, communication: 40, domain: 30, reputation: 0 }

  it('판정이 없으면 확률을 바꾸지 않는다', () => {
    expect(checkFailMultiplier(stats, undefined)).toBe(1)
  })

  it('기준보다 낮으면 실패 확률이 오르고 높으면 내려간다', () => {
    expect(checkFailMultiplier(stats, { coding: 50 })).toBe(1)
    expect(checkFailMultiplier(stats, { design: 50 })).toBe(3)
    expect(checkFailMultiplier(stats, { coding: 40 })).toBeLessThan(1)
  })

  it('여러 능력치를 보면 가장 모자란 쪽을 기준으로 한다', () => {
    expect(checkFailMultiplier(stats, { coding: 25, design: 50 })).toBe(3)
  })
})

const profile: Profile = {
  name: '테스트',
  emoji: '🤓',
  startAge: 26,
  education: 'local_cs',
  specialty: 'backend',
  playStyle: 'builder',
  focusStats: ['coding', 'design'],
}

describe('RNG', () => {
  it('같은 시드면 같은 값이 나온다', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })

  it('상태로 다시 만들면 이어서 같은 값이 나온다', () => {
    const a = createRng(7)
    a.next()
    const resumed = createRng(a.state)
    expect(resumed.next()).toBe(a.next())
  })
})

describe('캐릭터 생성', () => {
  it('나이 보너스가 소통·도메인에 붙는다', () => {
    const stats = startingStats(profile)
    // builder(25) + 나이 보너스(26-24=2)
    expect(stats.communication).toBe(27)
    expect(stats.domain).toBe(27)
  })

  it('명문대는 지방대보다 합격 가능한 회사가 많거나 같다', () => {
    const local = firstJobOptions(profile).filter((o) => o.passed).length
    const top = firstJobOptions({ ...profile, education: 'top_cs' }).filter((o) => o.passed).length
    expect(top).toBeGreaterThanOrEqual(local)
  })

  it('누구든 최소 한 곳은 합격한다', () => {
    const worst: Profile = { ...profile, education: 'self_taught', playStyle: 'communicator', startAge: 22 }
    expect(firstJobOptions(worst).some((o) => o.passed)).toBe(true)
  })

  it('서류 탈락한 회사로는 시작할 수 없다', () => {
    const failed = firstJobOptions(profile).find((o) => !o.passed)
    if (!failed) return
    expect(() => createGame({ profile, companyType: failed.type, industry: 'b2c', seed: 1 })).toThrow()
  })
})

describe('1년 진행', () => {
  const game = () => createGame({ profile, companyType: 'sme_si', industry: 'si_sm', seed: 123 })

  it('연초 → 이벤트 → 연말 → 허브 순서로 진행된다', () => {
    let s = startYear(game(), 'study')
    expect(s.phase).toBe('event')
    while (s.pendingEvents.length > 0) s = chooseEventOption(s, freeChoice(s)).state
    s = finishYear(s)
    expect(s.phase).toBe('year_end')
    expect(s.history).toHaveLength(1)
    expect(s.age).toBe(27)
    s = acknowledgeYear(s)
    expect(s.phase).toBe('hub')
  })

  it('원본 상태를 바꾸지 않는다 (순수 함수)', () => {
    const before = game()
    const snapshot = JSON.stringify(before)
    startYear(before, 'all_in')
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('이벤트를 남겨두고 연말로 갈 수 없다', () => {
    const s = startYear(game(), 'study')
    expect(() => finishYear(s)).toThrow()
  })

  it('실직 상태에서는 회사를 고르기 전까지 다음 해로 못 간다', () => {
    let s = startYear(game(), 'study')
    while (s.pendingEvents.length > 0) s = chooseEventOption(s, freeChoice(s)).state
    s = acknowledgeYear(finishYear(s))
    s = { ...s, unemployed: true, offers: s.offers.length ? s.offers : [{ company: { name: '테스트사', type: 'midsize', industry: 'b2c' }, rank: s.rank, salary: 4000 }] }
    expect(() => nextYear(s)).toThrow()
    s = acceptOffer(s, 0)
    expect(s.unemployed).toBe(false)
    expect(nextYear(s).phase).toBe('year_start')
  })
})

describe('이벤트 조건', () => {
  const onboarding = events.find((e) => e.id === 'onboarding_reality')!
  const base = () => createGame({ profile, companyType: 'sme_si', industry: 'si_sm', seed: 1 })

  it('온보딩 현실 자각은 신입 첫 회사에서는 안 나온다', () => {
    expect(isEligible(onboarding, base())).toBe(false)
  })

  it('이직한 첫해에는 나오고, 2년차부터는 안 나온다', () => {
    const moved = { ...base(), counters: { ...base().counters, jobChanges: 1 } }
    expect(isEligible(onboarding, moved)).toBe(true)
    expect(isEligible(onboarding, { ...moved, yearsAtCompany: 1 })).toBe(false)
  })
})

describe('직급별 이벤트', () => {
  it('모든 직급에 그 직급에서만 나오는 이벤트가 있다', () => {
    for (const rank of ranks) {
      expect(events.some((e) => e.conditions?.ranks?.includes(rank.id)), rank.id).toBe(true)
    }
  })
})

describe('야근 경고', () => {
  const at = (companyType: 'sme_si' | 'midsize' | 'chaebol_si', age = 26) => ({
    ...createGame({ profile, companyType, industry: 'si_sm', seed: 1 }),
    age,
  })

  it('야근이 가장 심한 회사에서는 공부만 해도 체력이 깎인다고 알려 준다', () => {
    expect(overworkDrain(at('sme_si'))).toBeLessThanOrEqual(-10)
  })

  it('야근이 보통인 회사에서는 경고하지 않는다', () => {
    expect(overworkDrain(at('midsize'))).toBeNull()
    expect(overworkDrain(at('chaebol_si'))).toBeNull()
  })

  it('40세가 넘으면 회복이 줄어서 야근 🔥3 회사도 경고한다', () => {
    expect(overworkDrain(at('chaebol_si', 41))).not.toBeNull()
  })

  it('실직 중에는 경고하지 않는다', () => {
    expect(overworkDrain({ ...at('sme_si'), unemployed: true })).toBeNull()
  })
})

describe('40대 이후 권고사직', () => {
  const at = (age: number, seed = 1) => ({ ...createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed }), age })
  const playYear = (g: GameState) => {
    let s = startYear(g, 'study')
    while (currentEvent(s)) s = chooseEventOption(s, 0).state
    return finishYear(s)
  }
  const layoffRate = (age: number) => {
    let n = 0
    for (let seed = 1; seed <= 300; seed++) if (playYear(at(age, seed)).history.at(-1)!.triggers.includes('layoff')) n++
    return n / 300
  }

  it('50대 중반은 30대보다 훨씬 자주 잘린다', () => {
    expect(layoffRate(56)).toBeGreaterThan(layoffRate(30) + 0.08)
  })

  it('희망퇴직을 신청하면 연말에 실직 상태가 되고 승진도 연봉 인상도 없다', () => {
    let s = startYear(at(47), 'all_in')
    s = { ...s, pendingEvents: ['voluntary_retirement'] }
    s = chooseEventOption(s, 0).state
    expect(s.unemployed).toBe(true)
    const salary = s.salary
    s = finishYear(s)
    expect(s.unemployed).toBe(true)
    expect(s.history.at(-1)!.triggers).toContain('layoff')
    expect(s.history.at(-1)!.triggers).not.toContain('promoted')
    expect(s.salary).toBe(salary)
  })
})

describe('사라진 이벤트', () => {
  it('세이브에 없는 이벤트가 남아 있어도 연말로 넘어갈 수 있다', () => {
    const g = createGame({ profile, companyType: 'sme_si', industry: 'si_sm', seed: 1 })
    let s = startYear(g, 'study')
    s = { ...s, pendingEvents: ['deleted_event'] }
    expect(currentEvent(s)).toBeNull()
    expect(() => finishYear(s)).not.toThrow()
  })
})

describe('뒤늦은 깨달음 이벤트', () => {
  const late = events.find((e) => e.id === 'late_realization')!
  const base = () => createGame({ profile, companyType: 'sme_si', industry: 'si_sm', seed: 1 })

  it('첫 회사 2~3년차에만 나온다', () => {
    expect(isEligible(late, base())).toBe(false)
    expect(isEligible(late, { ...base(), careerYear: 2 })).toBe(true)
    expect(isEligible(late, { ...base(), careerYear: 4 })).toBe(false)
  })

  it('이직한 적이 있으면 안 나온다', () => {
    expect(isEligible(late, { ...base(), careerYear: 2, counters: { ...base().counters, jobChanges: 1 } })).toBe(false)
  })

  it('이직 준비를 고르면 올해 이직 제안 보너스가 생긴다', () => {
    let s = startYear({ ...base(), careerYear: 2 }, 'study')
    s = { ...s, pendingEvents: ['late_realization'] }
    s = chooseEventOption(s, 0).state
    expect(s.offerBonus).toBe(2)
  })
})

describe('한 판 전체', () => {
  it('같은 시드면 결과가 완전히 같다', () => {
    const a = playToEnd(randomGame(99), 'random', 5)
    const b = playToEnd(randomGame(99), 'random', 5)
    expect(a).toEqual(b)
  })

  it('항상 은퇴로 끝나고 수치가 범위 안에 있다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playToEnd(randomGame(seed), 'random', seed)
      expect(s.phase).toBe('retired')
      expect(s.retirement).not.toBeNull()
      for (const v of Object.values(s.stats)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
      expect(s.stamina).toBeGreaterThanOrEqual(0)
      expect(s.salary).toBeGreaterThan(0)
    }
  })
})

describe('장애 배지', () => {
  const started = () => ({ ...startYear(createGame({ profile, companyType: 'sme_si', industry: 'si_sm', seed: 3 }), 'study'), pendingEvents: [] })

  it('장애 대응 횟수가 늘어난 해에만 붙는다', () => {
    const calm = finishYear(started())
    expect(calm.history.at(-1)!.triggers).not.toContain('incident')

    const s = started()
    const busy = finishYear({ ...s, counters: { ...s.counters, incidents: s.counters.incidents + 1 } })
    expect(busy.history.at(-1)!.triggers).toContain('incident')
  })
})

describe('회사 유형과 업종', () => {
  it('유형에 없는 업종으로는 시작할 수 없다', () => {
    expect(() => createGame({ profile, companyType: 'sme_si', industry: 'game', seed: 1 })).toThrow()
  })

  it('봇이 만나는 모든 회사는 유형에 맞는 업종이다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = playToEnd(randomGame(seed), 'hopper', seed)
      for (const h of g.history) expect(companyTypeById[h.company.type].industries, `${h.company.name}`).toContain(h.company.industry)
    }
  })
})
