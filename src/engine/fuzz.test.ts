// 무작위 플레이 검사: 허브에서 할 수 있는 모든 행동을 무작위로 섞어 끝까지 돌리며
// 상태가 깨지지 않는지(범위·단계·문구 치환·저장 검사·공유 결과) 확인한다.

import { describe, expect, it } from 'vitest'
import { NEGOTIATION_RAISES } from './index'
import { randomGame } from './bot'
import { endingResult } from './career'
import { endingFor } from './endings'
import { availableCareerExits, takeCareerExit } from './exits'
import { acceptOffer, canChooseTrack, chooseTrack, declineOffers, nextYear, retireNow } from './hub'
import { applyToPosting, canOpenChickenShop, canSpendGapYear, negotiateOffer, openChickenShop, spendGapYear } from './jobs'
import { createRng, type Rng } from './rng'
import { isLoadableSave } from './save'
import { validResult } from './share'
import { canFoundStartup, foundStartup } from './startup'
import type { FocusId, GameState } from './types'
import { acknowledgeYear, chooseEventOption, currentEvent, finishYear, startYear } from './year'
import { focuses } from '../data'

const PLACEHOLDER = /\{[a-z_]+\}|\((이)\)가|\((은)\)는|\((을)\)를|\((와)\)과|\((으)\)로/

function checkState(s: GameState, where: string) {
  const ctx = `${where} (${s.calendarYear}년, ${s.phase})`
  for (const [k, v] of Object.entries(s.stats)) {
    expect(Number.isFinite(v), `${ctx} ${k}`).toBe(true)
    expect(v, `${ctx} ${k}`).toBeGreaterThanOrEqual(0)
    expect(v, `${ctx} ${k}`).toBeLessThanOrEqual(100)
  }
  expect(s.stamina, ctx).toBeGreaterThanOrEqual(0)
  expect(s.stamina, ctx).toBeLessThanOrEqual(100)
  expect(Number.isFinite(s.salary) && s.salary >= 0, `${ctx} salary ${s.salary}`).toBe(true)
  expect(Number.isFinite(s.assets), `${ctx} assets`).toBe(true)
  if (s.startup) {
    expect(s.unemployed, `${ctx} 창업 중인데 실직`).toBe(false)
    expect(s.company.type, ctx).toBe('seed')
  }
  if (s.phase === 'hub' && !s.unemployed) expect(s.offers.every((o) => o.company.name !== s.company.name), `${ctx} 지금 회사의 제안`).toBe(true)
  expect(isLoadableSave(JSON.parse(JSON.stringify(s))), `${ctx} 저장 검사`).toBe(true)
  for (const r of s.history) for (const post of r.feed) expect(post.text, `${ctx} 피드`).not.toMatch(PLACEHOLDER)
}

/** 허브에서 무작위로 행동한다 (사람이 누를 수 있는 버튼만) */
function randomHub(s: GameState, rng: Rng): GameState {
  for (let step = 0; step < 20 && s.phase === 'hub'; step++) {
    const actions: (() => GameState)[] = []
    if (canChooseTrack(s)) actions.push(() => chooseTrack(s, rng.chance(0.5) ? 'manager' : 'ic'))
    const open = (s.postings ?? []).map((p, i) => ({ p, i })).filter(({ p }) => !p.applied)
    if ((s.applicationsLeft ?? 0) > 0 && open.length > 0) actions.push(() => applyToPosting(s, rng.pick(open).i).state)
    if (s.offers.length > 0) {
      actions.push(() => acceptOffer(s, rng.int(0, s.offers.length - 1)))
      const i = rng.int(0, s.offers.length - 1)
      if (!s.offers[i].negotiation) actions.push(() => negotiateOffer(s, i, rng.pick([...NEGOTIATION_RAISES])))
      if (!s.unemployed) actions.push(() => declineOffers(s))
    }
    if (canSpendGapYear(s)) actions.push(() => spendGapYear(s))
    if (canFoundStartup(s) && rng.chance(0.3)) actions.push(() => foundStartup(s))
    if (canOpenChickenShop(s) && rng.chance(0.05)) actions.push(() => openChickenShop(s))
    const exits = availableCareerExits(s)
    if (exits.length > 0 && rng.chance(0.02)) actions.push(() => takeCareerExit(s, rng.pick(exits).id))
    if (rng.chance(0.005)) actions.push(() => retireNow(s))
    if (!s.unemployed) actions.push(() => nextYear(s))
    if (actions.length === 0) throw new Error(`허브에서 할 수 있는 게 없어요 (${s.calendarYear}년, 실직 ${s.unemployed})`)
    s = rng.pick(actions)()
    checkState(s, '허브')
  }
  // 더 할 게 없으면 다음 해로 (실직이면 붙을 때까지 지원하고 안 되면 공백기)
  while (s.phase === 'hub') {
    if (!s.unemployed) return nextYear(s)
    const open = (s.postings ?? []).findIndex((p) => !p.applied)
    if (s.offers.length > 0) s = acceptOffer(s, 0)
    else if ((s.applicationsLeft ?? 0) > 0 && open >= 0) s = applyToPosting(s, open).state
    else if (canSpendGapYear(s)) s = spendGapYear(s)
    else throw new Error(`실직인데 출구가 없어요 (${s.calendarYear}년)`)
  }
  return s
}

function playRandom(seed: number): GameState {
  const rng = createRng(seed * 7919)
  let s = randomGame(seed)
  for (let guard = 0; guard < 200 && s.phase !== 'retired'; guard++) {
    if (s.phase === 'year_start') {
      s = startYear(s, rng.pick(focuses).id as FocusId)
      for (let ev = currentEvent(s); ev; ev = currentEvent(s)) {
        expect(`${ev.title} ${ev.text} ${ev.choices.map((c) => c.label).join(' ')}`, ev.id).not.toMatch(PLACEHOLDER)
        const res = chooseEventOption(s, rng.int(0, ev.choices.length - 1))
        expect(res.outcome.text, ev.id).not.toMatch(PLACEHOLDER)
        s = res.state
        checkState(s, `이벤트 ${ev.id}`)
      }
      s = finishYear(s)
      checkState(s, '연말')
      s = acknowledgeYear(s)
    } else if (s.phase === 'hub') {
      s = randomHub(s, rng)
    } else {
      throw new Error(`예상하지 못한 단계: ${s.phase}`)
    }
  }
  expect(s.phase, `seed ${seed} 끝나지 않음`).toBe('retired')
  return s
}

describe('무작위 플레이', () => {
  it('허브 행동을 무작위로 섞어도 상태가 깨지지 않고 끝까지 간다', () => {
    const endings = new Set<string>()
    for (let seed = 1; seed <= Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.FUZZ_GAMES ?? 120); seed++) {
      const s = playRandom(seed)
      const result = endingResult(s)
      expect(validResult(JSON.parse(JSON.stringify(result))), `seed ${seed} 공유 결과`).toBe(true)
      expect(result.timeline, `seed ${seed}`).toHaveLength(s.history.length)
      endings.add(endingFor(s.retirement!).key)
    }
    // 여러 엔딩이 실제로 나온다
    expect(endings.size).toBeGreaterThan(2)
  }, 120_000)
})
