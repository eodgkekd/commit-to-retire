import { useState } from 'react'
import { focuses } from '../data'
import { staminaChange, type FocusId, type GameState } from '../engine'
import { useGame } from '../store/game'
import { Button, Card, Choice, Screen, StatBars, StatusHeader, Title } from '../ui'

export function YearStartScreen({ game }: { game: GameState }) {
  const startYear = useGame((s) => s.startYear)
  const [focus, setFocus] = useState<FocusId | null>(null)

  return (
    <Screen
      footer={
        <Button disabled={!focus} onClick={() => focus && startYear(focus)}>
          {game.calendarYear}년 시작하기
        </Button>
      }
    >
      <StatusHeader game={game} />

      <Title eyebrow={`${game.careerYear}년차 · ${game.calendarYear}년`}>올해는 무엇에 집중할까요?</Title>

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-600">현재 능력치</p>
        <StatBars stats={game.stats} />
      </Card>

      {game.stamina < 35 && (
        <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">체력이 바닥이에요. 이대로면 번아웃이 올 수 있어요.</p>
      )}
      <p className="text-xs text-gray-400">체력 숫자는 올해 예상 변화예요. 사건이 터지면 더 깎일 수 있어요.</p>

      <div className="flex flex-col gap-2">
        {focuses.map((f) => {
          const delta = staminaChange(game, f.id)
          // 사건으로 더 깎일 여유가 없으면 빨갛게
          const risky = game.stamina + delta < 25
          return (
            <Choice key={f.id} selected={focus === f.id} onClick={() => setFocus(f.id)}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{f.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">{f.label}</p>
                    <span className={`shrink-0 text-xs font-medium tabular-nums ${risky ? 'text-red-500' : delta > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      체력 {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{f.description}</p>
                </div>
              </div>
            </Choice>
          )
        })}
      </div>

    </Screen>
  )
}
