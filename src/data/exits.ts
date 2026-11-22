import type { CareerExitDef } from '../engine/types'

// 개발자 말고 다른 길: 허브에서 고르면 결과를 굴리고 게임이 끝난다 (치킨집과 같은 방식).
// 결과 확률은 skill 능력치 평균이 pivot보다 1점 높을 때마다 첫 결과(가장 좋은 것) +goodPerPoint,
// 마지막 결과(가장 나쁜 것) −badPerPoint. 가운데 결과가 나머지를 갖는다.
// yearlyIncome은 60세 정년까지 해마다 자산에 더해지고, assets는 한 번에 더해진다 (만 원)
export const careerExits: CareerExitDef[] = [
  {
    id: 'freelancer',
    label: '프리랜서',
    emoji: '🧳',
    description: '회사를 나와 프로젝트 단위로 일해요. 코딩·도메인 실력과 평판이 단가를 정해요.',
    requirement: '경력 7년 차부터',
    conditions: { minCareerYear: 7 },
    skill: ['coding', 'domain', 'reputation'],
    pivot: 55,
    goodPerPoint: 0.005,
    badPerPoint: 0.007,
    outcomes: [
      { id: 'top', title: '귀하신 프리랜서', chance: 0.2, ending: '단가 높은 프리랜서가 됐어요. 일은 골라서 받아요 💻', yearlyIncome: 6000, achievement: 'freelancer_top' },
      { id: 'steady', title: '떠돌이 프리랜서', chance: 0.5, ending: '프리랜서로 이 프로젝트 저 프로젝트를 다니며 일했어요 🧳', yearlyIncome: 3500, achievement: 'freelancer' },
      { id: 'dry', title: '일감 끊긴 프리랜서', chance: 0.3, ending: '프리랜서가 됐지만 일감이 끊겨 통장 잔고와 눈싸움하며 지냈어요 🧳', yearlyIncome: 800, achievement: 'freelancer' },
    ],
  },
  {
    id: 'creator',
    label: '강사·유튜버',
    emoji: '🎥',
    description: '개발을 가르치고 영상을 찍어요. 소통 실력과 평판이 구독자를 모아요.',
    requirement: '평판 40 이상 또는 소통 65 이상',
    conditions: { minCareerYear: 3 },
    statGate: { reputation: 40, communication: 65 },
    skill: ['communication', 'reputation'],
    pivot: 55,
    goodPerPoint: 0.004,
    badPerPoint: 0.008,
    outcomes: [
      { id: 'star', title: '구독자 100만 유튜버', chance: 0.12, ending: '개발 유튜브 구독자 100만, 업계 셀럽이 됐어요 🎥', assets: 50000, achievement: 'creator_star' },
      { id: 'teacher', title: '부트캠프 강사', chance: 0.48, ending: '부트캠프 강사로 후배들을 가르치며 지냈어요 📚', yearlyIncome: 3000, achievement: 'creator' },
      { id: 'flop', title: '구독자 셋 유튜버', chance: 0.4, ending: '채널을 열었지만 구독자는 가족 셋이었어요 📉', yearlyIncome: 500, achievement: 'creator' },
    ],
  },
  {
    id: 'civil_servant',
    label: '전산직 공무원',
    emoji: '🏛️',
    description: '공무원 시험을 준비해요. 붙으면 6시 퇴근, 떨어지면 노량진에서 몇 년을 보내요. 나이가 많을수록 시험이 버거워요.',
    requirement: '45세까지',
    conditions: { maxAge: 45 },
    skill: ['coding', 'domain'],
    pivot: 55,
    goodPerPoint: 0.006,
    badPerPoint: 0.006,
    agePenaltyFrom: 35,
    outcomes: [
      { id: 'pass', title: '전산직 공무원', chance: 0.35, ending: '전산직 공무원 시험에 붙었어요. 이제 6시에 퇴근해요 🏛️', yearlyIncome: 2500, achievement: 'civil_servant' },
      { id: 'fail', title: '노량진 졸업', chance: 0.65, ending: '공시 3수 끝에 노량진을 떠났어요 📚', assets: -3000, achievement: 'gongsi' },
    ],
  },
]
