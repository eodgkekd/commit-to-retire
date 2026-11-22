import { describe, expect, it } from 'vitest'
import {
  achievementById,
  achievements,
  companyTypes,
  events,
  feedTemplates,
  focuses,
  industries,
  playStyles,
  rankById,
  ranks,
  specialties,
  STYLE_STAT_TOTAL,
  educations,
} from './index'
import { BUILT_IN_VARS, resolveEvent } from '../engine/events'
import { createGame } from '../engine/setup'
import { placeholdersIn } from '../engine/text'
import type { EventVarDef, EventVarSource, GameEvent, Profile } from '../engine/types'

// 데이터 무결성 검사. AI가 콘텐츠를 추가해도 규칙이 깨지면 여기서 잡힌다.

function expectUniqueIds(list: { id: string }[]) {
  const ids = list.map((x) => x.id)
  expect(new Set(ids).size, `중복 id: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`).toBe(ids.length)
}

describe('데이터 무결성', () => {
  it('모든 목록의 id가 중복되지 않는다', () => {
    for (const list of [educations, specialties, playStyles, companyTypes, industries, ranks, focuses, achievements, events, feedTemplates]) {
      expectUniqueIds(list)
    }
  })

  it('플레이 스타일 능력치 합이 모두 같다', () => {
    for (const style of playStyles) {
      const sum = Object.values(style.stats).reduce((a, b) => a + b, 0)
      expect(sum, style.id).toBe(STYLE_STAT_TOTAL)
    }
  })

  it('직급 승진 경로가 끊기지 않고 신입에서 시작한다', () => {
    for (const rank of ranks) {
      if (rank.from === null) {
        expect(rank.id).toBe('newbie')
      } else {
        expect(rankById[rank.from], `${rank.id}.from`).toBeDefined()
        expect(rank.minYears).toBeGreaterThanOrEqual(rankById[rank.from].minYears)
      }
    }
  })

  it('회사 이름은 유형마다 10개 이상이고 전체에서 겹치지 않는다', () => {
    const all = companyTypes.flatMap((c) => c.names)
    for (const c of companyTypes) expect(c.names.length, c.id).toBeGreaterThanOrEqual(10)
    expect(new Set(all).size, `중복 회사 이름: ${all.filter((n, i) => all.indexOf(n) !== i)}`).toBe(all.length)
  })

  it('회사 유형마다 가능한 업종이 있고, 모든 업종은 어느 유형에선가 나온다', () => {
    for (const c of companyTypes) expect(c.industries.length, c.id).toBeGreaterThan(0)
    for (const i of industries) expect(companyTypes.some((c) => c.industries.includes(i.id)), i.id).toBe(true)
  })

  it('회사 유형과 업종 조건이 같이 걸린 이벤트는 실제로 가능한 조합이 있다', () => {
    for (const event of events) {
      const c = event.conditions
      if (!c?.companyTypes || !c.industries) continue
      const reachable = companyTypes.some((t) => c.companyTypes!.includes(t.id) && t.industries.some((i) => c.industries!.includes(i)))
      expect(reachable, event.id).toBe(true)
    }
  })

  it('회사 수치가 허용 범위 안에 있다', () => {
    for (const c of companyTypes) {
      expect(c.risk, c.id).toBeGreaterThanOrEqual(0)
      expect(c.risk, c.id).toBeLessThanOrEqual(1)
      expect(c.baseSalary, c.id).toBeGreaterThan(0)
      expect(c.names.length, c.id).toBeGreaterThan(0)
    }
  })

  describe('이벤트', () => {
    for (const event of events) {
      it(`${event.id}: 선택지마다 결과 확률 합이 1이다`, () => {
        expect(event.choices.length).toBeGreaterThanOrEqual(2)
        for (const choice of event.choices) {
          const total = choice.outcomes.reduce((a, o) => a + o.chance, 0)
          expect(total, choice.label).toBeCloseTo(1, 5)
        }
      })

      it(`${event.id}: 능력치 판정이 있는 선택지는 성공·실패 결과가 모두 있다`, () => {
        for (const choice of event.choices.filter((c) => c.check)) {
          expect(choice.outcomes.some((o) => o.tone === 'unlucky'), `${choice.label}: 실패 결과 없음`).toBe(true)
          expect(choice.outcomes.some((o) => o.tone !== 'unlucky'), `${choice.label}: 성공 결과 없음`).toBe(true)
        }
      })

      it(`${event.id}: 참조하는 업적이 존재한다`, () => {
        for (const choice of event.choices) {
          for (const outcome of choice.outcomes) {
            const id = outcome.effects.achievement
            if (id) expect(achievementById[id], id).toBeDefined()
          }
        }
      })
    }
  })

  describe('이벤트 변수·변형·심각도', () => {
    const profile: Profile = { name: '김커밋', emoji: '🤓', startAge: 26, education: 'local_cs', specialty: 'backend', playStyle: 'builder', focusStats: ['coding'] }
    const state = createGame({ profile, companyType: 'midsize', industry: 'b2b_saas', seed: 1 })
    const allTexts = (e: GameEvent) => [
      e.title,
      e.text,
      ...(e.variants ?? []).flatMap((v) => [v.title, v.text]),
      ...e.choices.flatMap((c) => [c.label, ...c.outcomes.map((o) => o.text)]),
    ]
    const sourcesOf = (def: EventVarDef): EventVarSource[] => ('bySeverity' in def ? def.bySeverity : [def])

    for (const event of events) {
      it(`${event.id}: 문구에 쓴 변수는 모두 정의돼 있고, 정의한 변수는 모두 쓰인다`, () => {
        const used = new Set(allTexts(event).flatMap(placeholdersIn))
        const defined = Object.keys(event.vars ?? {})
        for (const name of used) {
          expect([...BUILT_IN_VARS, ...defined], `{${name}}이 정의되지 않음`).toContain(name)
        }
        for (const name of defined) expect(used.has(name), `{${name}}을 정의했지만 쓰지 않음`).toBe(true)
      })

      it(`${event.id}: 변수 후보와 변형이 올바르다`, () => {
        for (const [name, def] of Object.entries(event.vars ?? {})) {
          if ('bySeverity' in def) {
            expect(event.severity, `${name}: bySeverity는 severity: true인 이벤트에서만 쓴다`).toBe(true)
            expect(def.bySeverity).toHaveLength(3)
          }
          for (const source of sourcesOf(def)) {
            if (Array.isArray(source)) {
              expect(source.length, name).toBeGreaterThan(0)
              for (const v of source) expect(v.trim().length, name).toBeGreaterThan(0)
              expect(new Set(source).size, `${name}: 중복 후보`).toBe(source.length)
            } else {
              expect(Number.isInteger(source.min) && Number.isInteger(source.max), name).toBe(true)
              expect(source.min, name).toBeLessThanOrEqual(source.max)
            }
          }
        }
        for (const v of event.variants ?? []) {
          expect(v.title.trim().length).toBeGreaterThan(0)
          expect(v.text.trim().length).toBeGreaterThan(0)
        }
      })

      it(`${event.id}: 어떤 심각도·변형·후보로 채워도 치환어나 조사 표기가 남지 않는다`, () => {
        const variants = [null, ...(event.variants ?? []).map((_, i) => i)]
        for (const severity of [1, 2, 3] as const) {
          for (const variant of variants) {
            // 후보를 앞에서부터 차례로 다 써 본다 (범위는 최솟값·최댓값)
            for (let k = 0; k < 6; k++) {
              const vars: Record<string, string> = {}
              for (const [name, def] of Object.entries(event.vars ?? {})) {
                const source = 'bySeverity' in def ? def.bySeverity[severity - 1] : def
                vars[name] = Array.isArray(source) ? source[k % source.length] : String(k % 2 ? source.max : source.min)
              }
              const resolved = resolveEvent({ id: event.id, severity, variant, vars }, state)
              // 화면에 나오는 문구만 본다 (resolved.variants는 채우기 전 원문이다)
              const shown = [resolved.title, resolved.text, ...resolved.choices.flatMap((c) => [c.label, ...c.outcomes.map((o) => o.text)])]
              for (const text of shown) {
                expect(text, text).not.toMatch(/[{}]/)
                expect(text, text).not.toMatch(/\((이|은|을|과|와|아|으)\)/)
              }
            }
          }
        }
      })
    }

    it('자주 나오는 이벤트 10개 이상에 변수가 붙어 있다', () => {
      expect(events.filter((e) => e.vars).length).toBeGreaterThanOrEqual(10)
      expect(events.filter((e) => e.severity).length).toBeGreaterThanOrEqual(5)
      expect(events.filter((e) => e.variants?.length).length).toBeGreaterThanOrEqual(5)
    })
  })

  it('반응 템플릿은 문구가 하나 이상 있다', () => {
    for (const t of feedTemplates) expect(t.texts.length, t.id).toBeGreaterThan(0)
  })
})

describe('Windows 10에서 깨지는 이모지', () => {
  // 유니코드 13 이후 이모지(🫠 🪦 🪣 등)는 Windows 10 기본 글꼴에 없어 네모로 보인다
  const NEW_EMOJI = /[\u{1FA74}\u{1FA7B}-\u{1FA7F}\u{1FA83}-\u{1FA8F}\u{1FA96}-\u{1FAFF}\u{1F972}\u{1F977}\u{1F978}\u{1F979}\u{1F6D6}-\u{1F6DF}\u{1F90C}\u{1F9A3}\u{1F9A4}\u{1F9AB}-\u{1F9AD}\u{1F9CB}\u{1F9CC}\u{1F7F0}]/u
  it('소스 코드에 쓰지 않는다', () => {
    const files = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(files).length).toBeGreaterThan(20)
    const offenders = Object.entries(files).filter(([path, text]) => !path.endsWith('data.test.ts') && NEW_EMOJI.test(text)).map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
