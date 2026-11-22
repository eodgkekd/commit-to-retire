// 첫 취업: 신입 공채에 지원해 서류 → 인적성·코딩테스트 → 면접을 거친다.
// 게임 상태(GameState)가 만들어지기 전 단계라서 프로필과 시드만으로 계산한다.

import { companyTypeById, FIRST_JOB } from '../data'
import { createRng } from './rng'
import { clamp, hiringScore } from './rules'
import { startingStats } from './setup'
import type { CompanyTypeId, Profile } from './types'

export const FIRST_JOB_STAGES = ['resume', 'test', 'interview'] as const
export type FirstJobStage = (typeof FIRST_JOB_STAGES)[number]

export const FIRST_JOB_STAGE_LABELS: Record<FirstJobStage, string> = {
  resume: '서류',
  test: '인적성·코딩테스트',
  interview: '면접',
}

export interface FirstJobResult {
  type: CompanyTypeId
  /** 통과한 단계들 */
  passed: FirstJobStage[]
  /** 떨어진 단계. 최종 합격이면 null */
  failedAt: FirstJobStage | null
}

/** 전형 없이 갈 수 있는 회사 유형인지 (중소 SI·에이전시) */
export function isSafetyType(type: CompanyTypeId): boolean {
  return FIRST_JOB.safetyTypes.includes(type)
}

/** 공채 위주 회사는 인적성 비중이 크고, 수시 채용 회사는 코딩테스트만 본다 */
const APTITUDE_TYPES: CompanyTypeId[] = ['chaebol', 'chaebol_si', 'finance_public', 'midsize']

/** 단계별 통과 확률 (화면에는 보여주지 않는다) */
export function firstJobStageChance(profile: Profile, type: CompanyTypeId, stage: FirstJobStage): number {
  if (isSafetyType(type)) return 1
  const stats = startingStats(profile)
  const bar = companyTypeById[type].hiringBar
  const cut = (p: number) => clamp(p, FIRST_JOB.minChance, FIRST_JOB.maxChance)

  switch (stage) {
    case 'resume': {
      const regional = FIRST_JOB.regionalBonus
      const bonus = profile.education === regional.education && type === regional.companyType ? regional.score : 0
      const diff = hiringScore(stats, profile.education, type) + bonus - bar
      return cut(1 / (1 + Math.exp(-diff / FIRST_JOB.resumeSpread)))
    }
    case 'test': {
      const { start, base, perBar, spread } = FIRST_JOB.test
      const skill = APTITUDE_TYPES.includes(type) ? (stats.coding + stats.communication + stats.domain) / 3 + 10 : stats.coding
      return cut(start + (skill - (base + bar * perBar)) / spread)
    }
    case 'interview': {
      const { start, base, perBar, spread } = FIRST_JOB.interview
      const skill = (stats.communication + stats.design) / 2
      return cut(start + (skill - (base + bar * perBar)) / spread)
    }
  }
}

/** 세 단계를 모두 통과할 확률 (테스트·밸런스 확인용) */
export function firstJobFinalChance(profile: Profile, type: CompanyTypeId): number {
  return FIRST_JOB_STAGES.reduce((p, stage) => p * firstJobStageChance(profile, type, stage), 1)
}

/**
 * 지원 결과. 회사 유형마다 주사위가 (시드, 취준 햇수)로 고정돼 있어서
 * 같은 회차에는 지원 조합을 바꾸거나 뒤로 갔다 와도 같은 회사의 결과가 바뀌지 않는다.
 */
export function applyFirstJobs(profile: Profile, types: CompanyTypeId[], seed: number): FirstJobResult[] {
  if (types.length > FIRST_JOB.applications) throw new Error(`한 번에 ${FIRST_JOB.applications}곳까지만 지원할 수 있어요`)
  const round = profile.jobPrepYears ?? 0
  const order = Object.keys(companyTypeById)

  return types.map((type) => {
    const index = order.indexOf(type)
    if (index < 0) throw new Error(`없는 회사 유형이에요: ${type}`)
    const rng = createRng((seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(round + 1, 0x85ebca6b)) >>> 0)
    const passed: FirstJobStage[] = []
    let failedAt: FirstJobStage | null = null
    for (const stage of FIRST_JOB_STAGES) {
      // 주사위는 단계마다 항상 굴려서, 프로필이 바뀌어도 뒤 단계의 운이 달라지지 않게 한다
      const roll = rng.next()
      if (failedAt) continue
      if (roll < firstJobStageChance(profile, type, stage)) passed.push(stage)
      else failedAt = stage
    }
    return { type, passed, failedAt }
  })
}

export function canPrepareAnotherYear(profile: Profile): boolean {
  return (profile.jobPrepYears ?? 0) < FIRST_JOB.maxPrepYears
}

/** 취업 준비로 1년을 더 보낸다: 나이 +1, 코딩 소폭 상승, 다음 공채에 다시 지원 */
export function prepareAnotherYear(profile: Profile): Profile {
  if (!canPrepareAnotherYear(profile)) throw new Error('더는 취업 준비로 보낼 수 없어요')
  return { ...profile, startAge: profile.startAge + 1, jobPrepYears: (profile.jobPrepYears ?? 0) + 1 }
}
