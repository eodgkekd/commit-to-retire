import { useState } from 'react'
import { rankDisplay } from '../engine'
import { useGame } from '../store/game'
import { useGallery } from '../store/gallery'
import { achievements } from '../data'
import { GallerySheet } from './GallerySheet'
import { endingCatalog } from '../engine/endings'
import { Button, Card, Screen } from '../ui'

const MILESTONES = ['신입', '시니어', '리드', 'CTO', '은퇴']

export function TitleScreen({ onNew, onContinue }: { onNew: () => void; onContinue: () => void }) {
  const game = useGame((s) => s.game)
  const saveDropped = useGame((s) => s.saveDropped)
  const dismissSaveNotice = useGame((s) => s.dismissSaveNotice)
  const resumable = game && game.phase !== 'retired'
  const [confirming, setConfirming] = useState(false)
  const [gallery, setGallery] = useState(false)
  const unlockedCount = useGallery((s) => achievements.filter((a) => s.unlocked[a.id]).length)
  const endingCount = useGallery((s) => endingCatalog.filter((e) => s.endings?.[e.key]).length)

  return (
    <Screen
      footer={
        <div className="flex flex-col gap-2">
          {game && <Button onClick={onContinue}>{resumable ? '이어하기' : '지난 결과 보기'}</Button>}
          {/* 진행 중인 커리어가 있으면 한 번 더 묻는다. 저장은 새 캐릭터를 다 만들 때 바뀐다 */}
          <Button variant={game ? 'secondary' : 'primary'} onClick={() => (resumable ? setConfirming(true) : onNew())}>
            새로운 커리어 시작하기
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pt-6">
        <p className="text-sm text-gray-500">신입 첫 출근, 모니터 앞에서 시작해요</p>
        <h1 className="text-4xl font-extrabold leading-tight">
          커밋에서
          <br />
          은퇴까지
        </h1>
        <p className="text-gray-600">
          한 해의 선택이 쌓여 커리어가 돼요.
          <br />
          야근, 레거시, 이직, 그리고 CTO까지 도전해 보세요.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-5 py-8">
        <span className="text-6xl">💻</span>
        <div className="flex w-full items-center justify-between px-2">
          {MILESTONES.map((m, i) => (
            <div key={m} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : 'bg-blue-200'}`} />
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className={`h-0.5 flex-1 ${i === MILESTONES.length - 1 ? 'bg-transparent' : 'bg-blue-200'}`} />
              </div>
              <span className="text-xs text-gray-500">{m}</span>
            </div>
          ))}
        </div>
      </Card>

      {saveDropped && (
        <Card className="bg-amber-50">
          <p className="font-semibold text-amber-800">저장된 커리어를 불러오지 못했어요</p>
          <p className="text-sm text-amber-700">게임이 업데이트되면서 예전 저장 데이터와 맞지 않게 됐어요. 새 커리어로 시작해 주세요.</p>
          <button type="button" onClick={dismissSaveNotice} className="mt-2 text-sm font-medium text-amber-800 underline">
            알겠어요
          </button>
        </Card>
      )}

      {resumable && (
        <Card>
          <p className="text-sm text-gray-500">저장된 커리어</p>
          <p className="font-semibold">
            {game.profile.emoji} {game.profile.name} · {game.age}세 · {rankDisplay(game.rank, game.careerYear, Boolean(game.startup))} · {game.company.name}
          </p>
        </Card>
      )}

      <button type="button" onClick={() => setGallery(true)} className="rounded-2xl bg-gray-50 p-3 text-left text-sm text-gray-600 active:bg-gray-100">
        🏆 모음 · 업적 <span className="font-semibold text-gray-800">{unlockedCount}/{achievements.length}</span> · 엔딩{' '}
        <span className="font-semibold text-gray-800">
          {endingCount}/{endingCatalog.length}
        </span>
      </button>

      {gallery && <GallerySheet onClose={() => setGallery(false)} />}

      {confirming && resumable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
            <p className="text-lg font-bold">새 커리어를 시작할까요?</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              진행 중인 커리어({game.profile.name} · {game.age}세 · {rankDisplay(game.rank, game.careerYear, Boolean(game.startup))})는 새 캐릭터를 다 만들면 지워져요. 만드는
              도중에 돌아오면 그대로 남아 있어요.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                계속 이어하기
              </Button>
              <Button variant="danger" onClick={onNew}>
                새로 시작하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}
