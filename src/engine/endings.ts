// 엔딩 종류: 엔딩 화면 첫 줄과 업적 모음의 엔딩 탭이 같이 쓴다

import { careerExits, chickenEndings, reasonEndings, type EndingDef } from '../data'
import type { Retirement } from './types'

/** 모을 수 있는 엔딩 전부 (자리만 있는 '창업 실패 후 은퇴'는 뺀다) */
export const endingCatalog: EndingDef[] = [
  reasonEndings.age,
  reasonEndings.voluntary,
  reasonEndings.burnout,
  ...Object.values(chickenEndings),
  ...careerExits.flatMap((exit) =>
    exit.outcomes.map((o) => ({ key: `${exit.id}:${o.id}`, emoji: exit.emoji, title: o.title, text: o.ending })),
  ),
]

/** 이 은퇴가 어떤 엔딩인지 */
export function endingFor(r: Retirement): EndingDef {
  if (r.reason === 'chicken') return chickenEndings[r.chicken ?? 'local']
  if (r.reason === 'career_exit') {
    const key = r.careerExit ? `${r.careerExit.id}:${r.careerExit.outcome}` : ''
    return endingCatalog.find((e) => e.key === key) ?? { key: 'career_exit', emoji: '🚪', title: '다른 길', text: '개발자 말고 다른 길을 찾았어요' }
  }
  return reasonEndings[r.reason]
}
