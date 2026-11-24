import { describe, expect, it } from 'vitest'
import { EVENT_COOLDOWN_YEARS, events } from '../data'
import { playToEnd, randomGame } from './bot'
import { pendingId, resolveEvent, rollInstance, scaleEffects } from './events'
import { createRng } from './rng'
import { createGame } from './setup'
import type { GameState, Profile, Severity } from './types'
import { chooseEventOption, currentEvent, finishYear, isEligible, remainingEvents, startYear } from './year'

const profile: Profile = {
  name: '테스트',
  emoji: '🤓',
  startAge: 26,
  education: 'local_cs',
  specialty: 'backend',
  playStyle: 'builder',
  focusStats: ['coding', 'design'],
}

const game = (seed = 1) => createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed })

describe('이벤트 반복 방지', () => {
  it('한 번 나온 이벤트는 3년 동안 다시 나오지 않는다', () => {
    let repeats = 0
    let total = 0
    for (let seed = 1; seed <= 40; seed++) {
      const s = playToEnd(randomGame(seed), 'random', seed)
      const lastSeen: Record<string, number> = {}
      for (const record of s.history) {
        for (const e of record.events) {
          total += 1
          if (lastSeen[e.eventId] !== undefined && record.calendarYear - lastSeen[e.eventId] <= EVENT_COOLDOWN_YEARS) repeats += 1
          lastSeen[e.eventId] = record.calendarYear
        }
      }
    }
    expect(total).toBeGreaterThan(1000)
    expect(repeats).toBe(0)
  })

  it('한 판에서 같은 이벤트를 보는 횟수가 줄었다', () => {
    const worst: number[] = []
    for (let seed = 1; seed <= 40; seed++) {
      const s = playToEnd(randomGame(seed), 'random', seed)
      const counts: Record<string, number> = {}
      for (const e of s.history.flatMap((r) => r.events)) counts[e.eventId] = (counts[e.eventId] ?? 0) + 1
      worst.push(Math.max(...Object.values(counts)))
    }
    // 쿨다운 전에는 평균 5.9회였다
    expect(worst.reduce((a, b) => a + b, 0) / worst.length).toBeLessThan(4.5)
  })

  it('후보가 전부 최근에 본 이벤트여도 가장 오래된 것이 나온다', () => {
    const base = game()
    const eligible = events.filter((e) => isEligible(e, base))
    const eventLastSeen = Object.fromEntries(eligible.map((e) => [e.id, base.calendarYear - 1]))
    const oldest = eligible[3].id
    eventLastSeen[oldest] = base.calendarYear - 2
    for (let seed = 1; seed <= 20; seed++) {
      const s = startYear({ ...base, rngState: seed, eventLastSeen }, 'study')
      expect(s.pendingEvents.length).toBeGreaterThan(0)
      expect(pendingId(s.pendingEvents[0])).toBe(oldest)
    }
  })

  it('예전 세이브(기록 없음)에서도 이벤트가 뽑히고 기록이 시작된다', () => {
    const old = { ...game() } as GameState
    delete old.eventLastSeen
    const s = startYear(old, 'study')
    expect(s.pendingEvents.length).toBeGreaterThan(0)
    expect(Object.keys(s.eventLastSeen!)).toEqual(s.pendingEvents.map(pendingId))
  })
})

