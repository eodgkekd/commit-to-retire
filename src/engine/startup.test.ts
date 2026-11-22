import { describe, expect, it } from 'vitest'
import { events, STARTUP } from '../data'
import { acceptOffer } from './hub'
import { createRng } from './rng'
import { createGame } from './setup'
import { canFoundStartup, foundStartup, settleStartupYear, startupBlocker } from './startup'
import type { GameState, Profile, YearRecord } from './types'
import { acknowledgeYear, finishYear, isEligible, startYear } from './year'

const profile: Profile = {
  name: '테스트',
  emoji: '🤓',
  startAge: 26,
  education: 'local_cs',
  specialty: 'backend',
  playStyle: 'builder',
  focusStats: ['design'],
}

function sideYears(g: GameState, n: number): YearRecord[] {
  const base = { calendarYear: 2026, age: 27, company: g.company, rank: g.rank, grade: 'B' as const, salaryBefore: 0, salaryAfter: 0, statsBefore: g.stats, statsAfter: g.stats, events: [], triggers: [], feed: [] }
  return Array.from({ length: n }, () => ({ ...base, focus: 'side_project' as const }))
}

function hub(patch: Partial<GameState> = {}): GameState {
  const g = createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed: 3 })
  return { ...g, phase: 'hub', careerYear: 5, assets: 8000, history: sideYears(g, 2), ...patch }
}

function founder(patch: Partial<GameState> = {}): GameState {
  return { ...foundStartup(hub()), phase: 'event', focus: 'side_project', pendingEvents: [], ...patch }
}

describe('창업 조건', () => {
  it('사이드 프로젝트를 2년 하고 돈이 있으면 창업할 수 있다', () => {
    expect(canFoundStartup(hub())).toBe(true)
    expect(canFoundStartup(hub({ history: [] }))).toBe(false)
    expect(canFoundStartup(hub({ assets: 1000 }))).toBe(false)
    expect(startupBlocker(hub({ assets: 1000 }))).toContain('통장')
    expect(startupBlocker(hub({ history: [] }))).toBeNull()
  })

  it('창업하면 월급이 없고 이직 제안이 사라진다', () => {
    const s = foundStartup(hub({ unemployed: true, offers: [{ company: { name: 'X', type: 'bigtech', industry: 'b2c' }, rank: 'mid', salary: 9000 }] }))
    expect(s.startup).toEqual({ stage: 0, years: 0 })
    expect(s.company.type).toBe('seed')
    expect(s.company.industry).toBe('b2b_saas')
    expect(s.salary).toBe(0)
    expect(s.unemployed).toBe(false)
    expect(s.offers).toEqual([])
    expect(s.achievements).toContain('founder')
    expect(s.pendingFeedTriggers).toContain('startupFounded')
    expect(canFoundStartup(s)).toBe(false)
  })
})

describe('창업 연말 결산', () => {
  it('실력이 충분하면 투자를 받아 다음 단계로 간다', () => {
    const s = founder({ stats: { coding: 80, design: 90, communication: 90, domain: 90, reputation: 60 } })
    const r = settleStartupYear(s, createRng(1))
    expect(r.trigger).toBe('startupRaised')
    expect(s.startup!.stage).toBe(1)
    expect(s.salary).toBe(STARTUP.salary[1])
  })

  it('실력이 모자라면 대개 망한다', () => {
    let failed = 0
    for (let seed = 1; seed <= 50; seed++) {
      const s = founder({ stats: { coding: 30, design: 10, communication: 10, domain: 10, reputation: 0 } })
      if (settleStartupYear(s, createRng(seed)).trigger === 'startupFailed') {
        failed++
        expect(s.unemployed).toBe(true)
        expect(s.startup).toBeUndefined()
      }
    }
    expect(failed).toBeGreaterThan(25)
  })

  it('부트스트랩 단계에서 돈이 바닥나면 문을 닫는다', () => {
    const s = founder({ assets: 100, stats: { coding: 50, design: 50, communication: 50, domain: 50, reputation: 0 } })
    expect(settleStartupYear(s, createRng(2)).trigger).toBe('startupFailed')
  })

  it('시리즈 B에서 잘 버티면 언젠가 매각한다', () => {
    let exited = false
    for (let seed = 1; seed <= 20 && !exited; seed++) {
      const s = founder({ startup: { stage: 3, years: 3 }, stats: { coding: 80, design: 95, communication: 95, domain: 95, reputation: 80 } })
      const before = s.assets
      if (settleStartupYear(s, createRng(seed)).trigger === 'startupExit') {
        exited = true
        expect(s.assets).toBeGreaterThan(before + STARTUP.exitPayout[0] - 1)
        expect(s.company.type).toBe('bigtech')
        expect(s.achievements).toContain('founder_exit')
      }
    }
    expect(exited).toBe(true)
  })

  it('finishYear에서 고과 대신 사업 결산을 한다', () => {
    const s = acknowledgeYear(finishYear(founder({ stats: { coding: 80, design: 90, communication: 90, domain: 90, reputation: 60 } })))
    expect(s.history.at(-1)!.triggers).toContain('startupRaised')
    expect(s.history.at(-1)!.grade).toBe('A')
  })
})

describe('창업 중 이벤트와 이직', () => {
  it('창업 중에는 창업 이벤트와 개인·생활·업계·장애 이벤트만 나온다', () => {
    const s = founder()
    const pool = events.filter((e) => isEligible(e, s))
    expect(pool.some((e) => e.conditions?.founder)).toBe(true)
    expect(pool.every((e) => e.conditions?.founder || ['개인', '생활', '업계', '장애'].includes(e.category))).toBe(true)
    const employee = hub()
    expect(events.filter((e) => isEligible(e, employee)).some((e) => e.conditions?.founder)).toBe(false)
  })

  it('창업 중에 한 해를 시작해도 이벤트가 뽑힌다', () => {
    const s = startYear({ ...foundStartup(hub()), phase: 'year_start' }, 'side_project')
    expect(s.pendingEvents.length).toBeGreaterThan(0)
  })

  it('제안을 받아 이직하면 창업이 끝난다', () => {
    const s = foundStartup(hub())
    const moved = acceptOffer({ ...s, offers: [{ company: { name: 'X', type: 'bigtech', industry: 'b2c' }, rank: 'mid', salary: 9000 }] }, 0)
    expect(moved.startup).toBeUndefined()
    expect(moved.company.type).toBe('bigtech')
  })
})
