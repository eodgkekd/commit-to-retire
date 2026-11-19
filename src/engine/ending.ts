// 업적 판정과 은퇴 평가

import { achievementById, FAME_REPUTATION_WEIGHT, fameGrades, rankById } from '../data'
import { unlock } from './rules'
import type { GameState, RetireReason, Retirement } from './types'

/** 상태로 판정하는 업적 (이벤트가 직접 주는 업적은 applyEffects에서 처리) */
export function checkAchievements(state: GameState, retiring: RetireReason | null = null): void {
  const c = state.counters
  if (c.jobChanges >= 5) unlock(state, 'job_hopper')
  if (state.yearsAtCompany >= 20) unlock(state, 'one_company')
  if (c.startupFailures >= 3) unlock(state, 'stock_tissue')
  if (c.incidents >= 8) unlock(state, 'three_am')
  if (c.refactors >= 3) unlock(state, 'legacy_archaeologist')
  if (state.stats.reputation >= 90) unlock(state, 'open_source_star')
  if (state.rank === 'cto' && state.profile.education === 'non_major') unlock(state, 'non_major_cto')
  if (retiring === 'age' && c.burnouts === 0) unlock(state, 'no_burnout')
}

export function evaluateRetirement(state: GameState, reason: RetireReason): Retirement {
  checkAchievements(state, reason)
  const rankScore = rankById[state.bestRank].fameScore
  const reputationScore = Math.round(state.stats.reputation * FAME_REPUTATION_WEIGHT)
  const achievementScore = state.achievements.reduce((sum, id) => sum + (achievementById[id]?.fame ?? 0), 0)
  const fameScore = rankScore + reputationScore + achievementScore
  const tier = fameGrades.find((g) => fameScore >= g.minScore)!
  return { reason, fameScore, fameGrade: tier.grade, title: tier.title }
}
