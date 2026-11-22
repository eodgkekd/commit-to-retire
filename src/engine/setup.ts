// 캐릭터 생성 → 첫 회사 입사까지. 어느 회사에 붙었는지는 firstJob.ts가 정한다

import {
  companyTypeById,
  educationById,
  FIRST_JOB,
  playStyleById,
  START_CALENDAR_YEAR,
} from '../data'
import { createRng } from './rng'
import { clampStat, marketSalary, pickCompanyName, STAT_KEYS } from './rules'
import type { CompanyTypeId, GameState, IndustryId, Profile, Stats } from './types'

/** 프로필(학력·스타일·나이)로 시작 능력치를 만든다 */
export function startingStats(profile: Profile): Stats {
  const style = playStyleById[profile.playStyle].stats
  const edu = educationById[profile.education].statBonus
  // 늦게 시작할수록 사회 경험 보너스 (24세 초과분 1년당 +1)
  const ageBonus = Math.max(0, profile.startAge - 24)

  // 취업 준비로 보낸 해에는 코딩을 조금 더 공부했다
  const prepBonus = (profile.jobPrepYears ?? 0) * FIRST_JOB.prepCodingGain

  const stats: Stats = {
    coding: style.coding + prepBonus,
    design: style.design,
    communication: style.communication + ageBonus,
    domain: style.domain + ageBonus,
    reputation: 0,
  }
  for (const key of STAT_KEYS) stats[key] = clampStat(stats[key] + (edu[key] ?? 0))
  return stats
}

export interface NewGameInput {
  profile: Profile
  companyType: CompanyTypeId
  industry: IndustryId
  seed: number
}

export function createGame({ profile, companyType, industry, seed }: NewGameInput): GameState {
  if (!companyTypeById[companyType].industries.includes(industry)) {
    throw new Error(`${companyType} 유형에는 없는 업종이에요: ${industry}`)
  }

  const rng = createRng(seed)
  const stats = startingStats(profile)
  const salary = marketSalary(companyType, industry, 'newbie', 1)
  const company = { name: pickCompanyName(rng, companyType)!, type: companyType, industry }

  return {
    version: 1,
    seed,
    rngState: rng.state,
    profile,
    phase: 'year_start',
    careerYear: 1,
    calendarYear: START_CALENDAR_YEAR,
    age: profile.startAge,
    stats,
    stamina: 100,
    salary,
    assets: 0,
    rank: 'newbie',
    bestRank: 'newbie',
    preferredTrack: null,
    company,
    yearsAtCompany: 0,
    yearsAtRank: 0,
    unemployed: false,
    focus: null,
    pendingEvents: [],
    yearEvents: [],
    gradeBonus: 0,
    offerBonus: 0,
    yearStart: { stats: { ...stats }, salary },
    offers: [],
    flags: [],
    counters: { incidents: 0, refactors: 0, jobChanges: 0, burnouts: 0, startupFailures: 0, exits: 0 },
    achievements: [],
    seenEvents: [],
    history: [],
    retirement: null,
  }
}
