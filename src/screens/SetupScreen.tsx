// 캐릭터 생성 4단계: 기본 정보 → 학력 → 분야·스타일 → 첫 취업(공채 지원 → 결과 → 입사할 회사 선택)

import { useEffect, useMemo, useState } from 'react'
import {
  companyTypeById,
  companyTypes,
  educations,
  FIRST_JOB,
  industries,
  playStyles,
  specialties,
  START_AGE_MAX,
  START_AGE_MIN,
  statLabels,
} from '../data'
import {
  applyFirstJobs,
  canPrepareAnotherYear,
  FIRST_JOB_STAGES,
  FIRST_JOB_STAGE_LABELS,
  formatSalary,
  isSafetyType,
  prepareAnotherYear,
  startingStats,
  type CompanyTypeId,
  type FirstJobResult,
  type IndustryId,
  type Profile,
  type StatKey,
} from '../engine'
import { useGame } from '../store/game'
import { Badge, Button, Choice, Progress, Screen, StatBars, Title } from '../ui'

const AVATARS = ['🧑', '👩', '👨', '🧔', '👱', '👧', '🧓', '🤓', '🐱', '🐶', '🦊', '🐼']
const RANDOM_NAMES = ['김커밋', '이머지', '박배포', '최리뷰', '정디버그', '강핫픽스', '조롤백', '윤스프린트', '장레거시', '한푸시']
const FOCUSABLE: StatKey[] = ['coding', 'design', 'communication', 'domain']