describe('이벤트 장면 (심각도·변수·변형)', () => {
  const inEvent = (pending: GameState['pendingEvents'], seed = 1): GameState => ({ ...game(seed), phase: 'event', focus: 'study', pendingEvents: pending })
  const scene = (severity: Severity, vars: Record<string, string> = { hour: '18', change: '쿠폰 기능' }) =>
    resolveEvent({ id: 'friday_deploy', severity, variant: null, vars }, game())

  it('심각할수록 같은 결과의 체력 변화가 커진다', () => {
    const rollback = (severity: Severity) => scene(severity).choices[0].outcomes[1].effects
    expect(rollback(1).stamina).toBe(-12)
    expect(rollback(2).stamina).toBe(-20)
    expect(rollback(3).stamina).toBe(-30)
    expect(rollback(3).stats!.reputation).toBe(-3)
    // 업적·카운터는 그대로다
    expect(rollback(1).achievement).toBe('weekend_rollback')
    expect(rollback(3).counters).toEqual({ incidents: 1 })
  })

  it('작은 수치가 0이 되어 사라지지는 않는다', () => {
    expect(scaleEffects({ stats: { domain: 1 }, stamina: -1, gradeBonus: 1 }, 1)).toEqual({ stats: { domain: 1 }, stamina: -1, gradeBonus: 1 })
    expect(scaleEffects({ salaryPct: 0.1, assets: 3000 }, 3)).toEqual({ salaryPct: 0.1, assets: 3000 })
  })

  it('심각할수록 실패 결과가 더 자주 나온다', () => {
    const failRate = (severity: Severity) => {
      let failed = 0
      for (let seed = 1; seed <= 400; seed++) {
        const s = inEvent([{ id: 'friday_deploy', severity, variant: null, vars: { hour: '18', change: '쿠폰 기능' } }], seed)
        if (chooseEventOption(s, 0).outcome.tone === 'unlucky') failed += 1
      }
      return failed / 400
    }
    expect(failRate(3)).toBeGreaterThan(failRate(1) + 0.05)
  })

  it('심각도에 맞는 후보에서 변수를 뽑고, 문구에 채워 넣는다', () => {
    const event = events.find((e) => e.id === 'friday_deploy')!
    const def = event.vars!.change as { bySeverity: string[][] }
    for (let seed = 1; seed <= 60; seed++) {
      const instance = rollInstance(event, game(), createRng(seed))
      expect(def.bySeverity[instance.severity - 1]).toContain(instance.vars.change)
      const resolved = resolveEvent(instance, game())
      expect(resolved.rolledSeverity).toBe(instance.severity)
      expect(`${resolved.title} ${resolved.text}`).toContain(instance.vars.change)
      expect(`${resolved.title} ${resolved.text}`).not.toMatch(/[{}]/)
    }
  })

  it('세 가지 심각도와 여러 장면이 실제로 나온다', () => {
    const event = events.find((e) => e.id === 'friday_deploy')!
    const instances = Array.from({ length: 200 }, (_, i) => rollInstance(event, game(), createRng(i + 1)))
    expect(new Set(instances.map((i) => i.severity))).toEqual(new Set([1, 2, 3]))
    expect(new Set(instances.map((i) => i.variant)).size).toBe(event.variants!.length + 1)
    expect(new Set(instances.map((i) => resolveEvent(i, game()).text)).size).toBeGreaterThan(10)
  })

  it('{boss}는 직급에 따라 상사 호칭이 바뀐다 (팀장급에게 팀장이 시키는 일이 없다)', () => {
    const vars = { change: '버튼 색', hour: '5' }
    const text = (rank: GameState['rank']) => resolveEvent({ id: 'friday_deploy', severity: 2, variant: null, vars }, { ...game(), rank }).text
    expect(text('junior')).toContain('팀장이')
    expect(text('lead')).toContain('본부장이')
    expect(text('director')).toContain('상무가')
    expect(text('lead')).not.toContain('팀장')
  })

  it('조건이 붙은 변형은 조건이 맞을 때만 나온다', () => {
    const event = events.find((e) => e.id === 'spec_change_d3')!
    const clientVariant = event.variants!.findIndex((v) => v.conditions?.industries)
    const variantsAt = (industry: 'b2b_saas' | 'si_sm') => {
      const s = { ...game(), company: { ...game().company, industry } }
      return new Set(Array.from({ length: 200 }, (_, i) => rollInstance(event, s, createRng(i + 1)).variant))
    }
    expect(variantsAt('b2b_saas').has(clientVariant)).toBe(false)
    expect(variantsAt('si_sm').has(clientVariant)).toBe(true)
  })

  it('심각도를 굴리지 않는 이벤트는 효과가 그대로고 심각도 표시가 없다', () => {
    const plain = events.find((e) => !e.severity && !e.vars && !e.variants)!
    const instance = rollInstance(plain, game(), createRng(1))
    expect(instance).toEqual({ id: plain.id, severity: 2, variant: null, vars: {} })
    const resolved = resolveEvent(instance, game())
    expect(resolved.rolledSeverity).toBeNull()
    expect(resolved.choices.map((c) => c.outcomes.map((o) => o.effects))).toEqual(plain.choices.map((c) => c.outcomes.map((o) => o.effects)))
  })

  it('굴린 값은 상태에 저장되어 같은 상태면 같은 장면이 나온다', () => {
    const a = startYear(game(7), 'study')
    const b = startYear(game(7), 'study')
    expect(a.pendingEvents).toEqual(b.pendingEvents)
    expect(currentEvent(a)).toEqual(currentEvent(JSON.parse(JSON.stringify(a))))
    for (const p of a.pendingEvents) expect(typeof p).toBe('object')
  })

  it('예전 세이브의 문자열 항목도 기본값으로 채워져 진행된다', () => {
    const old = inEvent(['friday_deploy', 'kkondae_pm'])
    const event = currentEvent(old)!
    expect(event.id).toBe('friday_deploy')
    expect(event.rolledSeverity).toBe(2)
    expect(`${event.title} ${event.text}`).not.toMatch(/[{}]/)
    expect(remainingEvents(old)).toBe(2)

    const next = chooseEventOption(old, 0).state
    expect(next.pendingEvents).toEqual(['kkondae_pm'])
    expect(currentEvent(next)!.title).not.toMatch(/[{}]/)
    const done = chooseEventOption(next, 1).state
    expect(remainingEvents(done)).toBe(0)
    expect(() => finishYear(done)).not.toThrow()
  })

  it('연말 기록에 그때 보인 제목과 심각도가 남는다', () => {
    const s = inEvent([{ id: 'friday_deploy', severity: 3, variant: 0, vars: { hour: '19', change: '결제 모듈 교체' } }])
    const entry = chooseEventOption(s, 0).state.yearEvents[0]
    expect(entry.title).toBe('🚨 연휴 전날 배포')
    expect(entry.severity).toBe(3)
    expect(entry.outcomeText).not.toMatch(/[{}]/)

    const plain = chooseEventOption(inEvent(['kkondae_pm']), 1).state.yearEvents[0]
    expect(plain.title).toMatch(/^🙄 "/)
    expect(plain.severity).toBeUndefined()
  })

  it('봇이 돌린 판의 모든 기록에 풀리지 않은 치환어가 없다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = playToEnd(randomGame(seed), 'random', seed)
      for (const e of s.history.flatMap((r) => r.events)) {
        expect(`${e.title} ${e.outcomeText}`, e.eventId).not.toMatch(/[{}]|\((이|은|을|과|와|아|으)\)/)
      }
    }
  })
})

