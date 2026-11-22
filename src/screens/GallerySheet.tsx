import { useState } from 'react'
import { achievements } from '../data'
import { endingCatalog } from '../engine/endings'
import { useGallery } from '../store/gallery'
import { Button } from '../ui'

interface Entry {
  id: string
  emoji: string
  title: string
  hint: string
  times: number
}

/**
 * 타이틀에서 여는 모음. 여러 판에 걸쳐 딴 업적과 본 엔딩을 보여준다.
 * 못 딴 업적은 설명만 힌트로, 못 본 엔딩은 이름을 가리고 어떤 길의 엔딩인지만 보여준다
 */
export function GallerySheet({ onClose }: { onClose: () => void }) {
  const { unlocked, endings = {}, plays, bestGrade } = useGallery()
  const [tab, setTab] = useState<'achievements' | 'endings'>('achievements')

  const achievementEntries: Entry[] = achievements.map((a) => ({ id: a.id, emoji: a.emoji, title: a.title, hint: a.description, times: unlocked[a.id] ?? 0 }))
  const endingEntries: Entry[] = endingCatalog.map((e) => ({ id: e.key, emoji: e.emoji, title: e.title, hint: e.text, times: endings[e.key] ?? 0 }))
  const entries = tab === 'achievements' ? achievementEntries : endingEntries
  const count = (list: Entry[]) => list.filter((e) => e.times > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p className="text-lg font-bold">🏆 모음</p>
        <p className="mt-1 text-sm text-gray-500">
          마친 커리어 {plays}번{bestGrade ? ` · 최고 등급 ${bestGrade}` : ''}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
          {(
            [
              ['achievements', `업적 ${count(achievementEntries)}/${achievementEntries.length}`],
              ['endings', `엔딩 ${count(endingEntries)}/${endingEntries.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-xl py-2 text-sm font-medium ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id} className={`flex items-center gap-3 rounded-2xl p-3 ${e.times ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <span className={`text-2xl ${e.times ? '' : 'opacity-30 grayscale'}`}>{e.times ? e.emoji : '🔒'}</span>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${e.times ? '' : 'text-gray-400'}`}>{e.times ? e.title : '???'}</p>
                {/* 엔딩은 문구가 곧 결과라 못 본 엔딩은 가린다 */}
                <p className="text-xs text-gray-500">{e.times || tab === 'achievements' ? e.hint : `${e.emoji} 어딘가에 있는 엔딩`}</p>
              </div>
              {e.times > 1 && <span className="shrink-0 text-xs text-amber-600">×{e.times}</span>}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
