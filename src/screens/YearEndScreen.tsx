import { useState } from 'react'
import { events, platformLabels, rankById } from '../data'
import { formatSalary, type FeedPlatform, type FeedTrigger, type GameState, type Grade } from '../engine'
import { useGame } from '../store/game'
import { Badge, Button, Card, Screen, StatBars } from '../ui'
import { majorEvents, type MajorEventInfo } from './majorEvents'

const GRADE_STYLE: Record<Grade, string> = {
  S: 'text-amber-500',
  A: 'text-blue-500',
  B: 'text-gray-800',
  C: 'text-gray-500',
  D: 'text-red-500',
}

const TRIGGER_BADGE: Record<FeedTrigger, { text: string; tone: 'blue' | 'red' | 'green' | 'amber' | 'gray' }> = {
  promoted: { text: '🎉 승진', tone: 'blue' },
  jobChanged: { text: '💼 이직', tone: 'gray' },
  burnout: { text: '🫠 번아웃', tone: 'red' },
  companyClosed: { text: '🪦 회사 폐업', tone: 'red' },
  layoff: { text: '📉 권고사직', tone: 'red' },
  exit: { text: '💰 엑싯', tone: 'green' },
  incident: { text: '🚨 장애', tone: 'amber' },
  startupFounded: { text: '🚀 창업', tone: 'blue' },
  startupRaised: { text: '📈 투자 유치', tone: 'green' },
  startupFailed: { text: '🪂 사업 정리', tone: 'red' },
  startupExit: { text: '🦄 회사 매각', tone: 'green' },
}

const PLATFORM_STYLE: Record<FeedPlatform, string> = {
  blinder: 'bg-rose-500',
  okko: 'bg-indigo-500',
  jobplanet: 'bg-emerald-500',
  linkedout: 'bg-sky-600',
  github: 'bg-gray-800',
}

const eventTitle = Object.fromEntries(events.map((e) => [e.id, `${e.emoji} ${e.title}`]))

export function YearEndScreen({ game }: { game: GameState }) {
  const acknowledge = useGame((s) => s.acknowledgeYear)
  const record = game.history[game.history.length - 1]
  const raise = record.salaryAfter - record.salaryBefore
  const raisePct = Math.round((raise / record.salaryBefore) * 100)
  const major = majorEvents(record, game)
  const [popupClosed, setPopupClosed] = useState(false)
  const showPopup = major.length > 0 && !popupClosed

  return (
    <Screen footer={<Button onClick={acknowledge}>{game.retirement ? '은퇴식으로' : '확인'}</Button>}>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-gray-500">
          {record.calendarYear}년 · {record.age}세 · {record.founder ? `${record.company.name} 대표` : rankById[record.rank].label}
        </p>
        <h1 className="text-2xl font-bold">
          {record.founder ? '올해 사업 성적은' : '올해 고과는'} <span className={`text-4xl font-black ${GRADE_STYLE[record.grade]}`}>{record.grade}</span>
        </h1>
      </header>

      {record.triggers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {record.triggers.map((t) => (
            <Badge key={t} tone={TRIGGER_BADGE[t].tone}>
              {TRIGGER_BADGE[t].text}
            </Badge>
          ))}
        </div>
      )}

      {major.map((m) => (
        <Card key={m.trigger} className={m.tone === 'bad' ? 'bg-red-50' : 'bg-emerald-50'}>
          <p className={`font-semibold ${m.tone === 'bad' ? 'text-red-600' : 'text-emerald-700'}`}>
            {m.emoji} {m.title}
          </p>
          <p className={`text-sm ${m.tone === 'bad' ? 'text-red-500' : 'text-emerald-700'}`}>{m.body}</p>
        </Card>
      ))}

      <Card className="flex flex-col gap-1">
        <p className="text-sm text-gray-500">연봉</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatSalary(record.salaryBefore)} → {formatSalary(record.salaryAfter)}
          <span className={`ml-2 text-sm ${raise > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {raise > 0 ? (record.salaryBefore > 0 ? `+${raisePct}%` : '첫 월급') : '동결'}
          </span>
        </p>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-600">능력치 변화</p>
        <StatBars stats={record.statsAfter} before={record.statsBefore} />
      </Card>

      {record.events.length > 0 && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-600">올해 있었던 일</p>
          {record.events.map((e) => (
            <div key={e.eventId}>
              <p className="text-sm font-semibold">{e.title ?? eventTitle[e.eventId]}</p>
              <p className="text-sm text-gray-600">{e.outcomeText}</p>
            </div>
          ))}
        </Card>
      )}

      {record.feed.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-600">커뮤니티 반응</p>
          {record.feed.map((post, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-bold text-white ${PLATFORM_STYLE[post.platform]}`}>
                  {platformLabels[post.platform]}
                </span>
                <span className="text-gray-500">{post.author}</span>
              </div>
              <p className="text-sm leading-relaxed">{post.text}</p>
              <p className="mt-2 text-xs text-gray-400">♥ {post.likes}</p>
            </div>
          ))}
          <p className="text-center text-xs text-gray-400">실제 커뮤니티를 패러디한 게임 속 가상 반응이에요</p>
        </section>
      )}

      {showPopup && <MajorEventSheet events={major} onClose={() => setPopupClosed(true)} />}
    </Screen>
  )
}

/** 실직·엑싯·번아웃처럼 놓치면 안 되는 사건을 화면에 들어오자마자 알려준다 */
function MajorEventSheet({ events, onClose }: { events: MajorEventInfo[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p className="mb-4 text-sm text-gray-500">올해 큰일이 있었어요</p>
        <div className="mb-6 flex flex-col gap-5">
          {events.map((m) => (
            <div key={m.trigger} className="flex gap-3">
              <span className="text-4xl leading-none">{m.emoji}</span>
              <div>
                <p className={`text-lg font-bold ${m.tone === 'bad' ? 'text-red-600' : 'text-emerald-700'}`}>{m.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{m.body}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={onClose}>확인했어요</Button>
      </div>
    </div>
  )
}