describe('주력 분야', () => {
  const SPECIALTIES = ['backend', 'frontend', 'mobile', 'data_ai', 'infra', 'game'] as const
  const withSpecialty = (specialty: (typeof SPECIALTIES)[number]): GameState => {
    const g = game()
    return { ...g, profile: { ...g.profile, specialty } }
  }
  const instance = (id: string) => rollInstance(events.find((e) => e.id === id)!, game(), createRng(1))

  it('분야 전용 선택지는 그 분야인 사람에게만 보인다', () => {
    const labels = (specialty: (typeof SPECIALTIES)[number]) => resolveEvent(instance('dawn_db_lock'), withSpecialty(specialty)).choices.map((c) => c.label)
    expect(labels('backend')).toContain('쿼리 실행 계획부터 뜯어본다')
    expect(labels('frontend')).not.toContain('쿼리 실행 계획부터 뜯어본다')
    expect(labels('data_ai')).toContain('새벽 배치 집계 쿼리가 범인인지 확인한다')
  })

  it('어느 분야로 보든 모든 이벤트에 선택지가 2개 이상 있다', () => {
    for (const specialty of SPECIALTIES) {
      for (const e of events) {
        const visible = e.choices.filter((c) => !c.specialties || c.specialties.includes(specialty))
        expect(visible.length, `${e.id} (${specialty})`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('분야마다 전용 이벤트가 3개 이상, 전용 선택지가 4개 이상 있다', () => {
    for (const specialty of SPECIALTIES) {
      const ownEvents = events.filter((e) => e.conditions?.specialties?.includes(specialty))
      const ownChoices = events.flatMap((e) => e.choices).filter((c) => c.specialties?.includes(specialty))
      expect(ownEvents.length, specialty).toBeGreaterThanOrEqual(3)
      expect(ownChoices.length, specialty).toBeGreaterThanOrEqual(4)
    }
  })

  it('분야 전용 선택지를 고르면 그 선택지의 결과가 나온다 (걸러진 목록 기준 번호)', () => {
    const s: GameState = { ...withSpecialty('backend'), phase: 'event', focus: 'study', pendingEvents: [instance('dawn_db_lock')] }
    const resolved = resolveEvent(instance('dawn_db_lock'), s)
    const index = resolved.choices.findIndex((c) => c.specialties)
    const { outcome } = chooseEventOption(s, index)
    expect(resolved.choices[index].outcomes.map((o) => o.text)).toContain(outcome.text)
  })
})
