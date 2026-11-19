// 게임 전체에서 쓰는 타입. 기준 문서: docs/기획서.md

// ─── 능력치 ────────────────────────────────────────────

/** 성장형 능력치 (0~100). 체력은 소모형이라 따로 둔다. */
export type StatKey = 'coding' | 'design' | 'communication' | 'domain' | 'reputation'
export type Stats = Record<StatKey, number>

/** 플레이 스타일이 분배하는 능력치 (평판은 학력·활동으로만 쌓인다) */
export type StyleStatKey = Exclude<StatKey, 'reputation'>

// ─── ID 목록 ───────────────────────────────────────────

export type EducationId =
  | 'top_cs' | 'local_cs' | 'non_major' | 'bootcamp' | 'self_taught' | 'overseas'

export type SpecialtyId = 'backend' | 'frontend' | 'mobile' | 'data_ai' | 'infra' | 'game'

export type PlayStyleId = 'builder' | 'architect' | 'communicator' | 'domain_expert'

export type CompanyTypeId =
  | 'chaebol' | 'chaebol_si' | 'bigtech' | 'foreign' | 'midsize' | 'sme_si'
  | 'agency' | 'seed' | 'series_b' | 'unicorn' | 'finance_public'

export type IndustryId =
  | 'si_sm' | 'b2b_saas' | 'b2c' | 'commerce' | 'fintech' | 'game' | 'ai' | 'public'

export type RankId =
  | 'newbie' | 'junior' | 'mid' | 'senior' | 'lead'
  | 'em' | 'director' | 'vp' | 'cto'
  | 'staff' | 'principal' | 'fellow'

export type Track = 'common' | 'manager' | 'ic'

export type FocusId = 'all_in' | 'study' | 'coding' | 'design' | 'communication' | 'side_project' | 'networking' | 'job_hunt' | 'rest'

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'

export type FameGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export type Flag = 'married' | 'hasChild' | 'mortgage' | 'sideProject' | 'onLeave'

export type FeedPlatform = 'blinder' | 'okko' | 'jobplanet' | 'linkedout' | 'github'

export type EventCategory =
  | '장애' | '레거시' | '일정' | '사람' | '커리어' | '회사' | '업계' | '개인' | '생활'

/** 업적 진행도를 세는 카운터 (장애 대응 횟수 등) */
export type CounterKey =
  | 'incidents' | 'refactors' | 'jobChanges' | 'burnouts' | 'startupFailures' | 'exits'

// ─── 정적 데이터 정의 (src/data/*.ts) ───────────────────

export interface EducationDef {
  id: EducationId
  label: string
  emoji: string
  description: string
  statBonus: Partial<Stats>
  /** 전체 성장률 배수 (고졸 독학 = 대기만성형) */
  growthMultiplier: number
  /** 모든 회사 서류 점수 보정 */
  hiringBonus: number
  /** 특정 회사 유형 추가 보정 */
  companyBonus?: Partial<Record<CompanyTypeId, number>>
}

export interface SpecialtyDef {
  id: SpecialtyId
  label: string
  emoji: string
  /** 이 업종에서 일하면 도메인·설계 성장 보너스 */
  goodIndustries: IndustryId[]
}

export interface PlayStyleDef {
  id: PlayStyleId
  label: string
  description: string
  /** 시작 능력치 분배. 모든 스타일의 합은 같아야 한다 (STYLE_STAT_TOTAL) */
  stats: Record<StyleStatKey, number>
}

export type Level = 1 | 2 | 3 | 4

export interface CompanyTypeDef {
  id: CompanyTypeId
  label: string
  emoji: string
  /** 신입 초봉 (만 원) */
  baseSalary: number
  stockOption: boolean
  /** 능력치 성장 배수 */
  growth: number
  /** 야근 강도 1(낮음)~4(매우 높음). 체력 소모에 반영 */
  overtime: Level
  /** 연간 폐업·구조조정·인수 확률 (0~1) */
  risk: number
  /** 승진 속도 배수. 클수록 빠름 */
  promotionSpeed: number
  /** 서류 통과 기준 점수 */
  hiringBar: number
  /** 회사 이름 후보 (패러디 또는 가상) */
  names: string[]
}

export interface IndustryDef {
  id: IndustryId
  label: string
  emoji: string
  description: string
  salaryMultiplier: number
  /** 업종별 능력치 성장 배수 */
  growth: Partial<Record<StatKey, number>>
}

