import type { ChickenOutcome, RetireReason } from '../engine/types'

/** 엔딩 하나 (엔딩 화면 첫 줄과 업적 모음의 엔딩 탭). 개발자 말고 다른 길의 엔딩은 src/data/exits.ts에 있다 */
export interface EndingDef {
  key: string
  emoji: string
  /** 엔딩 모음에 보이는 짧은 이름 */
  title: string
  /** 엔딩 화면 첫 줄 */
  text: string
}

export const reasonEndings: Record<Exclude<RetireReason, 'chicken' | 'career_exit'>, EndingDef> = {
  age: { key: 'age', emoji: '🎂', title: '정년 은퇴', text: '60세, 정년을 채우고 은퇴했어요' },
  voluntary: { key: 'voluntary', emoji: '⌨️', title: '자진 은퇴', text: '스스로 키보드를 내려놓았어요' },
  burnout: { key: 'burnout', emoji: '😵', title: '번아웃 은퇴', text: '세 번째 번아웃 끝에 업계를 떠났어요' },
  startup_quit: { key: 'startup_quit', emoji: '🚪', title: '창업 실패 후 은퇴', text: '창업 실패 후 다른 길을 찾았어요' },
}

export const chickenEndings: Record<ChickenOutcome, EndingDef> = {
  franchise: { key: 'chicken:franchise', emoji: '🐔', title: '치킨 프랜차이즈 대표', text: '퇴직금으로 차린 치킨집이 전국 프랜차이즈가 됐어요 🐔' },
  local: { key: 'chicken:local', emoji: '🍗', title: '동네 치킨 맛집', text: '키보드 대신 튀김 바구니를 잡았어요. 동네 맛집 사장님이에요 🍗' },
  closed: { key: 'chicken:closed', emoji: '📉', title: '치킨집 폐업', text: '치킨집을 차렸지만 2년 만에 문을 닫았어요 🍗' },
}