/** 회사 문턱(hiringBar)을 별 1~5개로. 합격 확률 자체는 보여주지 않는다 */
function difficultyStars(hiringBar: number): string {
  const stars = Math.min(5, Math.max(1, Math.round(hiringBar / 14)))
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

export function SetupScreen({ onBack, onStarted }: { onBack: () => void; onStarted: () => void }) {
  const newGame = useGame((s) => s.newGame)
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>({
    name: '',
    emoji: AVATARS[0],
    startAge: 25,
    education: 'local_cs',
    specialty: 'backend',
    playStyle: 'builder',
    focusStats: [],
  })
  const [companyType, setCompanyType] = useState<CompanyTypeId | null>(null)
  // 첫 취업: 지원할 회사(최대 3곳) → 결과 → 입사할 회사
  const [hiringSeed] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0] || 1)
  const [picks, setPicks] = useState<CompanyTypeId[]>([])
  const [results, setResults] = useState<FirstJobResult[] | null>(null)
  const [revealed, setRevealed] = useState(0)
  const allRevealed = results !== null && revealed >= results.length
  const [industry, setIndustry] = useState<IndustryId>('b2b_saas')

  // 회사 유형마다 가능한 업종이 다르다. 유형을 바꾸면 업종도 맞는 것으로 옮긴다
  const pickCompanyType = (type: CompanyTypeId) => {
    setCompanyType(type)
    const allowed = companyTypeById[type].industries
    if (!allowed.includes(industry)) setIndustry(allowed[0])
  }

  const patch = (p: Partial<Profile>) => setProfile((prev) => ({ ...prev, ...p }))
  const stats = useMemo(() => startingStats(profile), [profile])

  const canNext = [
    profile.name.trim().length > 0,
    true,
    profile.focusStats.length > 0,
    results === null ? picks.length > 0 : companyType !== null,
  ][step]

  const next = () => {
    if (step < 3) {
      // 학력·스타일이 바뀌면 합격 가능성도 바뀌므로 지원은 처음부터 다시
      if (step === 2) resetHiring()
      setStep(step + 1)
      window.scrollTo(0, 0)
    } else if (results === null) {
      setResults(applyFirstJobs(profile, picks, hiringSeed))
      setRevealed(0)
      window.scrollTo(0, 0)
    } else if (companyType) {
      newGame({ profile: { ...profile, name: profile.name.trim() }, companyType, industry })
      onStarted()
    }
  }

  const back = () => (step === 0 ? onBack() : setStep(step - 1))

  const resetHiring = () => {
    setPicks([])
    setResults(null)
    setRevealed(0)
    setCompanyType(null)
  }

  const togglePick = (type: CompanyTypeId) =>
    setPicks((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : prev.length < FIRST_JOB.applications ? [...prev, type] : prev))

  // 결과는 회사별로 한 줄씩 차례로 보여준다
  useEffect(() => {
    if (results === null || revealed >= results.length) return
    const timer = setTimeout(() => setRevealed((n) => n + 1), 700)
    return () => clearTimeout(timer)
  }, [results, revealed])

  // 취업 준비 1년: 나이를 먹고 코딩이 조금 오른 뒤 다음 공채에 다시 지원한다
  const prepareOneMoreYear = () => {
    setProfile((prev) => prepareAnotherYear(prev))
    resetHiring()
    window.scrollTo(0, 0)
  }

  const footerLabel = step < 3 ? '다음' : results === null ? `지원하기 (${picks.length}/${FIRST_JOB.applications})` : '첫 출근하기'
  const accepted = (results ?? []).filter((r) => !r.failedAt).map((r) => r.type)
  const canJoin = [...accepted, ...FIRST_JOB.safetyTypes.filter((t) => !accepted.includes(t))]

  return (
    <Screen
      footer={
        <Button onClick={next} disabled={!canNext || (step === 3 && results !== null && !allRevealed)}>
          {footerLabel}
        </Button>
      }
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="-ml-2 p-2 text-xl" aria-label="뒤로">
          ←
        </button>
        <Progress step={step} total={4} />
        <span className="w-9" />
      </div>

      {step === 0 && (
        <>
          <Title eyebrow="나의 개발 인생을 시작해요">어떤 개발자로 살아볼까요?</Title>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-600">이름</span>
            <div className="flex gap-2">
              <input
                value={profile.name}
                maxLength={10}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="이름을 입력해요"
                className="min-w-0 flex-1 rounded-2xl bg-gray-50 px-4 py-3.5 text-base outline-none ring-blue-500 focus:ring-2"
              />
              <button
                type="button"
                onClick={() => patch({ name: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] })}
                className="shrink-0 rounded-2xl bg-gray-100 px-4 text-sm font-medium active:bg-gray-200"
              >
                랜덤
              </button>
            </div>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-600">모습</span>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => patch({ emoji: a })}
                  className={`aspect-square rounded-2xl text-2xl transition ${profile.emoji === a ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-gray-50'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-sm font-medium text-gray-600">
              <span>첫 출근 나이</span>
              <span className="text-gray-900">{profile.startAge}세</span>
            </span>
            <input
              type="range"
              min={START_AGE_MIN}
              max={START_AGE_MAX}
              value={profile.startAge}
              onChange={(e) => patch({ startAge: Number(e.target.value) })}
              className="accent-blue-500"
            />
            <span className="text-xs text-gray-500">늦게 시작할수록 소통·도메인이 조금 높아요.</span>
          </label>
        </>
      )}

      {step === 1 && (
        <>
          <Title eyebrow={`${profile.emoji} ${profile.name}`}>어디서 공부했나요?</Title>
          <div className="flex flex-col gap-2">
            {educations.map((e) => (
              <Choice key={e.id} selected={profile.education === e.id} onClick={() => patch({ education: e.id })}>
                <p className="font-semibold">
                  {e.emoji} {e.label}
                </p>
                <p className="text-sm text-gray-500">{e.description}</p>
              </Choice>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Title eyebrow={`${profile.emoji} ${profile.name}`}>무엇을 하는 개발자인가요?</Title>

          <div className="grid grid-cols-3 gap-2">
            {specialties.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => patch({ specialty: s.id })}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-sm transition ${profile.specialty === s.id ? 'bg-blue-50 font-semibold ring-2 ring-blue-500' : 'bg-gray-50'}`}
              >
                <span className="text-2xl">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm font-medium text-gray-600">플레이 스타일 · 능력치 합은 모두 같아요</p>
          <div className="grid grid-cols-2 gap-2">
            {playStyles.map((p) => (
              <Choice key={p.id} selected={profile.playStyle === p.id} onClick={() => patch({ playStyle: p.id })}>
                <p className="font-semibold">{p.label}</p>
                <p className="text-xs text-gray-500">{p.description}</p>
              </Choice>
            ))}
          </div>

          <p className="mt-2 text-sm font-medium text-gray-600">집중해서 키울 능력치 · 최대 2개</p>
          <div className="flex flex-wrap gap-2">
            {FOCUSABLE.map((k) => {
              const on = profile.focusStats.includes(k)
              const full = !on && profile.focusStats.length >= 2
              return (
                <button
                  key={k}
                  type="button"
                  disabled={full}
                  onClick={() => patch({ focusStats: on ? profile.focusStats.filter((x) => x !== k) : [...profile.focusStats, k] })}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${on ? 'bg-blue-500 text-white' : full ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                >
                  {statLabels[k]}
                </button>
              )
            })}
          </div>

          <div className="mt-2 rounded-2xl bg-gray-50 p-4">
            <StatBars stats={stats} />
          </div>
        </>
      )}

      {step === 3 && results === null && (
        <>
          <Title eyebrow={(profile.jobPrepYears ?? 0) > 0 ? `취업 준비 ${profile.jobPrepYears}년 차 · ${profile.startAge}세` : '신입 공채 시즌이에요'}>
            어디에 지원할까요?
          </Title>
          <p className="text-sm text-gray-500">
            최대 {FIRST_JOB.applications}곳까지 지원할 수 있어요. 서류 → 인적성·코딩테스트 → 면접을 모두 통과해야 합격이에요.
          </p>
          <div className="flex flex-col gap-2">
            {companyTypes
              .filter((c) => !isSafetyType(c.id))
              .map((c) => {
                const on = picks.includes(c.id)
                const full = !on && picks.length >= FIRST_JOB.applications
                return (
                  <Choice key={c.id} selected={on} disabled={full} onClick={() => togglePick(c.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {c.emoji} {c.label}
                      </p>
                      <span className="text-xs tracking-tight text-amber-500" title="입사 난이도">
                        {difficultyStars(c.hiringBar)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      초봉 {formatSalary(c.baseSalary)}
                      {c.stockOption && ' + 스톡옵션'} · 야근 {'🔥'.repeat(c.overtime)}
                    </p>
                  </Choice>
                )
              })}
          </div>
          <p className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
            {FIRST_JOB.safetyTypes.map((t) => companyTypeById[t].label).join(', ')}는 지원하지 않아도 언제든 갈 수 있어요. 다 떨어져도 갈
            곳은 있어요.
          </p>
        </>
      )}

      {step === 3 && results !== null && (
        <>
          <Title eyebrow={`${profile.emoji} ${profile.name}`}>{allRevealed ? '결과가 나왔어요' : '결과를 기다리고 있어요…'}</Title>

          <div className="flex flex-col gap-2">
            {results.map((r, i) => {
              const c = companyTypeById[r.type]
              const shown = i < revealed
              return (
                <div key={r.type} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      {c.emoji} {c.label}
                    </p>
                    {!shown ? (
                      <span className="animate-pulse text-sm text-gray-400">전형 진행 중…</span>
                    ) : r.failedAt ? (
                      <Badge tone="red">{FIRST_JOB_STAGE_LABELS[r.failedAt]} 탈락</Badge>
                    ) : (
                      <Badge tone="green">🎉 최종 합격</Badge>
                    )}
                  </div>
                  {shown && (
                    <p className="mt-1 text-xs text-gray-500">
                      {FIRST_JOB_STAGES.slice(0, r.passed.length + (r.failedAt ? 1 : 0))
                        .map((stage) => `${FIRST_JOB_STAGE_LABELS[stage]} ${stage === r.failedAt ? '✗' : '✓'}`)
                        .join(' → ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {allRevealed && (
            <>
              <p className="mt-2 text-sm font-medium text-gray-600">
                {accepted.length > 0 ? '어디로 출근할까요?' : '이번에는 모두 떨어졌어요. 어떻게 할까요?'}
              </p>
              <div className="flex flex-col gap-2">
                {canJoin.map((type) => {
                  const c = companyTypeById[type]
                  return (
                    <Choice key={type} selected={companyType === type} onClick={() => pickCompanyType(type)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">
                          {c.emoji} {c.label}
                        </p>
                        {accepted.includes(type) ? <Badge tone="green">합격</Badge> : <Badge>전형 없이 입사</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        초봉 {formatSalary(c.baseSalary)}
                        {c.stockOption && ' + 스톡옵션'} · 야근 {'🔥'.repeat(c.overtime)}
                      </p>
                    </Choice>
                  )
                })}
              </div>

              {companyType && (
                <>
                  <p className="mt-2 text-sm font-medium text-gray-600">업종</p>
                  <div className="grid grid-cols-2 gap-2">
                    {industries
                      .filter((i) => companyTypeById[companyType].industries.includes(i.id))
                      .map((i) => (
                        <Choice key={i.id} selected={industry === i.id} onClick={() => setIndustry(i.id)}>
                          <p className="text-sm font-semibold">
                            {i.emoji} {i.label}
                          </p>
                          <p className="text-xs text-gray-500">{i.description}</p>
                        </Choice>
                      ))}
                  </div>
                </>
              )}

              {canPrepareAnotherYear(profile) && (
                <div className="mt-2 rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-semibold">🎒 1년 더 준비해서 다시 지원하기</p>
                  <p className="mt-1 text-xs text-gray-500">
                    나이를 한 살 더 먹고 코딩이 {FIRST_JOB.prepCodingGain} 올라요. 다음 공채 결과는 새로 정해져요. (최대 {FIRST_JOB.maxPrepYears}년)
                  </p>
                  <button
                    type="button"
                    onClick={prepareOneMoreYear}
                    className="mt-3 w-full rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-800 active:bg-gray-200"
                  >
                    취업 준비 1년 더 하기
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  )
}
