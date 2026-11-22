import type { AchievementDef, FameGrade, FocusDef, Grade, RankDef, RankId } from '../engine/types'

export const ranks: RankDef[] = [
  { id: 'newbie', label: '신입', track: 'common', minYears: 0, minStats: {}, from: null, salaryBump: 0, fameScore: 0 },
  { id: 'junior', label: '주니어', track: 'common', minYears: 1, minStats: { coding: 40 }, from: 'newbie', salaryBump: 0.05, fameScore: 5 },
  { id: 'mid', label: '미들', track: 'common', minYears: 4, minStats: { coding: 55 }, from: 'junior', salaryBump: 0.06, fameScore: 10 },
  { id: 'senior', label: '시니어', track: 'common', minYears: 7, minStats: { coding: 65, design: 55 }, from: 'mid', salaryBump: 0.08, fameScore: 20 },
  { id: 'lead', label: '테크리드', track: 'common', minYears: 10, minStats: { design: 70, communication: 60 }, from: 'senior', salaryBump: 0.1, fameScore: 30 },

  // 매니저 트랙
  { id: 'em', label: '엔지니어링 매니저', track: 'manager', minYears: 13, minStats: { communication: 78, domain: 65 }, from: 'lead', salaryBump: 0.1, fameScore: 40 },
  { id: 'director', label: '디렉터', track: 'manager', minYears: 16, minStats: { communication: 86, domain: 78, reputation: 45 }, from: 'em', salaryBump: 0.12, fameScore: 55 },
  { id: 'vp', label: 'VP of Engineering', track: 'manager', minYears: 19, minStats: { communication: 90, domain: 85, reputation: 65 }, from: 'director', salaryBump: 0.15, fameScore: 70 },
  { id: 'cto', label: 'CTO', track: 'manager', minYears: 22, minStats: { design: 88, communication: 93, reputation: 80 }, from: 'vp', salaryBump: 0.2, fameScore: 85 },

  // IC 트랙
  { id: 'staff', label: '스태프 엔지니어', track: 'ic', minYears: 13, minStats: { design: 80, coding: 78 }, from: 'lead', salaryBump: 0.1, fameScore: 40 },
  { id: 'principal', label: '프린시펄 엔지니어', track: 'ic', minYears: 16, minStats: { design: 88, coding: 82, reputation: 50 }, from: 'staff', salaryBump: 0.12, fameScore: 55 },
  { id: 'fellow', label: '펠로우', track: 'ic', minYears: 21, minStats: { design: 94, coding: 88, reputation: 80 }, from: 'principal', salaryBump: 0.2, fameScore: 75 },
]

/**
 * 화면에 직책과 함께 보여주는 회사 직급 (사원·대리·과장…). 승진(직책)과 별개로 연차로 오른다.
 * minRank: 직책이 이만큼 올랐으면 연차가 모자라도 이 직급으로 본다. 임원 직책은 executiveTitles
 */
export const corporateTitles: { title: string; minCareerYear: number; minRank?: RankId[] }[] = [
  { title: '부장', minCareerYear: 16 },
  { title: '차장', minCareerYear: 12, minRank: ['lead', 'em', 'staff'] },
  { title: '과장', minCareerYear: 8, minRank: ['senior'] },
  { title: '대리', minCareerYear: 4 },
  { title: '사원', minCareerYear: 1 },
]
export const executiveTitles: Partial<Record<RankId, string>> = { director: '이사', principal: '이사', vp: '상무', fellow: '상무', cto: '전무' }

/** 이벤트 문구의 {boss}: 내 직급에서 바로 위 상사를 부르는 말 (팀장급이 되면 더는 '팀장'이 상사가 아니다) */
export const bossTitles: Record<RankId, string> = {
  newbie: '팀장', junior: '팀장', mid: '팀장', senior: '팀장',
  lead: '본부장', em: '본부장', staff: '본부장',
  director: '상무', principal: '상무',
  vp: '대표', fellow: '대표', cto: '대표',
}

