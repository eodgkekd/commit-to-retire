import { describe, expect, it } from 'vitest'
import { careerExits, events } from '../data'
import { availableCareerExits, canTakeCareerExit, careerExitChances, careerExitEnding, takeCareerExit } from './exits'
import { validResult } from './share'
import { endingResult } from './career'
import { createGame } from './setup'
import type { GameState, Profile } from './types'
import { isEligible } from './year'

const profile: Profile = { name: '테스트', emoji: '🤓', startAge: 26, education: 'local_cs', specialty: 'backend', playStyle: 'builder', focusStats: ['coding'] }

function hub(patch: Partial<GameState> = {}): GameState {
  return { ...createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed: 5 }), phase: 'hub', careerYear: 8, age: 34, ...patch }
}

describe('개발자 말고 다른 길', () => {
  it('결과 확률 합은 1이고, 실력이 좋을수록 좋은 결과가 잘 나온다', () => {
    for (const def of careerExits) {
      const weak = careerExitChances(hub({ stats: { coding: 20, design: 20, communication: 20, domain: 20, reputation: 5 } }), def.id)
      const strong = careerExitChances(hub({ stats: { coding: 90, design: 90, communication: 90, domain: 90, reputation: 90 } }), def.id)
      expect(weak.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
      expect(strong.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
      expect(strong[0], def.id).toBeGreaterThan(weak[0])
    }
  })

  it('조건이 맞아야 고를 수 있다', () => {
    expect(canTakeCareerExit(hub({ careerYear: 3 }), 'freelancer')).toBe(false)
    expect(canTakeCareerExit(hub({ age: 50 }), 'civil_servant')).toBe(false)
    expect(canTakeCareerExit(hub({ stats: { coding: 50, design: 50, communication: 30, domain: 50, reputation: 10 } }), 'creator')).toBe(false)
    expect(availableCareerExits(hub({ stats: { coding: 50, design: 50, communication: 70, domain: 50, reputation: 10 } })).map((e) => e.id)).toContain('creator')
  })

  it('고르면 엔딩으로 가고, 결과 업적과 공유 결과가 올바르다', () => {
    const s = takeCareerExit(hub(), 'freelancer')
    expect(s.phase).toBe('retired')
    expect(s.retirement?.reason).toBe('career_exit')
    expect(careerExitEnding(s.retirement!.careerExit!)).toContain('프리랜서')
    expect(s.achievements.some((a) => a.startsWith('freelancer'))).toBe(true)
    expect(validResult(JSON.parse(JSON.stringify(endingResult(s))))).toBe(true)
  })
})

describe('공백기 뒤 이벤트', () => {
  it('공백기를 보내고 다시 취업한 첫해에만 나온다', () => {
    const gapEvents = events.filter((e) => e.conditions?.afterGapYear)
    expect(gapEvents.length).toBeGreaterThanOrEqual(4)
    const base = hub({ phase: 'year_start' })
    const gapRecord = { gap: true, calendarYear: 2030, age: 33, company: base.company, rank: base.rank, focus: 'job_hunt' as const, grade: 'D' as const, salaryBefore: 0, salaryAfter: 0, statsBefore: base.stats, statsAfter: base.stats, events: [], triggers: [], feed: [] }
    expect(gapEvents.some((e) => isEligible(e, { ...base, history: [gapRecord] }))).toBe(true)
    expect(gapEvents.some((e) => isEligible(e, base))).toBe(false)
  })
})