export interface RankDef {
  id: RankId
  label: string
  track: Track
  /** 이 직급으로 올라오기 위한 최소 총 경력(년) */
  minYears: number
  /** 이 직급으로 올라오기 위한 최소 능력치 */
  minStats: Partial<Stats>
  /** 바로 아래 직급 (승진 경로) */
  from: RankId | null
  /** 승진 시 연봉 인상률 */
  salaryBump: number
  /** 엔딩 명성 점수에 들어가는 직책 점수 */
  fameScore: number
}

export interface FocusDef {
  id: FocusId
  label: string
  emoji: string
  description: string
  /** 1년 동안 추가로 얻는 능력치 */
  statGain: Partial<Stats>
  /** 체력 변화 (회사 야근에 의한 소모와 별개) */
  stamina: number
  /** 고과 점수 보정 */
  gradeBonus: number
  /** 연말 이직 제안 수 보정 */
  offerBonus: number
  setFlags?: Flag[]
}

export interface AchievementDef {
  id: string
  title: string
  emoji: string
  description: string
  /** 엔딩 명성 점수에 더해지는 점수 */
  fame: number
}

// ─── 이벤트 ────────────────────────────────────────────

/** 선택 결과가 상태에 주는 변화 */
export interface Effects {
  stats?: Partial<Stats>
  stamina?: number
  /** 연봉 변화율 (0.1 = +10%) */
  salaryPct?: number
  /** 자산 변화 (만 원) */
  assets?: number
  /** 이번 해 고과 점수 보정 */
  gradeBonus?: number
  /** 이번 해 연말 이직 제안 수 보정 */
  offerBonus?: number
  setFlags?: Flag[]
  clearFlags?: Flag[]
  counters?: Partial<Record<CounterKey, number>>
  achievement?: string
  /** 회사를 떠나게 된다 (권고사직·희망퇴직). 연말에 실직 상태로 허브에 간다 */
  jobLoss?: boolean
}

export interface EventOutcome {
  /** 같은 선택지 안의 결과 확률. 합이 1이어야 한다. 플레이어에게 보여주지 않는다 */
  chance: number
  text: string
  /** 운인지 실력인지 결과 문구에 붙는 힌트 */
  tone?: 'lucky' | 'unlucky' | 'skill'
  effects: Effects
}

export interface EventChoice {
  label: string
  /**
   * 능력치 판정 (화면에 보이지 않는다). 선택은 언제나 가능하고,
   * 능력치가 기준보다 낮으면 실패(tone: 'unlucky') 결과 확률이 오르고, 높으면 내려간다.
   * check가 있으면 실패 결과와 성공 결과가 모두 있어야 한다.
   */
  check?: Partial<Stats>
  outcomes: EventOutcome[]
}

export interface EventConditions {
  minCareerYear?: number
  maxCareerYear?: number
  minAge?: number
  maxAge?: number
  companyTypes?: CompanyTypeId[]
  industries?: IndustryId[]
  ranks?: RankId[]
  specialties?: SpecialtyId[]
  flags?: Flag[]
  notFlags?: Flag[]
  /** 게임 내 달력 연도 (AI 시대 흐름 이벤트용) */
  minCalendarYear?: number
  /** 지금 회사에서 보낸 햇수 상한 (0 = 입사 첫해) */
  maxYearsAtCompany?: number
  /** 최소 이직 횟수 (1 = 첫 회사 제외) */
  minJobChanges?: number
  /** 최대 이직 횟수 (0 = 첫 회사에서만) */
  maxJobChanges?: number
}

/** 1 가벼운 일 · 2 보통 · 3 큰일 */
export type Severity = 1 | 2 | 3

/** 변수 후보: 문자열 목록에서 하나를 고르거나, 정수 범위(min~max)에서 굴린다 */
export type EventVarSource = string[] | { min: number; max: number }

/** 심각도별로 후보를 달리 둘 수 있다 ([가벼움, 보통, 큰일]). severity: true인 이벤트에서만 쓴다 */
export type EventVarDef = EventVarSource | { bySeverity: [EventVarSource, EventVarSource, EventVarSource] }

