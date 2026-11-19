// 캐릭터 생성 → 첫 회사 입사까지

import {
  companyTypeById,
  companyTypes,
  educationById,
  playStyleById,
  START_CALENDAR_YEAR,
} from '../data'
import { createRng } from './rng'
import { clampStat, hiringScore, marketSalary, pickCompanyName, STAT_KEYS } from './rules'
import type { CompanyTypeId, GameState, IndustryId, Profile, Stats } from './types'

/** 프로필(학력·스타일·나이)로 시작 능력치를 만든다 */
export function startingStats(profile: Profile): Stats {
  const style = playStyleById[profile.playStyle].stats
  const edu = educationById[profile.education].statBonus
  // 늦게 시작할수록 사회 경험 보너스 (24세 초과분 1년당 +1)
  const ageBonus = Math.max(0, profile.startAge - 24)

  const stats: Stats = {
    coding: style.coding,
    design: style.design,
    communication: style.communication + ageBonus,
    domain: style.domain + ageBonus,
    reputation: 0,
  }
  for (const key of STAT_KEYS) stats[key] = clampStat(stats[key] + (edu[key] ?? 0))
  return stats
}

export interface CompanyAvailability {
  type: CompanyTypeId
  passed: boolean
  score: number
}

/**
 * 첫 회사 서류 결과. 탈락한 회사도 함께 돌려줘서 "서류 탈락" 연출에 쓴다.
 * 히든 루트 회사는 캐릭터 이름이 맞을 때만 나온다
 */
export function firstJobOptions(profile: Profile): CompanyAvailability[] {
  const stats = startingStats(profile)
  return companyTypes.filter((c) => !c.hiddenFor || c.hiddenFor === profile.name.trim()).map((c) => {
    const score = hiringScore(stats, profile.education, c.id)
    return { type: c.id, passed: score >= c.hiringBar, score: Math.round(score) }
  })
}

export interface NewGameInput {
  profile: Profile
  companyType: CompanyTypeId
  industry: IndustryId
  seed: number
}

export function createGame({ profile, companyType, industry, seed }: NewGameInput): GameState {
  const option = firstJobOptions(profile).find((o) => o.type === companyType)
  if (!option?.passed) throw new Error(`서류 탈락한 회사에는 입사할 수 없어요: ${companyType}`)

  const rng = createRng(seed)
  const stats = startingStats(profile)
  const salary = marketSalary(companyType, industry, 'newbie', 1)
  const company = { name: pickCompanyName(rng, companyType)!, type: companyType, industry }
  const hiddenRoute = !!companyTypeById[companyType].hiddenFor

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
    achievements: hiddenRoute ? ['wellgram_route'] : [],
    seenEvents: [],
    history: [],
    retirement: null,
  }
}
