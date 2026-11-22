import { describe, expect, it } from 'vitest'
import { applicationLimit, applyToPosting, canOpenChickenShop, canSpendGapYear, chickenChances, closedCompanies, generatePostings, headhunterChance, makeOffer, negotiateOffer, openChickenShop, rollHeadhunterOffer, spendGapYear, stagePassChance } from './jobs'
import { acceptOffer } from './hub'
import { createRng } from './rng'
import { CHICKEN, rankById } from '../data'
import { createGame } from './setup'
import { educationWeight, hiringScore } from './rules'
import type { GameState, Profile } from './types'

const profile: Profile = {
  name: '테스트',
  emoji: '🤓',
  startAge: 26,
  education: 'local_cs',
  specialty: 'backend',
  playStyle: 'builder',
  focusStats: ['coding'],
}

function hub(patch: Partial<GameState> = {}): GameState {
  const g = createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed: 9 })
  return {
    ...g,
    phase: 'hub',
    careerYear: 5,
    postings: [
      { company: { name: 'A사', type: 'sme_si', industry: 'si_sm' }, rank: 'newbie', salary: 4000, applied: false },
      { company: { name: 'B사', type: 'bigtech', industry: 'b2c' }, rank: 'newbie', salary: 7000, applied: false },
    ],
    applicationsLeft: 1,
    ...patch,
  }
}

describe('지원 횟수', () => {
  it('평소 1곳, 이직 준비 3곳, 실직 5곳', () => {
    expect(applicationLimit('study', false)).toBe(1)
    expect(applicationLimit('job_hunt', false)).toBe(3)
    expect(applicationLimit('study', true)).toBe(5)
  })

  it('지원 횟수를 다 쓰면 더 지원할 수 없다', () => {
    const s = applyToPosting(hub(), 0).state
    expect(s.applicationsLeft).toBe(0)
    expect(() => applyToPosting(s, 1)).toThrow()
  })

  it('같은 공고에 두 번 지원할 수 없다', () => {
    const s = applyToPosting(hub({ applicationsLeft: 2 }), 0).state
    expect(() => applyToPosting(s, 0)).toThrow()
  })
})

describe('전형', () => {
  it('문턱 높은 회사일수록 서류 통과 확률이 낮다', () => {
    const s = hub()
    expect(stagePassChance(s, 'bigtech', 'resume', false)).toBeLessThan(stagePassChance(s, 'sme_si', 'resume', false))
  })

  it('최종까지 붙으면 제안이 생기고, 떨어지면 단계가 기록된다', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { state, result } = applyToPosting(hub({ rngState: seed }), 1)
      if (result.failedAt) {
        expect(state.offers).toHaveLength(0)
      } else {
        expect(result.passed).toHaveLength(4)
        expect(state.offers[0].source).toBe('application')
      }
    }
  })
})

describe('헤드헌터', () => {
  it('신입 때는 거의 오지 않는다', () => {
    expect(headhunterChance({ ...hub(), careerYear: 1 }, 'B', 'study')).toBeLessThan(0.1)
  })
})

describe('취준 공백기', () => {
  it('실직하고 지원을 다 떨어졌을 때만 보낼 수 있다', () => {
    expect(canSpendGapYear(hub({ unemployed: true }))).toBe(false)
    expect(canSpendGapYear(hub({ unemployed: true, applicationsLeft: 0 }))).toBe(true)
  })

  it('1년이 지나고 자산이 줄고, 경력 연차는 그대로이며 다시 지원할 수 있다', () => {
    const before = hub({ unemployed: true, applicationsLeft: 0, assets: 10000 })
    const after = spendGapYear(before)
    expect(after.age).toBe(before.age + 1)
    expect(after.careerYear).toBe(before.careerYear)
    expect(after.assets).toBeLessThan(before.assets)
    expect(after.applicationsLeft).toBe(5)
    expect(after.history.at(-1)?.gap).toBe(true)
  })
})

