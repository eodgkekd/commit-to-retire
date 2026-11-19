// 캐릭터 생성 4단계: 기본 정보 → 학력 → 분야·스타일 → 첫 회사

import { useMemo, useState } from 'react'
import {
  companyTypeById,
  educations,
  industries,
  playStyles,
  specialties,
  START_AGE_MAX,
  START_AGE_MIN,
  statLabels,
} from '../data'
import { firstJobOptions, formatSalary, startingStats, type CompanyTypeId, type IndustryId, type Profile, type StatKey } from '../engine'
import { useGame } from '../store/game'
import { Badge, Button, Choice, Progress, Screen, StatBars, Title } from '../ui'

const AVATARS = ['🧑', '👩', '👨', '🧔', '👱', '👧', '🧓', '🤓', '🐱', '🐶', '🦊', '🐼']
const RANDOM_NAMES = ['김커밋', '이머지', '박배포', '최리뷰', '정디버그', '강핫픽스', '조롤백', '윤스프린트', '장레거시', '한푸시']
const FOCUSABLE: StatKey[] = ['coding', 'design', 'communication', 'domain']

export function SetupScreen({ onBack }: { onBack: () => void }) {
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
  const [industry, setIndustry] = useState<IndustryId>('b2b_saas')

  const patch = (p: Partial<Profile>) => setProfile((prev) => ({ ...prev, ...p }))
  const jobOptions = useMemo(() => firstJobOptions(profile), [profile])
  const stats = useMemo(() => startingStats(profile), [profile])

  const canNext = [
    profile.name.trim().length > 0,
    true,
    profile.focusStats.length > 0,
    companyType !== null,
  ][step]

  const next = () => {
    if (step < 3) {
      // 학력·스타일이 바뀌면 서류 결과도 바뀌므로 회사 선택은 다시
      if (step === 2) setCompanyType(null)
      setStep(step + 1)
      window.scrollTo(0, 0)
    } else if (companyType) {
      newGame({ profile: { ...profile, name: profile.name.trim() }, companyType, industry })
    }
  }

  const back = () => (step === 0 ? onBack() : setStep(step - 1))

  return (
    <Screen
      footer={
        <Button onClick={next} disabled={!canNext}>
          {step < 3 ? '다음' : '첫 출근하기'}
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

      {step === 3 && (
        <>
          <Title eyebrow="서류 결과가 나왔어요">첫 회사를 골라요</Title>
          <div className="flex flex-col gap-2">
            {jobOptions
              .slice()
              .sort((a, b) => Number(b.passed) - Number(a.passed))
              .map((o) => {
                const c = companyTypeById[o.type]
                return (
                  <Choice key={o.type} selected={companyType === o.type} disabled={!o.passed} onClick={() => setCompanyType(o.type)}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {c.emoji} {c.label}
                      </p>
                      {c.hiddenFor ? <Badge tone="amber">🤫 히든 루트</Badge> : o.passed ? <Badge tone="green">서류 합격</Badge> : <Badge>서류 탈락</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      초봉 {formatSalary(c.baseSalary)}
                      {c.stockOption && ' + 스톡옵션'} · 야근 {'🔥'.repeat(c.overtime)}
                    </p>
                  </Choice>
                )
              })}
          </div>

          <p className="mt-2 text-sm font-medium text-gray-600">업종</p>
          <div className="grid grid-cols-2 gap-2">
            {industries.map((i) => (
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
    </Screen>
  )
}