export const focuses: FocusDef[] = [
  {
    id: 'coding', label: '알고리즘 문제 풀기', emoji: '💻',
    description: '매주 문제를 풀고 풀이를 개선하며 코딩 실력을 키워요.',
    statGain: { coding: 8 }, stamina: -8, gradeBonus: 0, offerBonus: 0,
  },
  {
    id: 'design', label: '시스템 설계 스터디', emoji: '📐',
    description: '서비스의 DB와 서버 구조를 설계하고 피드백을 받으며 설계 실력을 키워요.',
    statGain: { design: 8 }, stamina: -8, gradeBonus: 0, offerBonus: 0,
  },
  {
    id: 'communication', label: '팀 세미나 발표', emoji: '💬',
    description: '팀원들에게 기술을 설명하고 질문에 답하며 소통 실력을 키워요.',
    statGain: { communication: 8 }, stamina: -8, gradeBonus: 0, offerBonus: 0,
  },
  {
    id: 'all_in',
    label: '업무에 올인',
    emoji: '🔥',
    description: '고과와 도메인이 오르고 일 잘한다는 소문도 나요. 대신 몸이 상해요.',
    statGain: { domain: 5, coding: 2, design: 2, reputation: 1 },
    stamina: -15,
    gradeBonus: 15,
    offerBonus: 0,
  },
  {
    id: 'study',
    label: '기술 공부',
    emoji: '📖',
    description: '퇴근 후 공부. 실력이 단단해져요.',
    statGain: { coding: 5, design: 5 },
    stamina: -8,
    gradeBonus: 0,
    offerBonus: 0,
  },
  {
    id: 'side_project',
    label: '사이드 프로젝트',
    emoji: '🛠️',
    description: '퇴근 후 내 것을 만들어 이름을 알려요. 실력이 있어야 평판이 잘 올라요.',
    statGain: { coding: 3, design: 1, reputation: 4 },
    stamina: -12,
    gradeBonus: -5,
    offerBonus: 1,
    setFlags: ['sideProject'],
  },
  {
    id: 'networking',
    label: '네트워킹·발표',
    emoji: '🎤',
    description: '밋업과 컨퍼런스에서 얼굴을 알려요. 실력이 있어야 평판이 잘 올라요.',
    statGain: { communication: 5, reputation: 5 },
    stamina: -5,
    gradeBonus: 0,
    offerBonus: 1,
  },
  {
    id: 'job_hunt',
    label: '이직 준비',
    emoji: '💼',
    description: '공고 3곳에 지원할 수 있고 합격률이 올라요. 올해 승진 심사는 건너뛰어요.',
    statGain: { coding: 1 },
    stamina: -5,
    gradeBonus: -10,
    offerBonus: 3,
  },
  {
    id: 'rest',
    label: '쉬어가기',
    emoji: '🌴',
    description: '칼퇴하고 체력을 회복해요. 올해 승진 심사는 건너뛰어요.',
    statGain: {},
    stamina: 30,
    gradeBonus: -5,
    offerBonus: 0,
  },
]

/** 고과 점수 → 등급 기준 (점수 이상이면 해당 등급) */
export const gradeThresholds: { grade: Grade; minScore: number; raise: number }[] = [
  { grade: 'S', minScore: 85, raise: 0.12 },
  { grade: 'A', minScore: 70, raise: 0.08 },
  { grade: 'B', minScore: 45, raise: 0.04 },
  { grade: 'C', minScore: 25, raise: 0.01 },
  { grade: 'D', minScore: -Infinity, raise: 0 },
]

/** 명성 점수 → 엔딩 등급 */
export const fameGrades: { grade: FameGrade; minScore: number; title: string }[] = [
  { grade: 'S', minScore: 115, title: '한국 IT의 전설' },
  { grade: 'A', minScore: 90, title: '업계가 아는 이름' },
  { grade: 'B', minScore: 68, title: '믿고 맡기는 시니어' },
  { grade: 'C', minScore: 45, title: '무난한 월급쟁이' },
  { grade: 'D', minScore: -Infinity, title: '치킨집 사장님' },
]

