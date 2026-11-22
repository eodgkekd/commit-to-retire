import { describe, expect, it } from 'vitest'
import { companyTypes, educations, FIRST_JOB, playStyles } from '../data'
import {
  applyFirstJobs,
  canPrepareAnotherYear,
  FIRST_JOB_STAGES,
  firstJobFinalChance,
  firstJobStageChance,
  isSafetyType,
  prepareAnotherYear,
} from './firstJob'
import type { CompanyTypeId, Profile } from './types'

const local: Profile = {
  name: '테스트',
  emoji: '🤓',
  startAge: 25,
  education: 'local_cs',
  specialty: 'backend',
  playStyle: 'builder',
  focusStats: ['coding'],
}
const top: Profile = { ...local, education: 'top_cs' }

describe('첫 취업 합격 확률', () => {
  it('모든 프로필·회사·단계의 확률이 허용 범위 안이다', () => {
    for (const edu of educations) for (const style of playStyles) for (const c of companyTypes) for (const stage of FIRST_JOB_STAGES) {
      const p = firstJobStageChance({ ...local, education: edu.id, playStyle: style.id }, c.id, stage)
      if (isSafetyType(c.id)) expect(p).toBe(1)
      else {
        expect(p).toBeGreaterThanOrEqual(FIRST_JOB.minChance)
        expect(p).toBeLessThanOrEqual(FIRST_JOB.maxChance)
      }
    }
  })

  it('지방대 컴공 기준 최종 합격률이 기획한 범위에 든다', () => {
    expect(firstJobFinalChance(local, 'midsize')).toBeGreaterThan(0.3)
    expect(firstJobFinalChance(local, 'midsize')).toBeLessThan(0.5)
    expect(firstJobFinalChance(local, 'chaebol_si')).toBeGreaterThan(0.1)
    expect(firstJobFinalChance(local, 'chaebol_si')).toBeLessThan(0.22)
    expect(firstJobFinalChance(local, 'chaebol')).toBeGreaterThan(0.02)
    expect(firstJobFinalChance(local, 'chaebol')).toBeLessThan(0.08)
  })

  it('명문대는 어느 회사든 지방대보다 서류가 잘 붙는다 (지역 인재 전형 제외)', () => {
    for (const c of companyTypes) {
      if (isSafetyType(c.id) || c.id === FIRST_JOB.regionalBonus.companyType) continue
      expect(firstJobStageChance(top, c.id, 'resume'), c.id).toBeGreaterThanOrEqual(firstJobStageChance(local, c.id, 'resume'))
    }
  })

  it('지방대 컴공은 금융권·공공 서류에 가산점을 받는다', () => {
    const other: Profile = { ...local, education: 'bootcamp' }
    const diffPublic = firstJobStageChance(local, 'finance_public', 'resume') - firstJobStageChance(other, 'finance_public', 'resume')
    const diffChaebol = firstJobStageChance(local, 'chaebol', 'resume') - firstJobStageChance(other, 'chaebol', 'resume')
    expect(diffPublic).toBeGreaterThan(diffChaebol + 0.1)
  })

  it('취업 준비를 1년 더 하면 코딩테스트를 보는 회사의 합격률이 오른다', () => {
    expect(firstJobFinalChance(prepareAnotherYear(local), 'bigtech')).toBeGreaterThan(firstJobFinalChance(local, 'bigtech'))
  })
})

describe('첫 취업 지원', () => {
  const picks: CompanyTypeId[] = ['chaebol', 'midsize', 'seed']

  it('같은 시드면 결과가 같고, 지원 조합을 바꿔도 같은 회사의 결과는 바뀌지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = applyFirstJobs(local, picks, seed)
      expect(applyFirstJobs(local, picks, seed)).toEqual(a)
      const b = applyFirstJobs(local, ['midsize', 'bigtech', 'chaebol'], seed)
      expect(b.find((r) => r.type === 'midsize')).toEqual(a.find((r) => r.type === 'midsize'))
      expect(b.find((r) => r.type === 'chaebol')).toEqual(a.find((r) => r.type === 'chaebol'))
    }
  })

  it('전형 없는 회사는 항상 합격한다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const r of applyFirstJobs(local, FIRST_JOB.safetyTypes, seed)) expect(r.failedAt).toBeNull()
    }
  })

  it('실제 합격 빈도가 계산한 확률과 비슷하다', () => {
    const n = 4000
    let passed = 0
    for (let seed = 1; seed <= n; seed++) if (!applyFirstJobs(local, ['midsize'], seed)[0].failedAt) passed++
    expect(Math.abs(passed / n - firstJobFinalChance(local, 'midsize'))).toBeLessThan(0.03)
  })

  it('떨어진 단계 뒤는 통과로 기록하지 않는다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const r of applyFirstJobs(local, picks, seed)) {
        if (r.failedAt) expect(r.passed).toEqual(FIRST_JOB_STAGES.slice(0, FIRST_JOB_STAGES.indexOf(r.failedAt)))
        else expect(r.passed).toEqual([...FIRST_JOB_STAGES])
      }
    }
  })

  it('세 곳을 넘겨 지원할 수 없다', () => {
    expect(() => applyFirstJobs(local, ['chaebol', 'midsize', 'seed', 'bigtech'], 1)).toThrow()
  })

  it('취업 준비는 2년까지만 할 수 있고, 해마다 나이를 먹는다', () => {
    const one = prepareAnotherYear(local)
    expect(one.startAge).toBe(local.startAge + 1)
    const two = prepareAnotherYear(one)
    expect(canPrepareAnotherYear(two)).toBe(false)
    expect(() => prepareAnotherYear(two)).toThrow()
  })

  it('다음 해 공채는 결과가 새로 정해진다', () => {
    let different = 0
    for (let seed = 1; seed <= 40; seed++) {
      const a = applyFirstJobs(local, picks, seed)
      const b = applyFirstJobs({ ...local, jobPrepYears: 1 }, picks, seed)
      if (JSON.stringify(a) !== JSON.stringify(b)) different++
    }
    expect(different).toBeGreaterThan(10)
  })
})
