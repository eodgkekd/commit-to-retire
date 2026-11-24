import { currentEvent, remainingEvents, type GameState } from '../engine'
import { specialtyById } from '../data'
import { useGame } from '../store/game'
import { Badge, Button, Choice, EffectChips, FirstTimeTip, Screen, StatusHeader } from '../ui'

/** 심각도는 보여준다 (확률은 숨기되, 일이 얼마나 큰지는 알고 고르게) */
const SEVERITY_LABEL = {
  1: { text: '가벼운 일', tone: 'green' },
  2: { text: '보통 일', tone: 'gray' },
  3: { text: '큰일', tone: 'red' },
} as const

const TONE_LABEL = {
  lucky: { text: '운이 좋았어요', tone: 'green' },
  unlucky: { text: '운이 나빴어요', tone: 'red' },
  skill: { text: '실력으로 해냈어요', tone: 'blue' },
} as const

export function EventScreen({ game }: { game: GameState }) {
  const lastOutcome = useGame((s) => s.lastOutcome)
  const choose = useGame((s) => s.choose)
  const continueAfterOutcome = useGame((s) => s.continueAfterOutcome)

  // 결과 문구 보여주기
  if (lastOutcome) {
    const tone = lastOutcome.tone ? TONE_LABEL[lastOutcome.tone] : null
    const remaining = remainingEvents(game)
    return (
      <Screen footer={<Button onClick={continueAfterOutcome}>{remaining > 0 ? '다음 일' : '올해 마무리하기'}</Button>}>
        <StatusHeader game={game} />
        <div className="flex flex-1 flex-col justify-center gap-4 py-8 text-center">
          {tone && (
            <div>
              <Badge tone={tone.tone}>{tone.text}</Badge>
            </div>
          )}
          <p className="text-xl font-semibold leading-relaxed">{lastOutcome.text}</p>
          <EffectChips effects={lastOutcome.effects} />
        </div>
      </Screen>
    )
  }

  const event = currentEvent(game)
  if (!event) {
    // 이벤트가 하나도 안 뽑힌 해
    return (
      <Screen footer={<Button onClick={continueAfterOutcome}>올해 마무리하기</Button>}>
        <StatusHeader game={game} />
        <p className="py-12 text-center text-lg text-gray-600">조용히 지나간 한 해였어요.</p>
      </Screen>
    )
  }

  return (
    <Screen>
      <StatusHeader game={game} />

      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-center gap-2">
          <Badge>{event.category}</Badge>
          {event.rolledSeverity && <Badge tone={SEVERITY_LABEL[event.rolledSeverity].tone}>{SEVERITY_LABEL[event.rolledSeverity].text}</Badge>}
          <span className="text-xs text-gray-400">올해 남은 일 {remainingEvents(game)}개</span>
        </div>
        <p className="text-5xl">{event.emoji}</p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="leading-relaxed text-gray-700">{event.text}</p>
      </div>

      {game.history.length === 0 && game.yearEvents.length === 0 && (
        <FirstTimeTip title="정답은 정해져 있지 않아요">
          선택지마다 보이지 않는 능력치 판정과 운이 있어요. 관련 능력치가 높을수록 좋은 결과가 잘 나오고, 결과에 따라 체력·고과·능력치가 바뀌어요.
        </FirstTimeTip>
      )}

      <div className="flex flex-col gap-2">
        {event.choices.map((c, i) => (
          <Choice key={c.label} onClick={() => choose(i)}>
            {c.specialties && (
              <p className="mb-0.5 text-xs font-medium text-blue-500">
                {specialtyById[game.profile.specialty].emoji} {specialtyById[game.profile.specialty].label} 개발자라서 떠올린 방법
              </p>
            )}
            <p className="font-semibold">{c.label}</p>
          </Choice>
        ))}
      </div>
    </Screen>
  )
}