describe('이직 제안 조건', () => {
  const skilled = (): GameState => hub({
    company: { name: '대기업', type: 'bigtech', industry: 'b2b_saas' },
    rank: 'senior', careerYear: 12, yearsAtRank: 3, salary: 10000,
    stats: { coding: 85, design: 85, communication: 85, domain: 85, reputation: 75 },
  })

  it('재직 중 공고와 헤드헌터 제안은 연봉 또는 직급이 오른다', () => {
    let count = 0
    for (let seed = 1; seed <= 50; seed++) {
      const s = skilled()
      for (const offer of [...generatePostings(s, createRng(seed)), ...rollHeadhunterOffer(s, 'S', 'networking', createRng(seed))]) {
        expect(offer.salary > s.salary || rankById[offer.rank].fameScore > rankById[s.rank].fameScore).toBe(true)
        expect(offer.salary).toBeLessThanOrEqual(offer.salaryCeiling!)
        count++
      }
    }
    expect(count).toBeGreaterThan(0)
  })

  it('대기업 경력자에게 시리즈B·유니콘 영입 프리미엄을 준다', () => {
    const s = skilled()
    for (const type of ['series_b', 'unicorn'] as const) {
      const offer = makeOffer(s, { name: '영입 회사', type, industry: 'b2b_saas' }, s.rank, createRng(1))
      const normal = makeOffer({ ...s, company: { ...s.company, type: 'midsize' } }, offer.company, s.rank, createRng(1))
      expect(offer.recruitmentPremium).toBe(true)
      expect(offer.salary).toBeGreaterThan(s.salary)
      expect(offer.salary).toBeGreaterThan(normal.salary)
    }
  })

  it('매니저·IC 트랙에서도 상위 직급 공고를 만들고 반대 트랙은 제안하지 않는다', () => {
    for (const [rank, track, expected] of [['lead', 'manager', 'em'], ['lead', 'ic', 'staff'], ['em', 'manager', 'director'], ['staff', 'ic', 'principal']] as const) {
      const s = { ...skilled(), rank, preferredTrack: track, careerYear: 25, salary: 6000, stats: { coding: 100, design: 100, communication: 100, domain: 100, reputation: 100 } }
      const offers = Array.from({ length: 20 }, (_, i) => generatePostings(s, createRng(i + 1))).flat()
      expect(offers.some((o) => o.rank === expected)).toBe(true)
      expect(offers.every((o) => o.rank === rank || o.rank === expected)).toBe(true)
    }
  })

  it('실직 상태에서는 낮은 연봉도 재취업 선택지로 남긴다', () => {
    const s = { ...skilled(), salary: 1000000, unemployed: true }
    expect(generatePostings(s, createRng(1))).toHaveLength(5)
    expect(generatePostings(s, createRng(1)).every((o) => o.salary < s.salary)).toBe(true)
  })
})

describe('연봉 협상', () => {
  const offer = { company: { name: '협상 회사', type: 'bigtech' as const, industry: 'b2c' as const }, rank: 'junior' as const, salary: 6000, salaryCeiling: 7500 }

  it('성공한 금액이 수락 후 연봉에 반영되고 원본 상태는 변하지 않는다', () => {
    let successes = 0
    let failures = 0
    for (let seed = 1; seed <= 50; seed++) {
      const before = hub({ offers: [offer], rngState: createRng(seed).next() * 0xffffffff >>> 0 })
      const after = negotiateOffer(before, 0, 10)
      expect(before.offers[0]).not.toHaveProperty('negotiation')
      expect(after.rngState).not.toBe(before.rngState)
      if (after.offers[0].negotiation!.accepted) {
        successes++
        expect(after.offers[0].salary).toBe(6600)
        expect(acceptOffer(after, 0).salary).toBe(6600)
      } else {
        failures++
        expect(after.offers[0].salary).toBe(6000)
      }
      expect(() => negotiateOffer(after, 0, 5)).toThrow()
      expect(negotiateOffer(before, 0, 10)).toEqual(after)
    }
    expect(successes).toBeGreaterThan(0)
    expect(failures).toBeGreaterThan(0)
  })

  it('회사 예산을 넘긴 요청은 거절하고 예전 세이브도 협상할 수 있다', () => {
    const before = hub({ offers: [{ ...offer, salaryCeiling: 6100 }] })
    const after = negotiateOffer(before, 0, 20)
    expect(after.offers[0].negotiation?.accepted).toBe(false)
    expect(after.offers[0].salary).toBe(6000)
    expect(() => negotiateOffer(hub({ offers: [{ ...offer, salaryCeiling: undefined }] }), 0, 5)).not.toThrow()
    expect(() => negotiateOffer({ ...before, phase: 'year_start' }, 0, 5)).toThrow()
    expect(() => negotiateOffer(before, 99, 5)).toThrow()
  })

  it('새로고침에 해당하는 직렬화 후에도 협상을 반복할 수 없다', () => {
    const after = negotiateOffer(hub({ offers: [offer] }), 0, 5)
    const loaded = JSON.parse(JSON.stringify(after)) as GameState
    expect(() => negotiateOffer(loaded, 0, 10)).toThrow()
  })
})

