// 게임 상태 저장소. 엔진 함수를 감싸고 localStorage에 자동 저장한다.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  acceptOffer,
  applyToPosting,
  acknowledgeYear,
  chooseEventOption,
  chooseTrack,
  createGame,
  declineOffers,
  finishYear,
  nextYear,
  negotiateOffer,
  openChickenShop,
  remainingEvents,
  retireNow,
  spendGapYear,
  startYear,
  type ApplicationResult,
  type EventOutcome,
  type FocusId,
  type GameState,
  type NegotiationRaise,
} from '../engine'
import type { NewGameInput } from '../engine/setup'

interface Store {
  game: GameState | null
  /** 방금 고른 이벤트 선택지의 결과 (결과 문구를 보여준 뒤 지운다) */
  lastOutcome: EventOutcome | null

  newGame: (input: Omit<NewGameInput, 'seed'>) => void
  startYear: (focus: FocusId) => void
  choose: (choiceIndex: number) => void
  /** 결과 문구를 닫는다. 남은 이벤트가 없으면 연말 계산까지 진행 */
  continueAfterOutcome: () => void
  acknowledgeYear: () => void
  acceptOffer: (index: number) => void
  negotiateOffer: (index: number, percent: NegotiationRaise) => void
  declineOffers: () => void
  chooseTrack: (track: 'manager' | 'ic') => void
  /** 채용 공고에 지원한다. 결과는 lastApplication에 담겨 화면이 단계별로 보여준다 */
  apply: (postingIndex: number) => void
  dismissApplication: () => void
  /** 지원 결과 연출 (저장하지 않는다) */
  lastApplication: ApplicationResult | null
  spendGapYear: () => void
  openChickenShop: () => void
  nextYear: () => void
  retire: () => void
  reset: () => void
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1
}

export const useGame = create<Store>()(
  persist(
    (set, get) => {
      const update = (fn: (g: GameState) => GameState) => {
        const game = get().game
        if (game) set({ game: fn(game) })
      }

      return {
        game: null,
        lastOutcome: null,

        newGame: (input) => set({ game: createGame({ ...input, seed: randomSeed() }), lastOutcome: null }),
        startYear: (focus) => update((g) => startYear(g, focus)),
        choose: (choiceIndex) => {
          const game = get().game
          if (!game) return
          const result = chooseEventOption(game, choiceIndex)
          set({ game: result.state, lastOutcome: result.outcome })
        },
        continueAfterOutcome: () => {
          set({ lastOutcome: null })
          const game = get().game
          if (game && game.phase === 'event' && remainingEvents(game) === 0) {
            set({ game: finishYear(game) })
          }
        },
        acknowledgeYear: () => update(acknowledgeYear),
        acceptOffer: (index) => update((g) => acceptOffer(g, index)),
        negotiateOffer: (index, percent) => update((g) => negotiateOffer(g, index, percent)),
        declineOffers: () => update(declineOffers),
        chooseTrack: (track) => update((g) => chooseTrack(g, track)),
        lastApplication: null,
        apply: (postingIndex) => {
          const game = get().game
          if (!game) return
          const result = applyToPosting(game, postingIndex)
          set({ game: result.state, lastApplication: result.result })
        },
        dismissApplication: () => set({ lastApplication: null }),
        spendGapYear: () => update(spendGapYear),
        openChickenShop: () => update(openChickenShop),
        nextYear: () => update(nextYear),
        retire: () => update(retireNow),
        reset: () => set({ game: null, lastOutcome: null, lastApplication: null }),
      }
    },
    {
      name: 'commit-to-retire-save-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ game: s.game, lastOutcome: s.lastOutcome }),
    },
  ),
)
