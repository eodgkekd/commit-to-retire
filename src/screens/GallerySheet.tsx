import { achievements } from '../data'
import { useGallery } from '../store/gallery'
import { Button } from '../ui'

/** 타이틀에서 여는 업적 모음. 여러 판에 걸쳐 딴 업적을 보여주고, 못 딴 업적은 설명만 힌트로 보여준다 */
export function GallerySheet({ onClose }: { onClose: () => void }) {
  const { unlocked, plays, bestGrade } = useGallery()
  const count = achievements.filter((a) => unlocked[a.id]).length
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p className="text-lg font-bold">🏆 업적 모음</p>
        <p className="mt-1 text-sm text-gray-500">
          {count}/{achievements.length}개 · 마친 커리어 {plays}번{bestGrade ? ` · 최고 등급 ${bestGrade}` : ''}
        </p>
        <ul className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
          {achievements.map((a) => {
            const times = unlocked[a.id] ?? 0
            return (
              <li key={a.id} className={`flex items-center gap-3 rounded-2xl p-3 ${times ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <span className={`text-2xl ${times ? '' : 'opacity-30 grayscale'}`}>{times ? a.emoji : '🔒'}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${times ? '' : 'text-gray-400'}`}>{times ? a.title : '???'}</p>
                  <p className="text-xs text-gray-500">{a.description}</p>
                </div>
                {times > 1 && <span className="shrink-0 text-xs text-amber-600">×{times}</span>}
              </li>
            )
          })}
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