/** 같은 사건의 다른 장면. 제목·본문만 다르고 선택지와 결과는 같다 */
export interface EventVariant {
  title: string
  text: string
  /** 이 장면이 나올 수 있는 조건 (이벤트 자체의 조건에 더해진다) */
  conditions?: EventConditions
}

export interface GameEvent {
  id: string
  category: EventCategory
  emoji: string
  /** 제목·본문·선택지·결과 문구에 {name} {company} {rank}와 vars의 {변수}를 쓸 수 있고, 뒤에 (이)가 (으)로 같은 조사 표기를 붙일 수 있다 */
  title: string
  text: string
  conditions?: EventConditions
  /** 등장 가중치 */
  weight: number
  /** 한 판에 한 번만 */
  once?: boolean
  /**
   * 뽑힐 때 심각도(1~3)를 굴린다. 심각할수록 결과의 체력·고과·능력치 변화가 커지고 실패 확률이 오른다
   * (배수는 src/data/balance.ts)
   */
  severity?: boolean
  /** 뽑힐 때 굴리는 변수. 문구에 {변수이름}으로 쓴다 */
  vars?: Record<string, EventVarDef>
  /** 다른 장면들. 기본 장면(title·text)과 조건이 맞는 변형 중 하나가 뽑힌다 */
  variants?: EventVariant[]
  choices: EventChoice[]
}

/** 올해 뽑힌 이벤트 한 건. 굴린 값을 저장해 두어 이어하기를 해도 같은 장면이 나온다 */
export interface PendingEvent {
  id: string
  severity: Severity
  /** variants의 인덱스. 기본 장면이면 null */
  variant: number | null
  vars: Record<string, string>
}

// ─── 커뮤니티 반응 ─────────────────────────────────────

export interface FeedTemplate {
  id: string
  platform: FeedPlatform
  conditions?: {
    grades?: Grade[]
    companyTypes?: CompanyTypeId[]
    industries?: IndustryId[]
    ranks?: RankId[]
    /** 올해 고른 집중 */
    focus?: FocusId[]
    /** 올해 이런 일이 있었을 때 */
    triggers?: FeedTrigger[]
    /** 작년이 실직 공백기였을 때 (공백기 끝에 다시 취업한 첫해) */
    afterGapYear?: boolean
  }
  /**
   * {name} {company} {salary} {rank} 치환.
   * 뒤에 (이)가 · (은)는 · (을)를 · (와)과 · (으)로 를 붙여 쓰면 받침에 맞는 조사로 바뀐다
   */
  texts: string[]
}

export type FeedTrigger =
  | 'promoted' | 'jobChanged' | 'burnout' | 'companyClosed' | 'layoff' | 'exit' | 'incident'

export interface FeedPost {
  platform: FeedPlatform
  author: string
  text: string
  likes: number
}

// ─── 게임 상태 (localStorage에 저장되는 것) ──────────────

export interface Company {
  name: string
  type: CompanyTypeId
  industry: IndustryId
}

export interface JobOffer {
  company: Company
  rank: RankId
  salary: number
  /** 헤드헌터가 가져온 제안인지, 내가 지원해서 붙은 곳인지 */
  source?: 'headhunter' | 'application'
  /** 회사가 이 포지션에 책정한 협상 상한. 예전 세이브에는 없을 수 있다. */
  salaryCeiling?: number
  recruitmentPremium?: boolean
  negotiation?: { requestedSalary: number; originalSalary: number; accepted: boolean }
}

/** 채용 공고. 지원하면 서류 → 코딩테스트 → 기술 면접 → 임원 면접을 거친다 */
export interface JobPosting {
  company: Company
  rank: RankId
  /** 합격하면 받을 연봉 (만 원) */
  salary: number
  salaryCeiling?: number
  recruitmentPremium?: boolean
  applied: boolean
  /** 지원 결과: 최종 합격이면 'passed', 떨어졌으면 떨어진 단계 */
  result?: 'passed' | HiringStage
}

export type HiringStage = 'resume' | 'codingTest' | 'techInterview' | 'finalInterview'

export interface ApplicationResult {
  posting: JobPosting
  /** 통과한 단계들. 마지막 단계에서 떨어졌으면 failedAt에 표시 */
  passed: HiringStage[]
  failedAt: HiringStage | null
}

