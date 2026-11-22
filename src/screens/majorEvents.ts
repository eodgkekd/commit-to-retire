// 연말에 일어난 큰 사건(실직·엑싯·번아웃)을 플레이어에게 알리는 문구.
// 연말 결과 화면의 팝업·카드와 허브의 실직 안내가 같이 쓴다.

import { BURNOUT_RESET_STAMINA, BURNOUTS_TO_RETIRE, CHICKEN, companyTypeById, startupStages, STARTUP } from '../data'
import { formatSalary } from '../engine/rules'
import type { FeedTrigger, GameState, YearRecord } from '../engine'
import { fillTemplate } from '../engine/text'

export interface MajorEventInfo {
  trigger: FeedTrigger
  emoji: string
  title: string
  body: string
  tone: 'bad' | 'good'
}

/** 실직으로 이어지는 사건 */
export const JOB_LOSS_TRIGGERS: FeedTrigger[] = ['companyClosed', 'layoff', 'startupFailed']

const NEXT_STEP = '다음 화면에서 채용 공고에 지원해 새 회사를 구해야 다음 해로 넘어갈 수 있어요. 실직 중에는 5곳까지 지원할 수 있어요.'

/** 이 해에 일어난 큰 사건들. 없으면 빈 배열 */
export function majorEvents(record: YearRecord, game: GameState): MajorEventInfo[] {
  const name = record.company.name
  const out: MajorEventInfo[] = []
  const older = record.age >= CHICKEN.minAge
  const chickenNote = older ? ' 40대부터는 재취업이 해마다 어려워져요. 치킨집을 차리고 은퇴하는 길도 있어요.' : ''

  if (record.triggers.includes('companyClosed')) {
    out.push({
      trigger: 'companyClosed',
      emoji: '🪦',
      title: '회사가 문을 닫았어요',
      body: `${fillTemplate('{company}(이)가 폐업했어요.', { company: name })} 받아둔 스톡옵션도 휴지가 됐고, 지금은 소속이 없어요. ${NEXT_STEP}${chickenNote}`,
      tone: 'bad',
    })
  }

  if (record.triggers.includes('layoff')) {
    const why = older
      ? '{company}에서 "후배들에게 길을 열어 달라"는 말과 함께 회사를 떠나게 됐어요.'
      : '{company}(이)가 구조조정을 하면서 회사를 떠나게 됐어요.'
    out.push({
      trigger: 'layoff',
      emoji: '📉',
      title: '권고사직을 받았어요',
      body: `${fillTemplate(why, { company: name })} 지금은 소속이 없어요. ${NEXT_STEP}${chickenNote}`,
      tone: 'bad',
    })
  }

  if (record.triggers.includes('exit')) {
    const acquired = name.includes('(인수됨)')
    out.push({
      trigger: 'exit',
      emoji: '💰',
      title: '회사가 엑싯했어요!',
      body: acquired
        ? `회사가 인수되면서 스톡옵션이 목돈이 됐어요. 이제 ${companyTypeById[record.company.type].label} 소속으로 계속 다녀요.`
        : '회사가 상장하면서 스톡옵션이 목돈이 됐어요. 자산이 크게 늘었어요.',
      tone: 'good',
    })
  }

  if (record.triggers.includes('startupFailed')) {
    out.push({
      trigger: 'startupFailed',
      emoji: '🪂',
      title: '회사를 접었어요',
      body: `${fillTemplate('투자도 매출도 끝내 따라오지 않아 {company}(을)를 정리했어요.', { company: name })} 대표 경험은 남았지만 지금은 소속이 없어요. ${NEXT_STEP}${chickenNote}`,
      tone: 'bad',
    })
  }

  if (record.triggers.includes('startupRaised') && game.startup) {
    const stage = game.startup.stage
    out.push({
      trigger: 'startupRaised',
      emoji: '📈',
      title: `${startupStages[stage]} 유치에 성공했어요!`,
      body: `${fillTemplate('{company}(이)가 투자를 받았어요.', { company: name })} 이제 대표 연봉은 ${formatSalary(STARTUP.salary[stage])} 원이에요.${stage === STARTUP.salary.length - 1 ? ' 여기서 잘 버티면 인수 제안이 올 수 있어요.' : ''}`,
      tone: 'good',
    })
  }

  if (record.triggers.includes('startupExit')) {
    out.push({
      trigger: 'startupExit',
      emoji: '🦄',
      title: '회사를 매각했어요!',
      body: `내가 차린 회사가 ${companyTypeById[record.company.type].label}에 인수됐어요. 지분 매각 대금으로 자산이 크게 늘었고, 이제 인수한 회사 소속으로 계속 일해요.`,
      tone: 'good',
    })
  }

  if (record.triggers.includes('burnout')) {
    out.push({
      trigger: 'burnout',
      emoji: '🫠',
      title: `번아웃이 왔어요 (${game.counters.burnouts}/${BURNOUTS_TO_RETIRE})`,
      body: `올해 고과는 D로 처리됐고 체력은 ${BURNOUT_RESET_STAMINA}에서 다시 시작해요. ${BURNOUTS_TO_RETIRE}번째 번아웃이면 은퇴해요.`,
      tone: 'bad',
    })
  }

  return out
}
