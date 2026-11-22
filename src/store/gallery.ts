// 업적 갤러리: 여러 판에 걸쳐 딴 업적을 모아 둔다. 세이브(game)와 따로 저장해서 새 커리어를 시작해도 남는다.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { achievementById } from '../data'
import type { FameGrade, GameState } from '../engine'
import { endingFor } from '../engine/endings'

interface GalleryStore {
  /** 업적 id → 딴 횟수 */
  unlocked: Record<string, number>
  /** 엔딩 key → 본 횟수. 예전 기록에는 없을 수 있다 */
  endings?: Record<string, number>
  /** 끝까지 마친 판 수 */
  plays: number
  /** 가장 좋았던 엔딩 등급 */
  bestGrade: FameGrade | null
  /** 이미 기록한 판의 시드 (같은 판을 두 번 세지 않게) */
  recordedSeeds: number[]
}

const GRADE_ORDER: FameGrade[] = ['S', 'A', 'B', 'C', 'D']

export const useGallery = create<GalleryStore>()(
  persist(
    (): GalleryStore => ({ unlocked: {}, endings: {}, plays: 0, bestGrade: null, recordedSeeds: [] }),
    { name: 'commit-to-retire-gallery-v1', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
)

/** 은퇴한 판을 갤러리에 기록한다. 엔딩 화면이 열릴 때 부른다 (같은 판은 한 번만 센다) */
export function recordInGallery(game: GameState) {
  const g = useGallery.getState()
  if (!game.retirement || g.recordedSeeds.includes(game.seed)) return
  const unlocked = { ...g.unlocked }
  for (const id of game.achievements) if (achievementById[id]) unlocked[id] = (unlocked[id] ?? 0) + 1
  const endingKey = endingFor(game.retirement).key
  const endings = { ...g.endings, [endingKey]: (g.endings?.[endingKey] ?? 0) + 1 }
  const grade = game.retirement.fameGrade
  const bestGrade = g.bestGrade && GRADE_ORDER.indexOf(g.bestGrade) <= GRADE_ORDER.indexOf(grade) ? g.bestGrade : grade
  useGallery.setState({ unlocked, endings, plays: g.plays + 1, bestGrade, recordedSeeds: [...g.recordedSeeds, game.seed].slice(-200) })
}
