// 개발자 말고 다른 길 (프리랜서·강사/유튜버·공무원). 허브에서 고르면 결과를 굴리고 게임이 끝난다.
// 데이터는 src/data/exits.ts

import { careerExitById, careerExits, RETIRE_AGE } from '../data'
import { evaluateRetirement } from './ending'
import { createRng } from './rng'
import { clamp, unlock } from './rules'
import type { CareerExitDef, CareerExitId, GameState } from './types'

export function canTakeCareerExit(s: GameState, id: CareerExitId): boolean {
  const def = careerExitById[id]
  if (s.phase !== 'hub') return false
  const c = def.conditions
  if (c.minCareerYear !== undefined && s.careerYear < c.minCareerYear) return false
  if (c.maxAge !== undefined && s.age > c.maxAge) return false
  if (def.statGate && !Object.entries(def.statGate).some(([k, v]) => s.stats[k as keyof typeof s.stats] >= (v ?? 0))) return false
  return true
}

/** 지금 고를 수 있는 길들 */
export function availableCareerExits(s: GameState): CareerExitDef[] {
  return careerExits.filter((d) => canTakeCareerExit(s, d.id))
}

/** 결과별 확률 (화면에는 보여주지 않는다) */
export function careerExitChances(s: GameState, id: CareerExitId): number[] {
  const def = careerExitById[id]
  let skill = def.skill.reduce((sum, k) => sum + s.stats[k], 0) / def.skill.length
  if (def.agePenaltyFrom !== undefined) skill -= Math.max(0, s.age - def.agePenaltyFrom) * 2
  const d = skill - def.pivot
  const chances = def.outcomes.map((o) => o.chance)
  const last = chances.length - 1
  const good = clamp(chances[0] + d * def.goodPerPoint, 0.03, 0.85)
  const bad = clamp(chances[last] - d * def.badPerPoint, 0.05, 0.9)
  if (last === 1) {
    const total = good + bad
    return [good / total, bad / total]
  }
  const middle = Math.max(0, 1 - good - bad)
  return chances.map((_, i) => (i === 0 ? good : i === last ? bad : i === 1 ? middle : 0))
}

export function takeCareerExit(state: GameState, id: CareerExitId): GameState {
  if (!canTakeCareerExit(state, id)) throw new Error('지금은 이 길을 고를 수 없어요')
  const def = careerExitById[id]
  const s = structuredClone(state)
  const rng = createRng(s.rngState)
  const chances = careerExitChances(s, id)
  const outcome = rng.weighted(def.outcomes, (o) => chances[def.outcomes.indexOf(o)])!

  s.assets += (outcome.assets ?? 0) + (outcome.yearlyIncome ?? 0) * Math.max(1, RETIRE_AGE - s.age)
  unlock(s, outcome.achievement)
  delete s.startup
  s.retirement = { ...evaluateRetirement(s, 'career_exit'), careerExit: { id, outcome: outcome.id } }
  s.phase = 'retired'
  s.rngState = rng.state
  return s
}

/** 엔딩 화면 첫 줄 */
export function careerExitEnding(exit: { id: CareerExitId; outcome: string }): string {
  return careerExitById[exit.id]?.outcomes.find((o) => o.id === exit.outcome)?.ending ?? '개발자 말고 다른 길을 찾았어요'
}
