import { useState } from 'react'
import { achievements, companyTypeById, educationById, rankById } from '../data'
import { careerPeriodLabel, endingShareText, type EndingResult } from '../engine/career'
import { createShortResultUrl, readSharedResult } from '../engine/share'
import { formatSalary, type FameGrade, type RetireReason } from '../engine'
import { Button, Card, Screen, StatBars } from '../ui'

const REASON: Record<RetireReason, string> = {
  age: '60세, 정년을 채우고 은퇴했어요',
  voluntary: '스스로 키보드를 내려놓았어요',
  burnout: '세 번째 번아웃 끝에 업계를 떠났어요',
  startup_quit: '창업 실패 후 다른 길을 찾았어요',
}

const GRADE_STYLE: Record<FameGrade, string> = {
  S: 'from-amber-300 to-amber-500',
  A: 'from-blue-400 to-blue-600',
  B: 'from-slate-400 to-slate-600',
  C: 'from-gray-300 to-gray-400',
  D: 'from-orange-300 to-red-400',
}

export function EndingScreen({ game, onNew, shared = false }: { game: EndingResult; onNew: () => void; shared?: boolean }) {
  const r = game.retirement!
  const unlocked = new Set(game.achievements)
  const first = game.career[0]
  const career = game.career
  const [sharing, setSharing] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [manualCopy, setManualCopy] = useState('')
  const [shortUrl, setShortUrl] = useState(() => {
    const current = readSharedResult(window.location.hash)
    return shared && current.status === 'loading' ? window.location.href : ''
  })

  async function prepareShare() {
    if (sharing) return
    setSharing(true)
    setShareMessage('')
    try {
      setShortUrl(await createShortResultUrl(game, window.location.href))
      setShareMessage('짧은 링크가 준비됐어요. 링크를 복사하거나 공유할 앱을 선택해 주세요.')
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : '공유 링크를 만들지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSharing(false)
    }
  }

  async function share(copyOnly = false) {
    if (sharing || !shortUrl) return
    setSharing(true)
    setShareMessage('')
    setManualCopy('')
    try {
      const url = shortUrl
      const text = endingShareText(game)
      if (!copyOnly && navigator.share) {
        try {
          await navigator.share({ title: '커밋에서 은퇴까지 · 나의 커리어', text, url })
          setShareMessage('공유했어요.')
          return
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
        }
      }
      const content = url
      try {
        await navigator.clipboard.writeText(content)
        setShareMessage('짧은 결과 링크를 복사했어요.')
      } catch {
        setManualCopy(content)
        setShareMessage('자동 복사를 사용할 수 없어요. 아래 내용을 선택해 복사해 주세요.')
      }
    } catch {
      setShareMessage('공유 링크를 만들지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <Screen footer={<Button onClick={onNew}>{shared ? '내 게임으로 돌아가기' : '새 인생 시작하기'}</Button>}>
      {shared && <p className="text-center text-sm text-blue-600">공유받은 커리어 결과예요</p>}
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="text-6xl">{game.profile.emoji}</span>
        <p className="text-sm text-gray-500">{REASON[r.reason]}</p>
        <div className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br text-5xl font-black text-white shadow-lg ${GRADE_STYLE[r.fameGrade]}`}>
          {r.fameGrade}
        </div>
        <h1 className="text-2xl font-bold">{r.title}</h1>
        <p className="text-sm text-gray-500">명성 점수 {r.fameScore}</p>
      </div>

      <div className="flex flex-col gap-2">
        {shortUrl ? (
          <>
            <input aria-label="공유 링크" readOnly value={shortUrl} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-gray-200 p-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => share(true)} disabled={sharing}>링크 복사</Button>
              <Button variant="secondary" onClick={() => share()} disabled={sharing}>공유 앱 선택</Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={prepareShare} disabled={sharing}>
              {sharing ? '공유 링크 만드는 중…' : '결과 공유하기'}
            </Button>
            <p className="text-xs text-gray-400">공유하면 이름과 커리어 결과가 저장되어 링크를 받은 사람이 볼 수 있어요.</p>
          </>
        )}
        <p role="status" className="text-sm text-gray-500">{shareMessage}</p>
        {manualCopy && <textarea aria-label="공유할 결과" readOnly value={manualCopy} onFocus={(e) => e.currentTarget.select()} rows={8} className="w-full rounded-xl border border-gray-200 p-3 text-sm" />}
      </div>

      <Card className="grid grid-cols-2 gap-y-3 text-sm">
        <span className="text-gray-500">이름</span>
        <span className="text-right font-semibold">{game.profile.name}</span>
        <span className="text-gray-500">출발</span>
        <span className="text-right font-semibold">
          {educationById[game.profile.education].label} · {first ? companyTypeById[first.company.type].label : '-'}
        </span>
        <span className="text-gray-500">최고 직책</span>
        <span className="text-right font-semibold">{rankById[game.bestRank].label}</span>
        <span className="text-gray-500">경력</span>
        <span className="text-right font-semibold">
          {game.years}년 · 이직 {game.jobChanges}회
        </span>
        <span className="text-gray-500">마지막 연봉</span>
        <span className="text-right font-semibold">{formatSalary(game.salary)}</span>
        <span className="text-gray-500">모은 자산</span>
        <span className="text-right font-semibold">{formatSalary(Math.max(0, game.assets))}</span>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-600">최종 능력치</p>
        <StatBars stats={game.stats} />
      </Card>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-600">
          업적 {unlocked.size} / {achievements.length}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => {
            const on = unlocked.has(a.id)
            return (
              <div key={a.id} className={`rounded-2xl p-3 ${on ? 'bg-amber-50' : 'bg-gray-50 opacity-40'}`}>
                <p className="text-sm font-semibold">
                  {on ? a.emoji : '🔒'} {a.title}
                </p>
                <p className="text-xs text-gray-500">{on ? a.description : '???'}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-600">커리어 요약</p>
        <Card className="flex flex-col gap-2 text-sm">
          {career.length === 0 && <p className="text-gray-400">아직 완료한 경력이 없어요.</p>}
          {career.map((period) => (
            <div key={period.start} className="flex items-start gap-3">
              <span className="w-20 shrink-0 text-xs text-gray-400 tabular-nums">{careerPeriodLabel(period)}</span>
              <div className={`min-w-0 flex-1 ${period.gap ? 'text-gray-400' : ''}`}>
                <p className="break-words font-semibold">{period.gap ? '🎒 취업 준비' : `${companyTypeById[period.company.type].emoji} ${period.company.name}`}</p>
                <p className="text-xs text-gray-500">
                  {period.end - period.start + 1}년
                  {!period.gap && ` · ${rankById[period.firstRank].label}${period.firstRank !== period.lastRank ? ` → ${rankById[period.lastRank].label}` : ''}`}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </Screen>
  )
}