describe('40대 재취업', () => {
  const gapRecord = (g: GameState) => ({ ...g.history.at(-1)!, gap: true })

  it('40세부터 서류·면접 통과 확률이 나이만큼 깎이고 코딩테스트는 그대로다', () => {
    const young = hub({ age: 35 })
    const old = hub({ age: 50 })
    expect(stagePassChance(old, 'midsize', 'resume', false)).toBeLessThan(stagePassChance(young, 'midsize', 'resume', false))
    expect(stagePassChance(old, 'midsize', 'finalInterview', false)).toBeLessThan(stagePassChance(young, 'midsize', 'finalInterview', false))
    expect(stagePassChance(old, 'midsize', 'codingTest', false)).toBe(stagePassChance(young, 'midsize', 'codingTest', false))
  })

  it('취업 준비로 보낸 해가 이어질수록 서류가 더 어려워진다', () => {
    const g = hub({ age: 45, unemployed: true })
    const record = { calendarYear: 2030, age: 44, company: g.company, rank: g.rank, focus: 'job_hunt' as const, grade: 'D' as const,
      salaryBefore: g.salary, salaryAfter: g.salary, statsBefore: g.stats, statsAfter: g.stats, events: [], triggers: [], feed: [] }
    const oneGap = { ...g, history: [gapRecord({ ...g, history: [record] })] }
    const twoGaps = { ...g, history: [oneGap.history[0], oneGap.history[0]] }
    expect(stagePassChance(oneGap, 'midsize', 'resume', false)).toBeLessThan(stagePassChance(g, 'midsize', 'resume', false))
    expect(stagePassChance(twoGaps, 'midsize', 'resume', false)).toBeLessThan(stagePassChance(oneGap, 'midsize', 'resume', false))
  })
})

describe('치킨집 창업', () => {
  it('실직한 40세 이상만 차릴 수 있다', () => {
    expect(canOpenChickenShop(hub({ age: 45, unemployed: true }))).toBe(true)
    expect(canOpenChickenShop(hub({ age: 39, unemployed: true }))).toBe(false)
    expect(canOpenChickenShop(hub({ age: 45, unemployed: false }))).toBe(false)
  })

  it('차리면 창업비가 빠지고 치킨집 엔딩으로 은퇴한다', () => {
    const g = hub({ age: 48, unemployed: true, assets: 20000 })
    const s = openChickenShop(g)
    expect(s.phase).toBe('retired')
    expect(s.retirement?.reason).toBe('chicken')
    expect(['franchise', 'local', 'closed']).toContain(s.retirement?.chicken)
    if (s.retirement?.chicken === 'closed') expect(s.assets).toBe(20000 - CHICKEN.cost)
    expect(s.achievements.some((id) => id === 'chicken_shop' || id === 'chicken_franchise')).toBe(true)
  })

  it('같은 시드면 같은 결과가 나온다', () => {
    const g = hub({ age: 48, unemployed: true })
    expect(openChickenShop(g).retirement).toEqual(openChickenShop(g).retirement)
  })

  it('결과 확률의 합은 1이고 소통이 높을수록 덜 망한다', () => {
    const low = chickenChances(hub({ stats: { ...hub().stats, communication: 20 } }))
    const high = chickenChances(hub({ stats: { ...hub().stats, communication: 90 } }))
    for (const c of [low, high]) expect(c.franchise + c.local + c.closed).toBeCloseTo(1, 5)
    expect(high.closed).toBeLessThan(low.closed)
    expect(high.franchise).toBeGreaterThan(low.franchise)
  })

  it('여러 판을 돌리면 세 가지 결과가 모두 나온다', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) seen.add(openChickenShop(hub({ age: 48, unemployed: true, rngState: seed })).retirement!.chicken!)
    expect(seen).toEqual(new Set(['franchise', 'local', 'closed']))
  })
})

describe('폐업한 회사', () => {
  it('다니다 폐업한 회사는 채용 공고와 헤드헌터 제안에 다시 나오지 않는다', () => {
    const g = hub({ unemployed: true })
    const closed = { ...g.history.at(-1), calendarYear: 2030, age: 30, company: { name: '주식회사 무언가', type: 'seed' as const, industry: 'b2c' as const },
      rank: g.rank, focus: 'study' as const, grade: 'B' as const, salaryBefore: g.salary, salaryAfter: g.salary, statsBefore: g.stats, statsAfter: g.stats,
      events: [], triggers: ['companyClosed' as const], feed: [] }
    const s = { ...g, history: [closed] }
    expect(closedCompanies(s)).toEqual(['주식회사 무언가'])
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed)
      const names = [...generatePostings(s, rng).map((p) => p.company.name), ...rollHeadhunterOffer(s, 'S', 'networking', rng).map((o) => o.company.name)]
      expect(names).not.toContain('주식회사 무언가')
    }
  })
})

describe('학력 가산점 감소', () => {
  it('1년 차에는 그대로, 연차가 쌓이면 줄다가 바닥에서 멈춘다', () => {
    expect(educationWeight(1)).toBe(1)
    expect(educationWeight(6)).toBeCloseTo(0.5)
    expect(educationWeight(30)).toBe(0.25)
  })

  it('명문대와 고졸의 서류 점수 차이가 경력이 쌓이면 좁혀진다', () => {
    const stats = { coding: 60, design: 50, communication: 50, domain: 50, reputation: 20 }
    const gap = (y: number) => hiringScore(stats, 'top_cs', 'chaebol', y) - hiringScore(stats, 'self_taught', 'chaebol', y)
    expect(gap(15)).toBeLessThan(gap(1) / 2)
  })
})