export const achievements: AchievementDef[] = [
  { id: 'weekend_rollback', title: '주말 롤백', emoji: '🔙', description: '금요일 배포로 주말을 반납했어요.', fame: 3 },
  { id: 'legacy_archaeologist', title: '레거시 고고학자', emoji: '🦴', description: '10년 넘은 코드를 세 번 리팩토링했어요.', fame: 8 },
  { id: 'job_hopper', title: '이직의 신', emoji: '🦘', description: '다섯 번 이상 이직했어요.', fame: 5 },
  { id: 'one_company', title: '한 우물', emoji: '⛲', description: '한 회사에서 20년을 버텼어요.', fame: 10 },
  { id: 'stock_lottery', title: '스톡옵션 로또', emoji: '💰', description: '회사가 엑싯에 성공했어요.', fame: 12 },
  { id: 'stock_tissue', title: '스톡옵션 휴지', emoji: '🧻', description: '다니던 회사가 세 번 망했어요.', fame: 5 },
  { id: 'three_am', title: '새벽 3시의 수호자', emoji: '🌙', description: '장애 대응을 여덟 번 했어요.', fame: 8 },
  { id: 'non_major_cto', title: '비전공 CTO', emoji: '👑', description: '비전공으로 시작해 CTO가 됐어요.', fame: 20 },
  { id: 'open_source_star', title: '오픈소스 스타', emoji: '⭐', description: '평판 90을 넘겼어요.', fame: 15 },
  { id: 'no_burnout', title: '무사고 퇴직', emoji: '🕊️', description: '번아웃 없이 60세까지 일했어요.', fame: 10 },
  { id: 'soju_shower', title: '소주 세례', emoji: '🍶', description: '회식 자리에서 얼굴에 소주를 맞았어요.', fame: 2 },
  { id: 'parental_leave', title: '육아휴직 다녀왔어요', emoji: '🍼', description: '눈치 보지 않고 육아휴직을 썼어요.', fame: 3 },
  { id: 'chicken_shop', title: '개발자의 종착역', emoji: '🍗', description: '실직 후 치킨집을 차렸어요.', fame: 2 },
  { id: 'founder', title: '대표님', emoji: '🚀', description: '회사를 그만두고 내 회사를 차렸어요.', fame: 2 },
  { id: 'founder_failed', title: '실패도 경력', emoji: '🪂', description: '차린 회사를 접어 봤어요.', fame: 1 },
  { id: 'founder_exit', title: '연쇄 창업가의 시작', emoji: '🦄', description: '차린 회사를 매각했어요.', fame: 15 },
  { id: 'freelancer', title: '노마드 개발자', emoji: '🧳', description: '회사를 나와 프리랜서가 됐어요.', fame: 3 },
  { id: 'freelancer_top', title: '귀하신 프리랜서', emoji: '💎', description: '일을 골라 받는 프리랜서가 됐어요.', fame: 8 },
  { id: 'creator', title: '지식 공유자', emoji: '📚', description: '개발을 가르치거나 영상을 찍었어요.', fame: 4 },
  { id: 'creator_star', title: '개발 유튜버 셀럽', emoji: '🎥', description: '구독자 100만을 모았어요.', fame: 15 },
  { id: 'civil_servant', title: '칼퇴의 주인공', emoji: '🏛️', description: '전산직 공무원이 됐어요.', fame: 5 },
  { id: 'gongsi', title: '노량진 졸업생', emoji: '📝', description: '공무원 시험에 도전했어요.', fame: 1 },
  { id: 'chicken_franchise', title: '치킨 프랜차이즈 대표', emoji: '🐔', description: '차린 치킨집이 전국 프랜차이즈가 됐어요.', fame: 12 },
]