export interface Profile {
  name: string
  emoji: string
  startAge: number
  education: EducationId
  specialty: SpecialtyId
  playStyle: PlayStyleId
  /** 집중 육성 능력치 (최대 2개) */
  focusStats: StatKey[]
}

export interface EventLogEntry {
  eventId: string
  choiceIndex: number
  outcomeText: string
  /** 그때 화면에 보인 제목 (이모지 포함, 변수가 채워진 것). 예전 세이브에는 없을 수 있다 */
  title?: string
  /** 심각도를 굴린 이벤트였다면 그 값 */
  severity?: Severity
}

export interface YearRecord {
  /** 실직 후 취업 준비로 보낸 해 */
  gap?: boolean
  calendarYear: number
  age: number
  company: Company
  rank: RankId
  focus: FocusId
  grade: Grade
  salaryBefore: number
  salaryAfter: number
  statsBefore: Stats
  statsAfter: Stats
  events: EventLogEntry[]
  triggers: FeedTrigger[]
  feed: FeedPost[]
}

export type Phase =
  | 'year_start'  // 올해의 집중 선택
  | 'event'       // 이벤트 선택 중
  | 'year_end'    // 연말 결과 화면
  | 'hub'         // 확인할 일 (이직 제안 등)
  | 'retired'

export type RetireReason = 'age' | 'voluntary' | 'burnout' | 'startup_quit' | 'chicken'

/** 치킨집 창업 결과: 프랜차이즈 대박 · 동네 맛집 · 폐업 */
export type ChickenOutcome = 'franchise' | 'local' | 'closed'

export interface Retirement {
  reason: RetireReason
  fameScore: number
  fameGrade: FameGrade
  title: string
  /** reason이 'chicken'일 때만 */
  chicken?: ChickenOutcome
}

export interface GameState {
  version: 1
  seed: number
  /** 시드 RNG의 현재 내부 상태 — 저장 후 이어하기에도 같은 결과가 나오게 */
  rngState: number

  profile: Profile
  phase: Phase

  /** 경력 연차 (첫 해 = 1) */
  careerYear: number
  calendarYear: number
  age: number

  stats: Stats
  /** 0~100. 0이 되면 번아웃 */
  stamina: number
  /** 연봉 (만 원) */
  salary: number
  /** 자산 (만 원) */
  assets: number

  rank: RankId
  /** 지금까지 오른 가장 높은 직책 (엔딩 명성 계산용) */
  bestRank: RankId
  /** 리드 이후 갈 트랙. 리드 도달 후 허브에서 고른다 */
  preferredTrack: 'manager' | 'ic' | null
  company: Company
  yearsAtCompany: number
  yearsAtRank: number
  /** 회사가 망하거나 권고사직 → 이직 제안 중 하나를 골라야 다음 해로 갈 수 있다 */
  unemployed: boolean

  /** 올해 선택한 집중 */
  focus: FocusId | null
  /** 올해 남은 이벤트. 예전 세이브에는 굴린 값 없이 id 문자열만 들어 있을 수 있다 */
  pendingEvents: (string | PendingEvent)[]
  /** 올해 고른 이벤트 기록 */
  yearEvents: EventLogEntry[]
  /** 올해 고과에 더해질 점수 */
  gradeBonus: number
  /** 올해 연말 이직 제안 수에 더해질 값 (이벤트로 생김). 예전 세이브에는 없을 수 있다 */
  offerBonus?: number
  /** 연초 시점 스냅샷 (연말 결과 화면의 변화량 계산용) */
  yearStart: { stats: Stats; salary: number }

  offers: JobOffer[]
  /** 허브에서 생겨 다음 해 연말 피드에 반영할 사건 (이직). 예전 세이브에는 없을 수 있다 */
  pendingFeedTriggers?: FeedTrigger[]
  /** 이번 허브의 채용 공고. 예전 세이브에는 없을 수 있다 */
  postings?: JobPosting[]
  /** 이번 허브에서 남은 지원 횟수 */
  applicationsLeft?: number
  flags: Flag[]
  counters: Record<CounterKey, number>
  achievements: string[]
  /** once 이벤트 재등장 방지 */
  seenEvents: string[]
  /** 이벤트 id → 마지막으로 나온 달력 연도 (반복 방지용). 예전 세이브에는 없을 수 있다 */
  eventLastSeen?: Record<string, number>

  history: YearRecord[]
  retirement: Retirement | null
}
