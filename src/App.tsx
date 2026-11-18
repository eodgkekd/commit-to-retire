import { useEffect, useLayoutEffect, useState } from 'react'
import { endingResult } from './engine/career'
import { loadShortResult, readSharedResult } from './engine/share'
import { Button, Screen, Title } from './ui'
import { remainingEvents } from './engine'
import { EndingScreen } from './screens/EndingScreen'
import { EventScreen } from './screens/EventScreen'
import { HubScreen } from './screens/HubScreen'
import { SetupScreen } from './screens/SetupScreen'
import { TitleScreen } from './screens/TitleScreen'
import { YearEndScreen } from './screens/YearEndScreen'
import { YearStartScreen } from './screens/YearStartScreen'
import { useGame } from './store/game'

type View = 'title' | 'setup' | 'game'

export default function App() {
  const game = useGame((s) => s.game)
  const reset = useGame((s) => s.reset)
  const [view, setView] = useState<View>('title')
  const [shared, setShared] = useState(() => readSharedResult(window.location.hash))
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let controller: AbortController | undefined
    const update = () => {
      controller?.abort()
      const hash = window.location.hash
      const result = readSharedResult(hash)
      setShared(result)
      if (result.status === 'loading') {
        controller = new AbortController()
        const requestController = controller
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
        void loadShortResult(result.id, signal).then((loaded) => {
          if (!requestController.signal.aborted && window.location.hash === hash) setShared(loaded)
        })
      }
    }
    update()
    window.addEventListener('hashchange', update)
    return () => { controller?.abort(); window.removeEventListener('hashchange', update) }
  }, [retry])

  // 새 게임이 만들어지면 바로 게임 화면으로
  const current: View = view === 'setup' && game ? 'game' : view

  // 화면이 바뀌면 맨 위로 (연초 → 이벤트 → 결과 문구 → 연말 → 허브, 다음 해)
  const lastOutcome = useGame((s) => s.lastOutcome)
  const screenKey = [
    current,
    game?.phase,
    game?.calendarYear,
    game ? remainingEvents(game) : 0,
    lastOutcome ? 'outcome' : '',
  ].join('|')
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [screenKey, shared])

  const closeShared = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setShared({ status: 'none' })
    setView('title')
  }
  if (shared.status === 'valid') return <EndingScreen key={window.location.hash} game={shared.result} shared onNew={closeShared} />
  if (shared.status === 'loading') return (
    <Screen footer={<Button onClick={closeShared}>내 게임으로 돌아가기</Button>}>
      <p role="status">공유된 결과를 불러오고 있어요…</p>
    </Screen>
  )
  if (shared.status === 'unavailable') return (
    <Screen footer={<Button onClick={closeShared}>내 게임으로 돌아가기</Button>}>
      <Title>결과를 불러오지 못했어요</Title>
      <p className="text-sm text-gray-500">네트워크를 확인해 주세요. 방금 만든 링크는 반영까지 잠시 걸릴 수 있어요.</p>
      <Button onClick={() => setRetry((value) => value + 1)}>다시 불러오기</Button>
    </Screen>
  )
  if (shared.status === 'invalid') return (
    <Screen footer={<Button onClick={closeShared}>내 게임으로 돌아가기</Button>}>
      <Title>공유 링크를 확인해 주세요</Title>
      <p className="text-sm text-gray-500">링크가 잘렸거나 지원하지 않는 결과예요. 전체 링크를 다시 받아 주세요.</p>
    </Screen>
  )

  if (current === 'title' || !game) {
    if (current === 'setup') return <SetupScreen onBack={() => setView('title')} />
    return <TitleScreen onNew={() => setView('setup')} onContinue={() => setView('game')} />
  }

  const startOver = () => {
    reset()
    setView('setup')
  }

  switch (game.phase) {
    case 'year_start':
      return <YearStartScreen game={game} />
    case 'event':
      return <EventScreen game={game} />
    case 'year_end':
      return <YearEndScreen game={game} />
    case 'hub':
      return <HubScreen game={game} />
    case 'retired':
      return <EndingScreen game={endingResult(game)} onNew={startOver} />
  }
}
