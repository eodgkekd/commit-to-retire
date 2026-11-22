import type { GameEvent } from '../engine/types'

// 이벤트 콘텐츠. 형식은 src/engine/types.ts의 GameEvent.
// - 선택지마다 outcomes의 chance 합은 1 (data.test.ts가 검사)
// - 확률과 능력치 판정(check)은 플레이어에게 보이지 않는다. check가 있는 선택지는 실패(unlucky)와 성공 결과가 모두 필요
// - 문구는 해요체
// - 자주 나오는 이벤트는 볼 때마다 달라지게 한다:
//   severity: true → 뽑힐 때 심각도(1 가벼움 · 2 보통 · 3 큰일)를 굴려 결과의 체력·고과·능력치 변화와 실패 확률이 달라진다
//   vars → 뽑힐 때 굴리는 변수. 문구에 {이름}으로 쓰고, 뒤에 (이)가 · (을)를 · (으)로 같은 조사 표기를 붙일 수 있다.
//          bySeverity로 심각도별 후보를 따로 둘 수 있다. {name} {company} {rank}는 언제나 쓸 수 있다
//   {boss} → 내 바로 위 상사 호칭. 시니어까지 팀장, 리드급 본부장, 디렉터급 상무, 그 위는 대표.
//          '내 상사'를 가리킬 때는 '팀장'을 직접 쓰지 말고 {boss}를 쓴다 (팀장급에게 '팀장이 시켰다'가 나오지 않게)
//   variants → 같은 선택지를 쓰는 다른 장면(제목·본문). 결과 문구와 어긋나지 않게 쓴다

const STARTUPS = ['seed', 'series_b', 'unicorn'] as const

export const events: GameEvent[] = [
  // ─── 장애 ──────────────────────────────────────────────
  {
    id: 'friday_deploy',
    category: '장애',
    emoji: '🚨',
    title: '금요일 {hour}시 배포',
    text: "{boss}(이)가 '{change} 정도는 간단하니까 지금 배포하고 퇴근하자'고 해요.",
    weight: 10,
    severity: true,
    vars: {
      hour: { min: 17, max: 19 },
      change: {
        bySeverity: [
          ['버튼 문구 수정', '오타 수정', '배너 이미지 교체'],
          ['쿠폰 기능', '검색 필터 개편', '알림 설정 화면'],
          ['결제 모듈 교체', '회원 DB 마이그레이션', '로그인 방식 개편'],
        ],
      },
    },
    variants: [
      {
        title: '연휴 전날 배포',
        text: "내일부터 연휴예요. {boss}(이)가 '{change} 정도는 올리고 가자'고 해요. 다들 벌써 가방을 싸고 있어요.",
      },
      {
        title: '공지 없는 {hour}시 배포',
        text: "오늘은 금요일이에요. {boss}(이)가 '{change} 정도는 공지 없이 조용히 올리자'고 해요.",
      },
    ],
    choices: [
      {
        label: '그냥 배포한다',
        outcomes: [
          { chance: 0.6, text: '무사히 퇴근했어요.', tone: 'lucky', effects: {} },
          {
            chance: 0.4,
            text: '{change}(이)가 터져서 주말 내내 롤백했어요.',
            tone: 'unlucky',
            effects: { stamina: -20, stats: { reputation: -2 }, counters: { incidents: 1 }, achievement: 'weekend_rollback' },
          },
        ],
      },
      {
        label: '월요일에 하자고 설득한다',
        check: { communication: 40 },
        outcomes: [
          { chance: 0.7, text: '{boss}(이)가 마지못해 동의했어요.', tone: 'skill', effects: { stats: { communication: 2 } } },
          {
            chance: 0.3,
            text: "{boss}(이)가 '말 많네' 하며 그냥 배포했어요. 주말이 날아갔어요.",
            tone: 'unlucky',
            effects: { stamina: -15, counters: { incidents: 1 }, achievement: 'weekend_rollback' },
          },
        ],
      },
    ],
  },
  {
    id: 'dawn_db_lock',
    category: '장애',
    emoji: '🌙',
    title: '새벽 {hour}시 DB 락',
    text: '알림이 울려요. {table} 테이블에 락이 걸려서 {scope}.',
    weight: 8,
    severity: true,
    vars: {
      hour: { min: 2, max: 5 },
      table: ['주문', '결제', '회원', '재고', '정산'],
      scope: {
        bySeverity: [
          ['관리자 화면이 느려졌어요', '일부 요청이 밀리고 있어요'],
          ['서비스가 멈췄어요', '앱이 계속 로딩만 돌아요'],
          ['서비스 전체가 멈췄고 대표님 전화가 오고 있어요', '서비스 전체가 멈췄고 실시간 검색어에 올랐어요'],
        ],
      },
      minutes: { bySeverity: [{ min: 5, max: 15 }, { min: 20, max: 40 }, { min: 50, max: 90 }] },
    },
    variants: [
      {
        title: '연휴 새벽 {hour}시 DB 락',
        text: '연휴 당직인데 알림이 울려요. {table} 테이블에 락이 걸려서 {scope}.',
      },
    ],
    choices: [
      {
        label: '혼자 원인을 찾는다',
        check: { coding: 50 },
        outcomes: [
          { chance: 0.7, text: '{minutes}분 만에 범인 쿼리를 찾아 죽였어요. 아침에 {boss}(이)가 칭찬했어요.', tone: 'skill', effects: { stamina: -8, gradeBonus: 8, counters: { incidents: 1 } } },
          { chance: 0.3, text: '해 뜰 때까지 헤맸어요. 결국 선배가 5분 만에 해결했어요.', tone: 'unlucky', effects: { stamina: -15, stats: { coding: 2 }, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '선배를 깨운다',
        outcomes: [
          { chance: 1, text: '선배가 해결했어요. 대신 선배 눈빛이 일주일 동안 차가웠어요.', effects: { stamina: -5, stats: { domain: 2 }, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '못 본 척 다시 잔다',
        outcomes: [
          { chance: 0.4, text: '다른 사람이 처리했어요. 아무도 모르는 것 같아요.', tone: 'lucky', effects: { stamina: 5 } },
          { chance: 0.6, text: '아침 회의에서 알림 수신 기록이 공개됐어요.', tone: 'unlucky', effects: { gradeBonus: -20, stats: { reputation: -3 } } },
        ],
      },
    ],
  },
  {
    id: 'black_friday',
    category: '장애',
    emoji: '🛒',
    title: '블랙프라이데이 트래픽 폭주',
    text: '평소의 {times}배 트래픽이 몰려와요. {api} 응답이 {seconds}초를 넘겼어요.',
    weight: 8,
    conditions: { industries: ['commerce', 'b2c'] },
    severity: true,
    vars: {
      times: { bySeverity: [{ min: 5, max: 10 }, { min: 20, max: 30 }, { min: 50, max: 100 }] },
      api: ['결제 서버', '주문 API', '상품 목록', '장바구니'],
      seconds: { min: 5, max: 15 },
    },
    variants: [
      {
        title: '연예인 SNS 한 줄에 트래픽 폭주',
        text: '유명 연예인이 우리 서비스를 SNS에 올렸어요. 평소의 {times}배 트래픽이 몰려와서 {api} 응답이 {seconds}초를 넘겼어요.',
      },
      {
        title: '선착순 이벤트 오픈',
        text: '마케팅팀이 공지 없이 선착순 이벤트를 열었어요. 평소의 {times}배 트래픽이 몰려와서 {api} 응답이 {seconds}초를 넘겼어요.',
      },
    ],
    choices: [
      {
        label: '긴급 스케일아웃을 주도한다',
        check: { design: 50 },
        outcomes: [
          { chance: 0.75, text: '서버를 늘리고 캐시를 붙여 버텼어요. 사내 공지에 이름이 올라갔어요.', tone: 'skill', effects: { stamina: -15, gradeBonus: 15, stats: { reputation: 3 }, counters: { incidents: 1 } } },
          { chance: 0.25, text: '늘린 서버가 DB를 더 괴롭혔어요. 매출 손실 보고서를 썼어요.', tone: 'unlucky', effects: { stamina: -20, gradeBonus: -5, stats: { design: 3 }, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '시키는 대로 로그만 본다',
        outcomes: [
          { chance: 1, text: '밤새 로그를 봤어요. 많이 배웠지만 아무도 기억하지 않아요.', effects: { stamina: -12, stats: { domain: 3 }, counters: { incidents: 1 } } },
        ],
      },
    ],
  },

  // ─── 레거시 ────────────────────────────────────────────
  {
    id: 'legacy_no_comment',
    category: '레거시',
    emoji: '🦴',
    title: '주석 없는 {age}년 된 코드',
    text: '{lines}줄짜리 함수를 고쳐야 해요. 변수 이름이 전부 {names} 같은 식이에요.',
    weight: 9,
    severity: true,
    vars: {
      age: { min: 8, max: 25 },
      lines: { bySeverity: [['300', '500'], ['2,000', '3,000'], ['8,000', '12,000']] },
      names: ['a1, a2, temp3', 'data, data2, dataFinal', 'x, xx, xxx', 'tmp, tmp_new, tmp_real'],
    },
    variants: [
      {
        title: '퇴사자가 남긴 {age}년 된 배치',
        text: '아무도 내용을 모르는 {lines}줄짜리 배치를 고쳐야 해요. 변수 이름이 전부 {names} 같은 식이에요.',
      },
      {
        title: '외주사가 납품하고 사라진 코드',
        text: '{age}년 전 외주사가 납품한 {lines}줄짜리 함수를 고쳐야 해요. 외주사는 폐업했고 변수 이름이 전부 {names} 같은 식이에요.',
      },
    ],
    choices: [
      {
        label: '이참에 리팩토링한다',
        check: { design: 40 },
        outcomes: [
          { chance: 0.6, text: '깔끔하게 쪼갰어요. 다음 사람은 덜 울 거예요.', tone: 'skill', effects: { stamina: -10, stats: { design: 4 }, counters: { refactors: 1 } } },
          { chance: 0.4, text: '리팩토링하다 숨은 정산 로직을 깨뜨렸어요. 경위서를 썼어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -15, stats: { design: 2 }, counters: { refactors: 1 } } },
        ],
      },
      {
        label: '필요한 한 줄만 고친다',
        outcomes: [
          { chance: 1, text: '한 줄 고치고 조용히 커밋했어요. 기술 부채가 또 쌓였어요.', effects: { stats: { domain: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'do_not_touch',
    category: '레거시',
    emoji: '⚠️',
    title: '"건드리지 마시오" 모듈',
    text: '주석에 "{warning}. {year}년 {author}"(이)라고 적혀 있어요. 그런데 여기에 버그가 있어요.',
    weight: 6,
    severity: true,
    vars: {
      warning: ['이 코드는 건드리지 마시오', '수정 금지. 이유는 묻지 마시오', '여기를 고치면 정산이 틀어짐', '건드리면 책임 못 짐'],
      year: { min: 2009, max: 2019 },
      author: ['김OO', '박OO', '퇴사한 CTO', '전설의 최 과장'],
      nights: { bySeverity: [['하룻밤을'], ['이틀 밤을', '3일 밤을'], ['일주일 내내 밤을']] },
    },
    choices: [
      {
        label: '용기를 내서 고친다',
        outcomes: [
          { chance: 0.5, text: '고쳤어요! {author} 님이 왜 그렇게 적었는지는 끝내 몰라요.', tone: 'lucky', effects: { gradeBonus: 10, stats: { coding: 2 }, counters: { refactors: 1 } } },
          { chance: 0.5, text: '왜 건드리지 말라고 했는지 알게 됐어요. {nights} 샜어요.', tone: 'unlucky', effects: { stamina: -20, stats: { coding: 3, domain: 3 }, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '바깥에서 우회 코드를 덧댄다',
        outcomes: [
          { chance: 1, text: '우회 코드 위에 "이 코드도 건드리지 마시오"라고 적었어요.', effects: { stats: { domain: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'predecessor_quit',
    category: '레거시',
    emoji: '📦',
    title: '전임자 퇴사, 인수인계 {days}',
    text: '{systems}(을)를 맡던 {who}(이)가 퇴사해요. 인수인계 문서라고 받은 건 {doc}뿐이에요.',
    weight: 7,
    severity: true,
    vars: {
      days: ['하루', '이틀', '사흘'],
      who: ['선배', '사수', '옆자리 과장님', '팀의 유일한 시니어'],
      systems: {
        bySeverity: [
          ['배치 하나', '관리자 화면 하나'],
          ['시스템 세 개', '서비스 두 개와 배치 전부'],
          ['결제 시스템 전체', '아무도 모르는 시스템 다섯 개'],
        ],
      },
      doc: ['노션 페이지 한 장', '5년 전 위키 링크 하나', '"코드 보면 알아요" 한 줄', '제목만 있는 빈 문서'],
    },
    conditions: { minCareerYear: 2 },
    choices: [
      {
        label: '남은 {days} 동안 질문 폭격을 한다',
        check: { communication: 35 },
        outcomes: [
          { chance: 0.8, text: '{who}(이)가 퇴사 전날까지 시달렸지만 덕분에 살았어요.', tone: 'skill', effects: { stamina: -8, stats: { domain: 5 } } },
          { chance: 0.2, text: "질문할 때마다 {who}(이)가 '그건 나도 몰라'만 반복했어요.", tone: 'unlucky', effects: { stamina: -8, stats: { domain: 2 } } },
        ],
      },
      {
        label: '코드 보면 알겠지 하고 보낸다',
        outcomes: [
          { chance: 0.3, text: '코드가 생각보다 읽기 쉬웠어요.', tone: 'lucky', effects: { stats: { domain: 3 } } },
          { chance: 0.7, text: '첫 장애 때 {who}에게 카톡했는데 읽씹당했어요.', tone: 'unlucky', effects: { stamina: -15, stats: { domain: 4 }, counters: { incidents: 1 } } },
        ],
      },
    ],
  },

  {
    id: 'onboarding_reality',
    category: '레거시',
    emoji: '🫥',
    title: '온보딩 끝, 현실 시작',
    text: '일주일 온보딩이 끝나고 레포를 열었어요. {tests}, 배포는 {deploy}, 문서는 {docs}(이)가 전부예요. 면접 때 들은 이야기와 많이 달라요.',
    // 신입 첫 회사에서는 비교 대상이 없어서 안 나온다. 이직한 첫해에만, 자주 나온다
    weight: 40,
    conditions: { maxYearsAtCompany: 0, minJobChanges: 1 },
    vars: {
      tests: ['테스트 0개', '3년째 깨져 있는 테스트', '주석 처리된 테스트 200개'],
      deploy: ['FTP', '{boss} PC에서 수동 빌드', '금요일 밤 일괄 배포'],
      docs: ['3년 전 위키', '퇴사자의 개인 노션', '엑셀 파일 하나'],
    },
    variants: [
      {
        title: '면접 때 들은 "최신 기술 스택"',
        text: '면접 때 "최신 기술 스택을 써요"라고 들었는데 레포를 열어 보니 {tests}, 배포는 {deploy}, 문서는 {docs}(이)가 전부예요.',
      },
    ],
    choices: [
      {
        label: '개선안을 정리해서 제안한다',
        check: { communication: 45, design: 45 },
        outcomes: [
          { chance: 0.6, text: '{boss}(이)가 반가워하며 CI 도입을 맡겼어요. 새 회사에서 존재감이 생겼어요.', tone: 'skill', effects: { stats: { design: 3, reputation: 1 }, gradeBonus: 10 } },
          { chance: 0.4, text: '"원래 이렇게 해 왔어요" 한마디로 끝났어요. 들어오자마자 불평하는 사람으로 찍혔어요.', tone: 'unlucky', effects: { gradeBonus: -10, stamina: -5 } },
        ],
      },
      {
        label: '혼자서라도 CI를 붙인다',
        check: { coding: 55 },
        outcomes: [
          { chance: 0.6, text: '조용히 붙여 둔 자동 배포를 팀원들이 하나둘 쓰기 시작했어요.', tone: 'skill', effects: { stats: { coding: 2, design: 2, reputation: 2 }, counters: { refactors: 1 } } },
          { chance: 0.4, text: '내 PR만 빌드가 깨져서 "왜 혼자 다르게 하냐"는 눈총을 받았어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -5 } },
        ],
      },
      {
        label: '일단 적응한다',
        outcomes: [
          { chance: 1, text: '3개월이 지나니 {deploy} 배포도 손에 익었어요. 이게 맞나 싶지만요.', effects: { stats: { domain: 3 }, stamina: -5 } },
        ],
      },
    ],
  },

  {
    id: 'late_realization',
    category: '레거시',
    emoji: '🍻',
    title: '우리 회사만 이상했어요',
    text: '{where}에서 다들 "{question}", "{followup}"라고 물어요. 3년 가까이 다니면서 원래 다 이런 줄 알았어요.',
    // 신입은 첫 회사의 문제를 모르다가 2~3년차에 비교 대상을 만나 깨닫는다 (이직 후 버전은 onboarding_reality)
    weight: 12,
    once: true,
    conditions: { minCareerYear: 2, maxCareerYear: 3, maxJobChanges: 0 },
    vars: {
      where: ['대학 동기 모임', '부트캠프 동기 단톡방', '개발자 밋업 뒤풀이'],
      question: ['CI 안 돌려?', '배포 자동화 안 했어?', '스테이징 서버 없어?'],
      followup: ['코드리뷰 안 해?', '테스트 커버리지 몇이야?', '장애 회고 안 써?'],
    },
    choices: [
      {
        label: '이직 준비를 시작한다',
        outcomes: [
          { chance: 1, text: '링크드아웃 프로필을 3년 만에 업데이트했어요. 헤드헌터 연락이 오기 시작했어요.', effects: { offerBonus: 2, stats: { reputation: 1 } } },
        ],
      },
      {
        label: '우리 회사부터 바꿔본다',
        check: { communication: 45, design: 40 },
        outcomes: [
          { chance: 0.6, text: '팀에 코드리뷰를 도입했어요. 선배들도 처음엔 투덜대더니 이제는 먼저 리뷰를 요청해요.', tone: 'skill', effects: { stats: { design: 3, communication: 2, reputation: 1 }, gradeBonus: 5 } },
          { chance: 0.4, text: '"연차도 낮은 사람이 뭘 안다고"라는 말을 들었어요.', tone: 'unlucky', effects: { gradeBonus: -10, stamina: -10 } },
        ],
      },
      {
        label: '모르는 게 약이었다',
        outcomes: [
          { chance: 1, text: '{where} 이후로 그런 얘기는 피해요. 오늘도 손으로 배포해요.', effects: { stamina: 5, stats: { domain: 2 } } },
        ],
      },
    ],
  },

  // ─── 일정 ──────────────────────────────────────────────
  {
    id: 'spec_change_d3',
    category: '일정',
    emoji: '📅',
    title: '오픈 D-{days}, 기획 변경',
    text: '기획자가 "아주 작은 변경"이라며 {change}(을)를 바꿔 왔어요. 오픈일은 그대로예요.',
    weight: 9,
    severity: true,
    vars: {
      days: { min: 2, max: 5 },
      change: {
        bySeverity: [
          ['버튼 위치', '문구 몇 개', '메인 색상'],
          ['화면 흐름 전체', '회원가입 단계', '검색 결과 화면'],
          ['결제 방식', '서비스 컨셉', '타깃 고객'],
        ],
      },
    },
    variants: [
      {
        title: '오픈 D-{days}, 대표님의 한마디',
        text: '대표님이 시연을 보더니 "{change}만 좀 바꾸자"고 했어요. 오픈일은 그대로예요.',
      },
      {
        title: '오픈 D-{days}, 고객사 요청',
        text: '고객사 담당자가 "{change}만 수정해 주세요"라고 메일을 보냈어요. 계약서의 오픈일은 그대로예요.',
        conditions: { industries: ['si_sm', 'public'] },
      },
    ],
    choices: [
      {
        label: '밤새서 맞춘다',
        outcomes: [
          { chance: 0.7, text: '오픈은 지켰어요. 거울 속 내가 낯설어요.', effects: { stamina: -20, gradeBonus: 10 } },
          { chance: 0.3, text: '오픈 당일 버그가 터졌어요. 밤샌 보람이 없었어요.', tone: 'unlucky', effects: { stamina: -25, gradeBonus: -5, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '범위를 줄이자고 협상한다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.8, text: '핵심만 넣고 나머지는 2차 오픈으로 미뤘어요.', tone: 'skill', effects: { stats: { communication: 3 }, gradeBonus: 5 } },
          { chance: 0.2, text: '임원이 "그냥 다 해"라고 했어요.', tone: 'unlucky', effects: { stamina: -15 } },
        ],
      },
    ],
  },
  {
    id: 'simple_by_tomorrow',
    category: '일정',
    emoji: '⏰',
    title: '"간단한 거니까 {when}"',
    text: '{who}(이)가 {feature} 기능을 {when} 해 달래요. 열어 보니 {needs}(이)가 다 필요해요.',
    weight: 8,
    severity: true,
    vars: {
      who: ['{boss}', '기획자', '옆 팀 팀장', '대표님'],
      when: ['내일까지', '오늘 퇴근 전까지', '이번 주 안에'],
      feature: {
        bySeverity: [
          ['엑셀 다운로드', '정렬 옵션', '관리자 메모 칸'],
          ['통계 대시보드', '알림 발송', '권한 관리 화면'],
          ['정산 시스템', '추천 알고리즘', '다국어 지원'],
        ],
      },
      needs: ['권한·필터·대용량 처리', '예외 처리·로그·테스트', '외부 연동·보안 검토·데이터 이전'],
    },
    choices: [
      {
        label: '일단 된다고 한다',
        outcomes: [
          { chance: 0.5, text: '대충 만들어서 넘겼어요. 3개월 뒤 대용량에서 터졌어요.', tone: 'unlucky', effects: { stamina: -10, counters: { incidents: 1 } } },
          { chance: 0.5, text: '어떻게든 해냈어요. {who}(은)는 역시 간단했다고 생각해요.', effects: { stamina: -15, stats: { coding: 2 } } },
        ],
      },
      {
        label: '작업 범위를 쪼개서 일정을 다시 잡는다',
        check: { design: 45 },
        outcomes: [
          { chance: 0.7, text: '{who}(이)가 "이게 이렇게 큰 거였어?"라며 일주일을 줬어요.', tone: 'skill', effects: { stats: { design: 2, communication: 2 } } },
          { chance: 0.3, text: '{who}(이)가 "그래서 {when} 되냐고"라고 다시 물었어요. 밤을 샜어요.', tone: 'unlucky', effects: { stamina: -15, stats: { design: 1 } } },
        ],
      },
    ],
  },

  // ─── 사람 ──────────────────────────────────────────────
  {
    id: 'soju_shower',
    category: '사람',
    emoji: '🍶',
    title: '회식 자리 소주 세례',
    text: '2차 노래방 가기 전, 취한 동료가 갑자기 내 얼굴에 소주를 뿌렸어요. 다들 얼어붙었어요.',
    // TODO: 지인 공유 단계라 일부러 자주 나오게 둠 (한 판 약 87%). 나중에 1로 낮춰 레어 이벤트로 (기획서 13장)
    weight: 1,
    once: true,
    choices: [
      {
        label: '웃으며 넘긴다',
        outcomes: [
          { chance: 0.6, text: '"아 시원하다~" 한마디에 분위기가 풀렸어요. 다음 날 동료가 커피를 사 왔어요.', tone: 'skill', effects: { stamina: -5, stats: { communication: 3 }, achievement: 'soju_shower' } },
          { chance: 0.4, text: '웃어넘겼더니 그 동료가 회식 때마다 같은 장난을 쳐요.', tone: 'unlucky', effects: { stamina: -15, achievement: 'soju_shower' } },
        ],
      },
      {
        label: '맥주로 맞받아친다',
        outcomes: [
          { chance: 0.5, text: '테이블 전체가 물싸움판이 됐어요. 팀 회식 레전드로 남았어요.', tone: 'lucky', effects: { stats: { communication: 4, reputation: 1 }, achievement: 'soju_shower' } },
          { chance: 0.5, text: '사장님이 경찰을 불렀어요. 다음 날 인사팀 면담을 했어요.', tone: 'unlucky', effects: { gradeBonus: -15, stats: { reputation: -2 }, achievement: 'soju_shower' } },
        ],
      },
      {
        label: '다음 날 인사팀에 신고한다',
        outcomes: [
          { chance: 0.6, text: '동료가 징계를 받고 정식으로 사과했어요. 회식 문화도 조금 바뀌었어요.', tone: 'skill', effects: { stamina: 5, achievement: 'soju_shower' } },
          { chance: 0.4, text: '흐지부지 끝났고 "예민한 사람"이라는 뒷말만 남았어요.', tone: 'unlucky', effects: { stats: { communication: -2 }, gradeBonus: -5, achievement: 'soju_shower' } },
        ],
      },
      {
        label: '블라인더에 올린다',
        outcomes: [
          { chance: 0.5, text: '글이 조회수 10만을 찍고 기사까지 났어요. 회사가 공식 사과문을 냈어요.', tone: 'lucky', effects: { stats: { reputation: 3 }, achievement: 'soju_shower' } },
          { chance: 0.5, text: '세 줄 만에 회사 사람들이 글쓴이를 특정했어요. 팀 분위기가 싸해졌어요.', tone: 'unlucky', effects: { gradeBonus: -10, stamina: -10, achievement: 'soju_shower' } },
        ],
      },
    ],
  },
  {
    id: 'kkondae_pm',
    category: '사람',
    emoji: '🙄',
    title: '"{quote}"',
    text: '{who}(이)가 회의에서 기술 검토 없이 일정을 확정하고, 질문하자 이렇게 말했어요.',
    weight: 7,
    vars: {
      who: ['PM', '기획 팀장', '사업부 이사', '영업 담당'],
      quote: [
        '개발자는 코딩만 하면 되잖아요',
        '그건 개발에서 알아서 해야죠',
        '기술적인 건 모르겠고 날짜만 맞춰 주세요',
        '다른 회사는 이틀이면 한다던데요',
      ],
    },
    choices: [
      {
        label: '데이터로 반박한다',
        check: { communication: 45, domain: 40 },
        outcomes: [
          { chance: 0.7, text: '지난 프로젝트 지연 통계를 보여줬더니 {who}(이)가 조용해졌어요.', tone: 'skill', effects: { stats: { communication: 3 }, gradeBonus: 5 } },
          { chance: 0.3, text: '맞는 말이었지만 임원이 {who} 편을 들었어요.', tone: 'unlucky', effects: { gradeBonus: -5 } },
        ],
      },
      {
        label: '참고 코딩만 한다',
        outcomes: [
          { chance: 1, text: '예상대로 일정이 밀렸고, 책임은 개발팀이 졌어요.', effects: { stamina: -10, gradeBonus: -5 } },
        ],
      },
    ],
  },
  {
    id: 'genius_junior',
    category: '사람',
    emoji: '🧒',
    title: '천재 {newcomer}(이)가 들어왔어요',
    text: '{newcomer}(이)가 첫 주에 내 코드의 {found} 찾아서 PR을 올렸어요.',
    weight: 5,
    conditions: { minCareerYear: 4 },
    vars: {
      newcomer: ['신입', '인턴', '전직 대회 수상자 신입', '고등학생 출신 신입'],
      found: ['버그 다섯 개를', '메모리 누수를', '3년 묵은 레이스 컨디션을', '보안 취약점 두 개를'],
    },
    choices: [
      {
        label: '제대로 키워 준다',
        outcomes: [
          { chance: 1, text: '멘토링하면서 나도 많이 배웠어요. {newcomer}(은)는 1년 만에 팀 에이스가 됐어요.', tone: 'skill', effects: { stats: { communication: 4, design: 2 } } },
        ],
      },
      {
        label: '경쟁심에 불타 공부한다',
        outcomes: [
          { chance: 1, text: '자존심 때문에 주말마다 공부했어요. 실력은 늘었는데 피곤해요.', effects: { stamina: -12, stats: { coding: 5 } } },
        ],
      },
    ],
  },
  {
    id: 'code_review_war',
    category: '사람',
    emoji: '💬',
    title: '코드리뷰 코멘트 {count}개',
    text: '내 PR에 {reviewer}(이)가 코멘트 {count}개를 달았어요. 절반은 {taste} 취향이에요.',
    weight: 7,
    conditions: { maxCareerYear: 12 },
    vars: {
      count: { min: 60, max: 200 },
      reviewer: ['시니어', '옆 팀 테크리드', '새로 온 팀장', '깐깐하기로 유명한 선배'],
      taste: ['들여쓰기', '변수 이름', '줄바꿈 위치', '세미콜론'],
    },
    variants: [
      {
        title: '금요일 밤에 달린 코멘트 {count}개',
        text: '금요일 밤 11시, {reviewer}(이)가 내 PR에 코멘트 {count}개를 달았어요. 절반은 {taste} 취향이에요.',
      },
    ],
    choices: [
      {
        label: '하나하나 다 반영한다',
        outcomes: [
          { chance: 1, text: '다 고쳤어요. {reviewer}의 취향을 완벽히 외우게 됐어요.', effects: { stamina: -8, stats: { coding: 3 } } },
        ],
      },
      {
        label: '린터 규칙으로 정리하자고 제안한다',
        check: { communication: 40 },
        outcomes: [
          { chance: 0.7, text: '팀 전체에 린터가 도입됐어요. 다들 고마워해요.', tone: 'skill', effects: { stats: { design: 2, reputation: 1 }, gradeBonus: 5 } },
          { chance: 0.3, text: '{reviewer}(이)가 "내 리뷰가 불만이냐"며 삐졌어요.', tone: 'unlucky', effects: { gradeBonus: -5 } },
        ],
      },
    ],
  },

  // ─── 커리어 ────────────────────────────────────────────
  {
    id: 'headhunter',
    category: '커리어',
    emoji: '📞',
    title: '헤드헌터의 연락',
    text: '{channel}(으)로 헤드헌터가 연락했어요. "연봉 {raise}% 인상 가능한 포지션이 있어요."',
    weight: 6,
    vars: {
      channel: ['링크드아웃', '메일', '문자', '전화'],
      raise: { min: 20, max: 40 },
    },
    variants: [
      {
        title: '전 동료의 스카우트',
        text: '이직한 전 동료가 {channel}(으)로 연락했어요. "우리 회사 올래? 연봉 {raise}%는 더 줄 거야."',
      },
    ],
    conditions: { minCareerYear: 3 },
    choices: [
      {
        label: '이 제안을 들고 연봉 협상을 한다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.6, text: '회사가 카운터 오퍼로 연봉을 올려 줬어요.', tone: 'skill', effects: { salaryPct: 0.1 } },
          { chance: 0.4, text: '"그럼 거기 가세요"라는 답이 돌아왔어요. 분위기가 어색해요.', tone: 'unlucky', effects: { gradeBonus: -10 } },
        ],
      },
      {
        label: '정중히 거절한다',
        outcomes: [
          { chance: 1, text: '"다음에 또 연락할게요"라는 답이 왔어요.', effects: { stats: { reputation: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'stock_vs_salary',
    category: '커리어',
    emoji: '📜',
    title: '스톡옵션이냐 연봉이냐',
    text: '대표가 {place}에서 "인상 대신 스톡옵션 {shares}주를 더 줄게요. {pitch}"라고 해요.',
    weight: 7,
    conditions: { companyTypes: [...STARTUPS] },
    vars: {
      place: ['연봉 협상 자리', '1:1 면담', '회식 2차 자리', '엘리베이터 안'],
      shares: { min: 2, max: 20 },
      pitch: ['곧 상장할 거예요', '내년에 투자 받으면 열 배예요', '우리는 가족이잖아요', '유니콘들도 처음엔 다 이랬어요'],
    },
    choices: [
      {
        label: '스톡옵션을 받는다',
        outcomes: [
          { chance: 0.3, text: '회사 가치가 올라 스톡옵션 일부를 팔았어요.', tone: 'lucky', effects: { assets: 8000 } },
          { chance: 0.7, text: '종이 한 장을 받았어요. 언젠가는 돈이 되겠죠?', effects: {} },
        ],
      },
      {
        label: '현금이 최고다',
        outcomes: [
          { chance: 1, text: '연봉이 조금 올랐어요. 대표 표정이 조금 서운해 보여요.', effects: { salaryPct: 0.06, gradeBonus: -3 } },
        ],
      },
    ],
  },

  // ─── 회사 ──────────────────────────────────────────────
  {
    id: 'layoff_rumor',
    category: '회사',
    emoji: '😰',
    title: '구조조정 소문',
    text: '{source}에 "다음 달 {org} {percent}% 감축"이라는 글이 올라왔어요.',
    weight: 5,
    vars: {
      source: ['블라인더', '사내 메신저 익명방', '업계 지라시 단톡방'],
      org: ['개발 조직', '신사업 본부', '전사', '우리 팀이 속한 본부'],
      percent: { min: 10, max: 40 },
    },
    variants: [
      {
        title: '갑자기 잡힌 전사 타운홀',
        text: '내일 아침 전사 타운홀이 갑자기 잡혔어요. {source}에는 벌써 "{org} {percent}% 감축"이라는 말이 돌아요.',
      },
    ],
    choices: [
      {
        label: '눈에 띄는 성과를 만든다',
        outcomes: [
          { chance: 1, text: '야근하며 성과를 쌓았어요. 소문은 소문으로 끝났어요.', effects: { stamina: -15, gradeBonus: 10 } },
        ],
      },
      {
        label: '조용히 이력서를 업데이트한다',
        outcomes: [
          { chance: 1, text: '이력서를 정리하다 보니 내가 뭘 했는지 돌아보게 됐어요.', effects: { stats: { reputation: 2 }, gradeBonus: -5 } },
        ],
      },
    ],
  },
  {
    id: 'si_client_demand',
    category: '회사',
    emoji: '🤝',
    title: '갑님의 요구사항',
    text: '고객사 {boss}(이)가 "{what}(이)가 마음에 안 드니 {deadline} 시안 {count}개"를 요청했어요.',
    weight: 9,
    conditions: { industries: ['si_sm', 'public'] },
    vars: {
      boss: ['부장님', '상무님', '담당 과장님', '새로 온 팀장님'],
      what: ['버튼 색', '메인 화면 배치', '글꼴', '로고 크기'],
      deadline: ['오늘 밤까지', '내일 아침 회의 전까지', '주말 지나고 월요일까지'],
      count: { min: 5, max: 12 },
    },
    variants: [
      {
        title: '갑님의 "느낌" 요청',
        text: '고객사 {boss}(이)가 "{what}에서 좀 더 고급스러운 느낌이 나게, {deadline} 시안 {count}개"를 요청했어요.',
      },
    ],
    choices: [
      {
        label: '{count}개 다 만든다',
        outcomes: [
          { chance: 1, text: '{boss}(이)가 결국 첫 번째 시안을 골랐어요.', effects: { stamina: -15, stats: { domain: 2 }, gradeBonus: 5 } },
        ],
      },
      {
        label: '3개만 만들고 설득한다',
        check: { communication: 45 },
        outcomes: [
          { chance: 0.6, text: '"전문가 의견이 그렇다면야" 하며 넘어갔어요.', tone: 'skill', effects: { stats: { communication: 3 } } },
          { chance: 0.4, text: '{boss}(이)가 우리 회사 대표에게 전화했어요.', tone: 'unlucky', effects: { gradeBonus: -15 } },
        ],
      },
    ],
  },
  {
    id: 'game_crunch',
    category: '회사',
    emoji: '🎮',
    title: '출시 전 크런치 모드',
    text: '{milestone} {weeks}주 전, 회사가 "{schedule} + {perk} 제공"을 공지했어요.',
    weight: 9,
    conditions: { industries: ['game'] },
    vars: {
      milestone: ['출시', '대규모 업데이트', '글로벌 오픈', '지스타 시연'],
      weeks: { min: 4, max: 8 },
      schedule: ['주 6일 근무', '매일 밤 10시까지 근무', '주말 교대 근무'],
      perk: ['야식', '안마의자', '택시비', '에너지 드링크 무제한'],
      rating: ['2.1', '1.8', '2.4'],
    },
    choices: [
      {
        label: '불태운다',
        outcomes: [
          { chance: 0.4, text: '{milestone} 대박 났어요! 성과급이 나왔어요.', tone: 'lucky', effects: { stamina: -25, assets: 3000, stats: { reputation: 3 }, gradeBonus: 10 } },
          { chance: 0.6, text: '{milestone}(은)는 했는데 리뷰 평점이 {rating}이에요.', tone: 'unlucky', effects: { stamina: -25, stats: { coding: 3 } } },
        ],
      },
      {
        label: '정시 퇴근을 지킨다',
        outcomes: [
          { chance: 1, text: '몸은 지켰지만 "팀워크가 부족하다"는 평가를 받았어요.', effects: { gradeBonus: -15 } },
        ],
      },
    ],
  },
  {
    id: 'security_audit',
    category: '회사',
    emoji: '🔒',
    title: '{auditor} 보안 감사',
    text: '감사 기간이에요. {years}년치 {evidence}(을)를 {deadline} 정리해야 해요.',
    weight: 8,
    conditions: { industries: ['fintech'] },
    vars: {
      auditor: ['금융감독원', '내부 감사팀', '외부 보안 인증 심사'],
      years: { min: 2, max: 5 },
      evidence: ['접근 로그와 개발 산출물', '권한 변경 이력', '배포 승인 기록'],
      deadline: ['내일까지', '이번 주 안에', '오늘 퇴근 전까지'],
    },
    choices: [
      {
        label: '꼼꼼하게 정리한다',
        outcomes: [
          { chance: 1, text: '지적 사항 0건으로 끝났어요. 아무도 축하해 주지 않았지만요.', effects: { stamina: -12, stats: { domain: 4 } } },
        ],
      },
      {
        label: '자동화 스크립트를 짠다',
        check: { coding: 55 },
        outcomes: [
          { chance: 0.8, text: '다음 감사부터는 버튼 하나로 끝나요. 팀의 영웅이 됐어요.', tone: 'skill', effects: { stats: { coding: 2, reputation: 2 }, gradeBonus: 10 } },
          { chance: 0.2, text: '스크립트가 로그 일부를 빼먹어서 지적을 받았어요.', tone: 'unlucky', effects: { gradeBonus: -10 } },
        ],
      },
    ],
  },

  // ─── 업계 ──────────────────────────────────────────────
  {
    id: 'ai_replaces_me',
    category: '업계',
    emoji: '🤖',
    title: 'AI가 내 업무를 대신해요',
    text: '회사가 {tool}(을)를 도입했어요. 내가 하던 {task}(을)를 AI가 {minutes}분 만에 끝내요.',
    weight: 8,
    vars: {
      tool: ['AI 코딩 에이전트', 'AI 페어 프로그래머', '사내 AI 개발 봇'],
      task: ['CRUD 작업', '테스트 코드 작성', 'API 문서 정리', '버그 수정'],
      minutes: { min: 5, max: 30 },
    },
    variants: [
      {
        title: '후배가 AI로 나보다 빨라요',
        text: '입사 1년 차 후배가 {tool}(으)로 내가 일주일 걸리던 {task}(을)를 {minutes}분 만에 끝냈어요.',
        conditions: { minCareerYear: 5 },
      },
      {
        title: 'AI 도입 후 팀 정원 조정',
        text: '{tool} 도입 뒤 팀 정원을 줄인다는 얘기가 돌아요. 내가 하던 {task}(은)는 이제 AI가 {minutes}분이면 해요.',
      },
    ],
    conditions: { minCalendarYear: 2028 },
    choices: [
      {
        label: 'AI를 부리는 사람이 된다',
        outcomes: [
          { chance: 1, text: 'AI에게 맡기고 나는 설계와 리뷰에 집중했어요.', tone: 'skill', effects: { stats: { design: 4, coding: -2 }, gradeBonus: 5 } },
        ],
      },
      {
        label: '손코딩의 가치를 믿는다',
        outcomes: [
          { chance: 0.3, text: 'AI가 만든 버그를 내가 잡았어요. 장인 정신이 빛났어요.', tone: 'lucky', effects: { stats: { coding: 3 } } },
          { chance: 0.7, text: '내 생산성이 팀 꼴찌가 됐어요.', tone: 'unlucky', effects: { gradeBonus: -15 } },
        ],
      },
    ],
  },
  {
    id: 'msa_hype',
    category: '업계',
    emoji: '🧱',
    title: '전사 마이크로서비스 전환',
    text: '{who}(이)가 {where} 모놀리스를 서비스 {count}개로 쪼개자고 해요.',
    weight: 6,
    conditions: { minCareerYear: 3 },
    vars: {
      who: ['CTO', '새로 온 아키텍트', '대표님'],
      where: ['해외 컨퍼런스에 다녀오더니', '빅테크 견학을 다녀오더니', '기술 영상을 몰아 보더니'],
      count: { min: 20, max: 60 },
    },
    variants: [
      {
        title: '전사 쿠버네티스 전환',
        text: '{who}(이)가 {where} 서버 세 대짜리 서비스를 쿠버네티스 클러스터 {count}개로 옮기자고 해요.',
      },
    ],
    choices: [
      {
        label: '전환 TF에 자원한다',
        outcomes: [
          { chance: 0.5, text: '성공적으로 옮겼어요. 이력서에 쓸 줄이 생겼어요.', tone: 'lucky', effects: { stamina: -15, stats: { design: 5, reputation: 2 } } },
          { chance: 0.5, text: '복잡도만 {count}배가 됐어요. 장애도 같이 늘었어요.', tone: 'unlucky', effects: { stamina: -20, stats: { design: 4 }, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '"우리 규모엔 과해요"라고 말한다',
        check: { design: 55, communication: 45 },
        outcomes: [
          { chance: 0.6, text: '{who}(이)가 설득됐어요. 1년 뒤 다른 회사의 실패 사례를 보며 안도했어요.', tone: 'skill', effects: { stats: { reputation: 2 }, gradeBonus: 10 } },
          { chance: 0.4, text: '"변화를 두려워하는 사람"으로 찍혔어요.', tone: 'unlucky', effects: { gradeBonus: -10 } },
        ],
      },
    ],
  },

  // ─── 개인 ──────────────────────────────────────────────
  {
    id: 'blog_viral',
    category: '개인',
    emoji: '✍️',
    title: '기술 블로그가 터졌어요',
    text: '{topic} 삽질 기록을 정리한 글이 {site} 메인에 올라갔어요.',
    weight: 5,
    vars: {
      topic: ['DB 인덱스', '메모리 누수', '배포 자동화', '레거시 마이그레이션', '타임존 버그'],
      site: ['개발자 커뮤니티', '해외 개발자 포럼', '네모버 개발 탭'],
    },
    variants: [
      {
        title: '퇴근길에 쓴 글이 터졌어요',
        text: '퇴근길 지하철에서 대충 쓴 {topic} 이야기가 {site} 메인에 올라갔어요. 오타도 그대로예요.',
      },
    ],
    choices: [
      {
        label: '시리즈로 연재한다',
        outcomes: [
          { chance: 1, text: '구독자가 늘고 컨퍼런스 연락도 왔어요.', tone: 'skill', effects: { stamina: -8, stats: { reputation: 5, communication: 2 } } },
        ],
      },
      {
        label: '한 번의 행운으로 남긴다',
        outcomes: [
          { chance: 1, text: '댓글 몇 개에 뿌듯해하고 끝냈어요.', effects: { stats: { reputation: 2 } } },
        ],
      },
    ],
  },
  {
    id: 'opensource_pr',
    category: '개인',
    emoji: '🐙',
    title: '유명 오픈소스에 PR',
    text: '자주 쓰던 {lib}에서 {bug}(을)를 발견했어요. 메인테이너는 {maintainer}.',
    weight: 5,
    vars: {
      lib: ['날짜 라이브러리', 'HTTP 클라이언트', 'ORM', '빌드 도구', '차트 라이브러리'],
      bug: ['타임존 버그', '메모리 누수', '한글 깨짐', '경계값 버그'],
      maintainer: ['무섭기로 유명해요', '2년째 답이 없어요', '모든 PR에 테스트를 요구해요'],
    },
    choices: [
      {
        label: '테스트까지 붙여서 PR을 올린다',
        check: { coding: 55 },
        outcomes: [
          { chance: 0.6, text: 'PR이 머지됐어요! 컨트리뷰터 목록에 내 이름이 올라갔어요.', tone: 'skill', effects: { stats: { reputation: 5, coding: 2 } } },
          { chance: 0.4, text: '"이건 의도된 동작입니다"라는 한 줄과 함께 닫혔어요.', tone: 'unlucky', effects: { stats: { coding: 2 } } },
        ],
      },
      {
        label: '이슈만 남긴다',
        outcomes: [
          { chance: 1, text: '다른 사람이 내 이슈를 보고 고쳤어요. 이슈에 👍 32개.', effects: { stats: { reputation: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'conference_talk',
    category: '개인',
    emoji: '🎤',
    title: '컨퍼런스 발표 제안',
    text: '{conf}에서 {minutes}분 발표를 해 달라는 연락이 왔어요. 청중은 {people}명이에요.',
    weight: 5,
    conditions: { minCareerYear: 4 },
    vars: {
      conf: ['개발자 컨퍼런스', '사내 기술 세미나', '대학 특강', '해외 밋업'],
      minutes: ['20', '30', '40'],
      people: { min: 100, max: 1200 },
    },
    choices: [
      {
        label: '수락한다',
        outcomes: [
          { chance: 0.7, text: '발표 영상 조회수가 2만을 넘었어요.', tone: 'skill', effects: { stamina: -10, stats: { reputation: 6, communication: 3 } } },
          { chance: 0.3, text: '긴장해서 데모가 멈췄어요. 그래도 끝까지 해냈어요.', tone: 'unlucky', effects: { stamina: -15, stats: { reputation: 2, communication: 4 } } },
        ],
      },
      {
        label: '바쁘다며 거절한다',
        outcomes: [
          { chance: 1, text: '대신 나간 동기가 업계 스타가 됐어요.', effects: {} },
        ],
      },
    ],
  },

  // ─── 연차별: 신입·주니어 ──────────────────────────────
  {
    id: 'first_prod_db',
    category: '장애',
    emoji: '🗝️',
    title: '처음 받은 운영 DB 권한',
    text: '{task} 때문에 처음으로 운영 DB 권한을 받았어요. {table} 테이블을 고치는 쿼리 창에 커서가 깜빡여요.',
    weight: 9,
    conditions: { ranks: ['newbie', 'junior'] },
    severity: true,
    vars: {
      task: ['고객 데이터 수정 요청', '잘못 지급된 포인트 회수', '탈퇴 처리 오류 수정'],
      table: ['회원', '주문', '포인트', '쿠폰'],
      rows: { bySeverity: [['30건', '120건'], ['3만 건', '8만 건'], ['전체 회원 400만 건', '전체 주문 1,200만 건']] },
    },
    choices: [
      {
        label: '쿼리를 사수에게 검토받는다',
        outcomes: [
          { chance: 1, text: '사수가 "WHERE 절 확인했지?"라고 물었어요. 다행히 확인했어요.', effects: { stamina: -3, stats: { domain: 2, communication: 1 } } },
        ],
      },
      {
        label: '조심하면 되지, 바로 실행한다',
        check: { coding: 40 },
        outcomes: [
          { chance: 0.7, text: '깔끔하게 끝냈어요. 사수가 "벌써 했어?"라며 놀랐어요.', tone: 'skill', effects: { stats: { coding: 2 }, gradeBonus: 5 } },
          { chance: 0.3, text: 'WHERE 절을 빼먹어서 {rows}(이)가 한꺼번에 바뀌었어요. 백업에서 복구하느라 밤을 샜어요.', tone: 'unlucky', effects: { stamina: -15, gradeBonus: -15, stats: { domain: 3 }, counters: { incidents: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'first_toast',
    category: '사람',
    emoji: '🥂',
    title: '신입 건배사',
    text: '{occasion}에서 {boss}(이)가 "신입이 건배사 한번 해 봐"라고 해요. 모두의 시선이 쏠렸어요.',
    weight: 8,
    conditions: { ranks: ['newbie'] },
    vars: {
      occasion: ['첫 팀 회식', '본부 송년회', '워크숍 저녁 자리'],
      boss: ['팀장님', '본부장님', '대표님'],
    },
    choices: [
      {
        label: '준비해 둔 삼행시를 꺼낸다',
        check: { communication: 30 },
        outcomes: [
          { chance: 0.7, text: '{boss}(이)가 박수를 쳤어요. 다음 날부터 다들 이름을 기억해요.', tone: 'skill', effects: { stats: { communication: 2, reputation: 1 }, gradeBonus: 3 } },
          { chance: 0.3, text: '두 번째 줄에서 말이 막혔어요. 침묵 속에 "위하여"로 끝냈어요.', tone: 'unlucky', effects: { stamina: -5 } },
        ],
      },
      {
        label: '짧게 "위하여!"만 외친다',
        outcomes: [
          { chance: 1, text: '무난하게 넘어갔어요. 아무도 기억하지 않아요.', effects: {} },
        ],
      },
    ],
  },
  {
    id: 'estimate_ask',
    category: '일정',
    emoji: '🧮',
    title: '"이거 며칠 걸려요?"',
    text: '{who}(이)가 {feature} 작업을 보여 주며 며칠 걸리냐고 물어요. 다들 내 입만 보고 있어요.',
    weight: 8,
    conditions: { ranks: ['newbie', 'junior', 'mid'] },
    vars: {
      who: ['팀장', '기획자', 'PM'],
      feature: ['회원 탈퇴', '주문 내역 엑셀 다운로드', '푸시 알림 설정', '상품 리뷰 사진 첨부'],
      days: ['이틀', '사흘'],
    },
    choices: [
      {
        label: '"{days}이면 돼요"라고 말한다',
        outcomes: [
          { chance: 0.35, text: '진짜 {days} 만에 끝냈어요. 일 빠른 사람으로 소문났어요.', tone: 'lucky', effects: { gradeBonus: 8 } },
          { chance: 0.65, text: '{feature}에 얽힌 데이터가 생각보다 많았어요. {days}(이)가 3주가 됐어요.', tone: 'unlucky', effects: { stamina: -12, gradeBonus: -5, stats: { domain: 2 } } },
        ],
      },
      {
        label: '코드부터 보고 답하겠다고 한다',
        check: { design: 35 },
        outcomes: [
          { chance: 0.75, text: '숨은 작업까지 찾아서 2주라고 했어요. 정확히 2주 만에 끝냈어요.', tone: 'skill', effects: { stats: { design: 2 }, gradeBonus: 5 } },
          { chance: 0.25, text: '"그걸 꼭 봐야 알아요?"라는 말을 들었어요. 결국 일정은 위에서 정해졌어요.', tone: 'unlucky', effects: { stamina: -8 } },
        ],
      },
    ],
  },

  // ─── 연차별: 미들·시니어 ──────────────────────────────
  {
    id: 'interviewer_duty',
    category: '사람',
    emoji: '🪑',
    title: '면접관으로 차출됐어요',
    text: '이번 주에만 면접이 {count}개 잡혔어요. 지원자 중에는 {candidate}도 있어요. 내 일은 그대로예요.',
    weight: 7,
    conditions: { minCareerYear: 4, ranks: ['mid', 'senior', 'lead', 'staff', 'em'] },
    vars: {
      count: { min: 3, max: 8 },
      candidate: ['나보다 이력서가 화려한 경력직', '긴장해서 손을 떠는 신입', '전 회사 동료', '질문을 나보다 더 많이 하는 사람'],
    },
    choices: [
      {
        label: '질문지를 제대로 만든다',
        check: { communication: 45 },
        outcomes: [
          { chance: 0.7, text: '내 질문지가 팀 표준이 됐어요. 좋은 사람도 뽑았어요.', tone: 'skill', effects: { stamina: -8, stats: { communication: 2, reputation: 1 }, gradeBonus: 5 } },
          { chance: 0.3, text: '열심히 뽑은 사람이 한 달 만에 나갔어요. 질문지는 서랍에 들어갔어요.', tone: 'unlucky', effects: { stamina: -8, stats: { communication: 1 } } },
        ],
      },
      {
        label: '이력서만 훑고 들어간다',
        outcomes: [
          { chance: 0.6, text: '감으로 뽑았는데 다행히 괜찮은 사람이었어요.', tone: 'lucky', effects: {} },
          { chance: 0.4, text: '지원자가 면접 후기를 잡행성에 올렸어요. "면접관이 이력서도 안 읽고 옴."', tone: 'unlucky', effects: { gradeBonus: -5, stats: { reputation: -1 } } },
        ],
      },
    ],
  },
  {
    id: 'oncall_vacation',
    category: '장애',
    emoji: '📟',
    title: '휴가와 겹친 온콜 당번',
    text: '{place} 여행 날짜와 온콜 당번 주가 겹쳤어요. 비행기 표는 이미 끊었어요.',
    weight: 7,
    conditions: { minCareerYear: 3 },
    vars: {
      place: ['제주도', '오사카', '다낭', '부모님 댁'],
    },
    variants: [
      {
        title: '명절 연휴 온콜 당번',
        text: '명절 연휴에 온콜 당번이 걸렸어요. {place}에 내려가기로 이미 약속했어요.',
      },
    ],
    choices: [
      {
        label: '노트북을 챙겨 간다',
        outcomes: [
          { chance: 0.5, text: '알림이 한 번도 안 울렸어요. 노트북은 짐만 됐어요.', tone: 'lucky', effects: { stamina: 5 } },
          { chance: 0.5, text: '{place}에서 카페 와이파이로 장애를 막았어요. 여행 사진은 노트북뿐이에요.', tone: 'unlucky', effects: { stamina: -10, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '동료에게 당번을 바꿔 달라고 한다',
        check: { communication: 40 },
        outcomes: [
          { chance: 0.75, text: '동료가 흔쾌히 바꿔 줬어요. 다음 명절은 내가 서기로 했어요.', tone: 'skill', effects: { stamina: 10, stats: { communication: 1 } } },
          { chance: 0.25, text: '다들 일정이 있대요. 결국 표를 취소했어요.', tone: 'unlucky', effects: { stamina: -8, assets: -50 } },
        ],
      },
    ],
  },
  {
    id: 'mentor_assigned',
    category: '사람',
    emoji: '🎓',
    title: '신입 {count}명의 멘토가 됐어요',
    text: '{boss}(이)가 이번에 들어온 신입 {count}명의 멘토를 맡겼어요. 내 일정은 줄여 주지 않았어요.',
    weight: 6,
    conditions: { ranks: ['mid', 'senior', 'lead', 'staff'] },
    vars: {
      count: { min: 1, max: 3 },
    },
    choices: [
      {
        label: '매주 1:1을 잡는다',
        outcomes: [
          { chance: 1, text: '신입들이 빠르게 자리를 잡았어요. 나는 저녁마다 내 일을 했어요.', tone: 'skill', effects: { stamina: -10, stats: { communication: 4 }, gradeBonus: 5 } },
        ],
      },
      {
        label: '"모르는 거 있으면 물어봐요"로 끝낸다',
        outcomes: [
          { chance: 0.4, text: '알아서 잘 크는 신입들이었어요.', tone: 'lucky', effects: {} },
          { chance: 0.6, text: '아무도 안 물어봤고, 석 달 뒤 신입이 운영 장애를 냈어요.', tone: 'unlucky', effects: { gradeBonus: -8, counters: { incidents: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'promotion_rival',
    category: '회사',
    emoji: '🥇',
    title: '승진 자리는 하나',
    text: '올해 {rank} 위로 올라갈 자리가 하나래요. 후보는 나와 {rival}, 둘뿐이에요.',
    weight: 6,
    conditions: { ranks: ['mid', 'senior', 'lead'] },
    vars: {
      rival: ['입사 동기', '같은 팀 옆자리 동료', '작년에 이직해 온 사람'],
    },
    choices: [
      {
        label: '성과로 정면 승부한다',
        outcomes: [
          { chance: 1, text: '한 해 내내 달렸어요. 결과는 연말에 나와요.', effects: { stamina: -15, gradeBonus: 12 } },
        ],
      },
      {
        label: '{boss}(와)과 커리어 면담을 잡는다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.6, text: '{boss}(이)가 내가 뭘 원하는지 처음 알았대요. 올해 평가에 반영해 주기로 했어요.', tone: 'skill', effects: { gradeBonus: 8, stats: { communication: 1 } } },
          { chance: 0.4, text: '"요즘 다들 승진 얘기만 하네"라는 답이 돌아왔어요.', tone: 'unlucky', effects: { gradeBonus: -3 } },
        ],
      },
      {
        label: '양보하고 내년을 노린다',
        outcomes: [
          { chance: 1, text: '{rival}(이)가 고맙다며 밥을 샀어요. 마음은 편해요.', effects: { stamina: 8, stats: { reputation: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'tech_debt_sprint',
    category: '레거시',
    emoji: '🧹',
    title: '기술 부채 청산 {weeks}주',
    text: '드디어 기능 개발 없이 기술 부채만 갚는 {weeks}주를 받았어요. 할 일은 {debt}예요.',
    weight: 6,
    conditions: { ranks: ['mid', 'senior', 'lead', 'staff'] },
    vars: {
      weeks: { min: 2, max: 4 },
      debt: ['라이브러리 메이저 버전 올리기', '테스트 커버리지 올리기', '안 쓰는 코드 지우기', '빌드 시간 줄이기'],
    },
    choices: [
      {
        label: '욕심내서 전부 한다',
        check: { design: 55 },
        outcomes: [
          { chance: 0.6, text: '{weeks}주 만에 다 끝냈어요. 다음 분기 개발 속도가 눈에 띄게 빨라졌어요.', tone: 'skill', effects: { stamina: -12, stats: { design: 3, coding: 2 }, counters: { refactors: 1 }, gradeBonus: 8 } },
          { chance: 0.4, text: '절반쯤 하다가 기간이 끝났어요. 반쯤 바뀐 코드가 더 헷갈려요.', tone: 'unlucky', effects: { stamina: -12, stats: { design: 2 }, gradeBonus: -5 } },
        ],
      },
      {
        label: '제일 아픈 것 하나만 확실히 한다',
        outcomes: [
          { chance: 1, text: '{debt} 하나는 확실히 끝냈어요. 팀이 조용히 좋아해요.', effects: { stamina: -5, stats: { design: 2 }, counters: { refactors: 1 } } },
        ],
      },
    ],
  },

  // ─── 연차별: 테크리드 ─────────────────────────────────
  {
    id: 'teammate_quits',
    category: '사람',
    emoji: '🚪',
    title: '1:1에서 들은 퇴사 이야기',
    text: '팀의 {who}(이)가 1:1에서 그만두겠다고 해요. 이유를 물으니 "{reason}"(이)라고 해요.',
    weight: 8,
    conditions: { ranks: ['lead', 'em', 'director'] },
    vars: {
      who: ['에이스', '막내', '제일 오래된 팀원', '작년에 내가 뽑은 사람'],
      reason: ['연봉', '성장이 안 되는 것 같아서', '번아웃', '더 좋은 제안을 받아서'],
    },
    choices: [
      {
        label: '진심으로 붙잡는다',
        check: { communication: 65 },
        outcomes: [
          { chance: 0.55, text: '맡을 일을 바꿔 주기로 하고 붙잡았어요. 1년 뒤 {who}(은)는 팀의 기둥이 됐어요.', tone: 'skill', effects: { stats: { communication: 3, reputation: 1 }, gradeBonus: 8 } },
          { chance: 0.45, text: '마음은 이미 떠나 있었어요. 붙잡느라 한 달을 썼어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -5 } },
        ],
      },
      {
        label: '연봉 인상을 위에 건의한다',
        outcomes: [
          { chance: 0.4, text: '이례적으로 승인이 났어요. 팀원들이 나를 다시 봐요.', tone: 'lucky', effects: { stats: { reputation: 2 }, gradeBonus: 5 } },
          { chance: 0.6, text: '"전례가 없다"는 답이 왔어요. {who}(은)는 결국 떠났어요.', tone: 'unlucky', effects: { stamina: -8, gradeBonus: -5 } },
        ],
      },
      {
        label: '응원하며 보내 준다',
        outcomes: [
          { chance: 1, text: '깔끔하게 인수인계를 받았어요. 남은 일은 팀이 나눠 맡았어요.', effects: { stamina: -10, stats: { domain: 2 } } },
        ],
      },
    ],
  },
  {
    id: 'stack_decision',
    category: '업계',
    emoji: '🧭',
    title: '신규 서비스 기술 스택',
    text: '새 서비스의 기술 스택을 내가 정하게 됐어요. 팀은 {hype}(을)를 써 보고 싶어 해요.',
    weight: 6,
    conditions: { ranks: ['lead', 'staff', 'principal', 'em'] },
    vars: {
      hype: ['새로 나온 언어', '요즘 뜨는 프레임워크', '그래프 DB', '서버리스'],
    },
    choices: [
      {
        label: '검증된 스택으로 간다',
        outcomes: [
          { chance: 1, text: '일정대로 무사히 오픈했어요. 팀원 몇 명은 아쉬워해요.', effects: { gradeBonus: 5, stats: { domain: 2 } } },
        ],
      },
      {
        label: '{hype}에 걸어 본다',
        check: { design: 72 },
        outcomes: [
          { chance: 0.55, text: '도입기를 쓴 글이 화제가 됐고 채용 지원자도 늘었어요.', tone: 'skill', effects: { stats: { design: 3, reputation: 3 }, gradeBonus: 5 } },
          { chance: 0.45, text: '운영 노하우가 없어서 장애가 이어졌어요. 결국 반년 만에 갈아엎었어요.', tone: 'unlucky', effects: { stamina: -15, gradeBonus: -10, stats: { design: 2 }, counters: { incidents: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'hiring_freeze',
    category: '회사',
    emoji: '🧊',
    title: '채용 동결',
    text: '회사가 채용을 동결했어요. 빈자리 {count}개는 그대로인데 내년 목표는 {goal}(이)래요.',
    weight: 6,
    conditions: { ranks: ['lead', 'em', 'director', 'vp'] },
    vars: {
      count: { min: 1, max: 4 },
      goal: ['두 배', '30% 성장', '신규 서비스 두 개 오픈'],
    },
    choices: [
      {
        label: '목표를 줄이자고 협상한다',
        check: { communication: 70 },
        outcomes: [
          { chance: 0.6, text: '현실적인 목표로 다시 잡았어요. 팀원들이 안도했어요.', tone: 'skill', effects: { stats: { communication: 2 }, stamina: 5 } },
          { chance: 0.4, text: '"리더라면 방법을 찾아야죠"라는 답을 들었어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -5 } },
        ],
      },
      {
        label: '내가 직접 코딩해서 메운다',
        outcomes: [
          { chance: 1, text: '낮에는 회의, 밤에는 코딩을 했어요. 목표는 맞췄는데 몸이 버거워요.', effects: { stamina: -18, stats: { coding: 2 }, gradeBonus: 8 } },
        ],
      },
    ],
  },

  // ─── 매니저 트랙 ──────────────────────────────────────
  {
    id: 'forced_ranking',
    category: '사람',
    emoji: '📉',
    title: '누군가는 C를 받아야 해요',
    text: '상대평가라서 팀에서 한 명은 C를 받아야 한대요. 올해 다들 {how} 일했어요.',
    weight: 8,
    conditions: { ranks: ['em', 'director'] },
    vars: {
      how: ['정말 열심히', '밤낮없이', '서로 도우며'],
    },
    choices: [
      {
        label: '기준대로 냉정하게 준다',
        outcomes: [
          { chance: 1, text: 'C를 받은 팀원이 한 달 뒤 사표를 냈어요. 팀 분위기가 차가워졌어요.', effects: { stamina: -8, stats: { communication: -1 }, gradeBonus: 3 } },
        ],
      },
      {
        label: '휴직 예정자에게 준다',
        outcomes: [
          { chance: 0.5, text: '아무도 모르고 지나갔어요. 마음 한쪽이 무거워요.', tone: 'lucky', effects: { stamina: -5 } },
          { chance: 0.5, text: '블라인더에 "육아휴직 가면 C 주는 팀"이라는 글이 올라왔어요.', tone: 'unlucky', effects: { stats: { reputation: -3 }, gradeBonus: -8 } },
        ],
      },
      {
        label: '인사팀과 싸워 예외를 받는다',
        check: { communication: 80, reputation: 45 },
        outcomes: [
          { chance: 0.5, text: '팀 성과 자료로 설득해서 예외를 받았어요. 팀원들이 이 일을 오래 기억해요.', tone: 'skill', effects: { stats: { reputation: 3, communication: 2 } } },
          { chance: 0.5, text: '예외는 없었고, 위에서 "팀장이 팀 편만 든다"는 말이 나왔어요.', tone: 'unlucky', effects: { gradeBonus: -10, stamina: -5 } },
        ],
      },
    ],
  },
  {
    id: 'budget_cut',
    category: '회사',
    emoji: '✂️',
    title: '내년 예산 {percent}% 삭감',
    text: '경영진이 개발 조직 예산을 {percent}% 줄이래요. 줄일 곳을 다음 주까지 정해야 해요.',
    weight: 7,
    conditions: { ranks: ['director', 'vp', 'cto'] },
    vars: {
      percent: { min: 10, max: 30 },
    },
    choices: [
      {
        label: '클라우드 비용을 쥐어짠다',
        check: { design: 75 },
        outcomes: [
          { chance: 0.65, text: '안 쓰는 서버와 과한 설정을 정리해서 사람은 지켰어요.', tone: 'skill', effects: { stats: { design: 2, reputation: 2 }, gradeBonus: 8 } },
          { chance: 0.35, text: '너무 줄였다가 피크 시간에 서비스가 느려졌어요.', tone: 'unlucky', effects: { gradeBonus: -8, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '외주 계약을 정리한다',
        outcomes: [
          { chance: 1, text: '숫자는 맞췄어요. 외주가 하던 일은 팀이 나눠 맡았어요.', effects: { stamina: -10, gradeBonus: 5 } },
        ],
      },
      {
        label: '삭감은 안 된다고 버틴다',
        check: { communication: 85 },
        outcomes: [
          { chance: 0.45, text: '내년 매출 계획과 엮어서 예산을 지켜 냈어요.', tone: 'skill', effects: { stats: { communication: 2, reputation: 2 } } },
          { chance: 0.55, text: '"협조가 안 되는 사람"으로 찍혔어요. 예산은 결국 깎였어요.', tone: 'unlucky', effects: { gradeBonus: -12 } },
        ],
      },
    ],
  },
  {
    id: 'board_ai_question',
    category: '업계',
    emoji: '🏛️',
    title: '이사회의 질문',
    text: '이사회에서 {member}(이)가 묻어요. "AI가 코드를 짜는데 개발자가 왜 아직 {headcount}명이나 있죠?"',
    weight: 7,
    conditions: { ranks: ['vp', 'cto'] },
    vars: {
      member: ['사외이사', '투자사 파트너', '회장님'],
      headcount: { min: 40, max: 300 },
    },
    choices: [
      {
        label: '생산성 지표로 설명한다',
        check: { communication: 85, domain: 80 },
        outcomes: [
          { chance: 0.6, text: '같은 인원으로 기능 출시가 두 배가 된 그래프를 보여 줬어요. 질문이 칭찬으로 바뀌었어요.', tone: 'skill', effects: { stats: { reputation: 3 }, gradeBonus: 10 } },
          { chance: 0.4, text: '"그래서 몇 명 줄일 수 있냐"는 질문으로 돌아왔어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -8 } },
        ],
      },
      {
        label: '20% 감축 계획을 낸다',
        outcomes: [
          { chance: 1, text: '이사회는 만족했어요. 블라인더에는 내 이름이 들어간 글이 올라왔어요.', effects: { gradeBonus: 10, stats: { reputation: -4 }, stamina: -5 } },
        ],
      },
    ],
  },
  {
    id: 'public_apology',
    category: '장애',
    emoji: '🙇',
    title: '대형 장애 공식 사과',
    text: '{service}(이)가 {hours}시간 동안 멈췄어요. 뉴스에 나왔고 사과문은 내 이름으로 나가야 해요.',
    weight: 6,
    conditions: { ranks: ['director', 'vp', 'cto'] },
    severity: true,
    vars: {
      service: ['결제', '로그인', '앱 전체', '주문'],
      hours: { bySeverity: [{ min: 1, max: 2 }, { min: 3, max: 6 }, { min: 8, max: 24 }] },
    },
    choices: [
      {
        label: '원인과 재발 방지책을 투명하게 공개한다',
        check: { design: 75, communication: 75 },
        outcomes: [
          { chance: 0.65, text: '기술 블로그의 장애 회고 글이 업계에서 모범 사례로 돌았어요.', tone: 'skill', effects: { stamina: -10, stats: { reputation: 4 } } },
          { chance: 0.35, text: '공개한 내용 때문에 보안 질문이 쏟아졌어요. 법무팀이 화가 났어요.', tone: 'unlucky', effects: { stamina: -15, gradeBonus: -10 } },
        ],
      },
      {
        label: '짧은 사과문만 낸다',
        outcomes: [
          { chance: 1, text: '"일시적인 오류로 불편을 드려 죄송합니다." 댓글이 1,000개 달렸어요.', effects: { stamina: -8, stats: { reputation: -2 }, counters: { incidents: 1 } } },
        ],
      },
    ],
  },

  // ─── 엔지니어 트랙 ────────────────────────────────────
  {
    id: 'glue_work',
    category: '커리어',
    emoji: '🧩',
    title: '아무도 안 하는 일',
    text: '팀 사이에 {gap}(을)를 맡은 사람이 없어요. 내가 안 하면 아무도 안 할 것 같아요.',
    weight: 7,
    conditions: { ranks: ['senior', 'staff', 'principal'] },
    vars: {
      gap: ['API 표준 문서', '장애 대응 매뉴얼', '신규 입사자 온보딩 자료', '팀 간 배포 일정 조율'],
    },
    choices: [
      {
        label: '내가 맡아서 정리한다',
        outcomes: [
          { chance: 1, text: '{gap}(을)를 맡고 나니 팀 간 질문이 절반으로 줄었어요. 내 커밋 수도 줄었어요.', effects: { stamina: -8, stats: { communication: 3, reputation: 2 }, gradeBonus: -3 } },
        ],
      },
      {
        label: '코드로 증명하는 데 집중한다',
        outcomes: [
          { chance: 1, text: '이번 분기 커밋 수 1위를 했어요. 회의에서는 같은 질문이 계속 나와요.', effects: { stats: { coding: 3 }, gradeBonus: 5 } },
        ],
      },
    ],
  },
  {
    id: 'rfc_stalled',
    category: '업계',
    emoji: '📄',
    title: '{months}개월째 계류 중인 RFC',
    text: '내가 쓴 {topic} RFC가 {months}개월째 리뷰 대기예요. 댓글은 "좋네요, 나중에 봐요"뿐이에요.',
    weight: 6,
    conditions: { ranks: ['staff', 'principal', 'fellow'] },
    vars: {
      months: { min: 3, max: 18 },
      topic: ['전사 인증 통합', '데이터 파이프라인 재설계', '모노레포 전환', '장애 등급 체계'],
    },
    choices: [
      {
        label: '작게 쪼개서 시범 적용부터 한다',
        check: { design: 82 },
        outcomes: [
          { chance: 0.65, text: '한 팀에서 효과가 보이자 다른 팀들이 먼저 쓰겠다고 했어요.', tone: 'skill', effects: { stats: { design: 2, reputation: 3 }, gradeBonus: 8 } },
          { chance: 0.35, text: '시범 팀이 조직 개편으로 사라졌어요. RFC는 다시 서랍으로 들어갔어요.', tone: 'unlucky', effects: { stamina: -8, gradeBonus: -3 } },
        ],
      },
      {
        label: '임원 회의에 직접 들고 간다',
        check: { communication: 70 },
        outcomes: [
          { chance: 0.55, text: 'CTO가 그 자리에서 승인했어요. 다음 날부터 리뷰가 쏟아졌어요.', tone: 'skill', effects: { stats: { reputation: 2, communication: 2 } } },
          { chance: 0.45, text: '"엔지니어가 정치를 한다"는 말이 돌았어요.', tone: 'unlucky', effects: { gradeBonus: -8 } },
        ],
      },
    ],
  },
  {
    id: 'keynote_invite',
    category: '개인',
    emoji: '🌏',
    title: '해외 컨퍼런스 키노트',
    text: '{conf}에서 키노트를 부탁받았어요. 발표는 영어로 {minutes}분이에요.',
    weight: 5,
    conditions: { ranks: ['principal', 'fellow', 'staff', 'cto', 'vp'] },
    vars: {
      conf: ['실리콘밸리 개발자 행사', '도쿄 오픈소스 서밋', '유럽 데이터 컨퍼런스'],
      minutes: ['20', '40', '60'],
    },
    choices: [
      {
        label: '수락하고 석 달 동안 연습한다',
        check: { communication: 70 },
        outcomes: [
          { chance: 0.7, text: '기립 박수를 받았어요. 해외 헤드헌터 메일이 늘었어요.', tone: 'skill', effects: { stamina: -12, stats: { reputation: 6, communication: 2 }, offerBonus: 1 } },
          { chance: 0.3, text: '질의응답에서 질문을 못 알아들었어요. 그래도 영상은 꽤 돌았어요.', tone: 'unlucky', effects: { stamina: -12, stats: { reputation: 2, communication: 2 } } },
        ],
      },
      {
        label: '후배를 대신 추천한다',
        outcomes: [
          { chance: 1, text: '후배가 멋지게 해냈어요. 발표 첫 장에 내 이름을 넣어 줬어요.', effects: { stats: { reputation: 2, communication: 1 } } },
        ],
      },
    ],
  },

  // ─── 나이 ──────────────────────────────────────────────
  {
    id: 'coding_test_again',
    category: '커리어',
    emoji: '📝',
    title: '이 나이에 다시 코딩테스트',
    text: '관심 있던 회사에서 연락이 왔어요. 연차와 상관없이 {test}(을)를 봐야 한대요.',
    weight: 6,
    conditions: { minAge: 42 },
    vars: {
      test: ['알고리즘 테스트 3시간', '라이브 코딩 면접', '과제 전형 일주일'],
    },
    choices: [
      {
        label: '주말마다 문제를 푼다',
        check: { coding: 65 },
        outcomes: [
          { chance: 0.6, text: '20대 지원자들 사이에서 통과했어요. 손이 기억하고 있었어요.', tone: 'skill', effects: { stamina: -10, stats: { coding: 3 }, offerBonus: 1 } },
          { chance: 0.4, text: '시간 안에 못 풀었어요. 그래도 오랜만에 머리를 썼어요.', tone: 'unlucky', effects: { stamina: -10, stats: { coding: 2 } } },
        ],
      },
      {
        label: '"제 경력을 보세요"라고 답장한다',
        outcomes: [
          { chance: 0.3, text: '의외로 임원 면접으로 바로 넘어가자고 했어요.', tone: 'lucky', effects: { offerBonus: 1, stats: { reputation: 1 } } },
          { chance: 0.7, text: '답장이 오지 않았어요.', tone: 'unlucky', effects: {} },
        ],
      },
    ],
  },
  {
    id: 'younger_boss',
    category: '사람',
    emoji: '👔',
    title: '나보다 {gap}살 어린 {boss}',
    text: '조직 개편으로 새 {boss}(이)가 왔어요. 나보다 {gap}살 어리고, 내가 {years}년 전 면접을 봤던 사람이에요.',
    weight: 6,
    conditions: { minAge: 40, ranks: ['mid', 'senior', 'lead', 'staff'] },
    vars: {
      gap: { min: 5, max: 12 },
      years: { min: 3, max: 8 },
    },
    choices: [
      {
        label: '먼저 다가가 도와준다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.7, text: '새 {boss}(이)가 어려운 결정마다 나를 찾아요. 팀에서 내 자리가 더 단단해졌어요.', tone: 'skill', effects: { stats: { communication: 2, reputation: 1 }, gradeBonus: 8 } },
          { chance: 0.3, text: '도와준다는 게 간섭으로 보였나 봐요. 회의에서 내 의견이 자꾸 빠져요.', tone: 'unlucky', effects: { gradeBonus: -8 } },
        ],
      },
      {
        label: '내 일만 조용히 한다',
        outcomes: [
          { chance: 1, text: '서로 존중하는 거리를 지켰어요. 편하지만 조금 쓸쓸해요.', effects: { stats: { coding: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'retirement_math',
    category: '생활',
    emoji: '🧓',
    title: '은퇴 자금 계산',
    text: '{trigger} 은퇴 자금을 계산해 봤어요. 생각보다 {result}.',
    weight: 5,
    conditions: { minAge: 50 },
    vars: {
      trigger: ['동기 퇴직 소식을 듣고', '연금 안내문을 받고', '건강검진 결과를 보고'],
      result: ['모자라요', '훨씬 모자라요', '애매해요'],
    },
    choices: [
      {
        label: '공격적으로 투자한다',
        outcomes: [
          { chance: 0.45, text: '운 좋게 크게 올랐어요.', tone: 'lucky', effects: { assets: 6000 } },
          { chance: 0.55, text: '사자마자 떨어졌어요. 앱을 지웠어요.', tone: 'unlucky', effects: { assets: -4000, stamina: -8 } },
        ],
      },
      {
        label: '덜 쓰고 오래 다니기로 한다',
        outcomes: [
          { chance: 1, text: '점심을 도시락으로 바꿨어요. 마음이 조금 편해졌어요.', effects: { assets: 1000, stamina: 3 } },
        ],
      },
    ],
  },

  // ─── 40대 이후 권고사직 ───────────────────────────────
  // jobLoss: 연말에 실직 상태로 허브에 간다. 40세부터는 재취업이 어려워지고 치킨집 창업을 고를 수 있다 (기획서 6장)
  {
    id: 'voluntary_retirement',
    category: '회사',
    emoji: '📮',
    title: '희망퇴직 신청 공고',
    text: '사내 게시판에 희망퇴직 공고가 올라왔어요. 대상은 "{target}"이고, 위로금은 {months}개월치래요. 마감은 {deadline}이에요.',
    weight: 10,
    conditions: { minAge: 45 },
    vars: {
      target: ['만 45세 이상', '근속 15년 이상', '직급 정체 3년 이상'],
      months: { min: 12, max: 36 },
      deadline: ['이번 주 금요일', '다음 주 월요일', '내일'],
    },
    variants: [
      {
        title: '조용히 돌아온 희망퇴직 메일',
        text: '나에게만 온 것 같은 메일이에요. 제목은 "새로운 출발을 응원합니다", 위로금은 {months}개월치, 대상은 "{target}"이래요. 마감은 {deadline}이에요.',
      },
    ],
    choices: [
      {
        label: '신청하고 위로금을 받는다',
        outcomes: [
          { chance: 1, text: '위로금 {months}개월치를 받고 송별회를 했어요. 다음 날 아침, 갈 곳이 없어요.', effects: { assets: 6000, stamina: 10, jobLoss: true } },
        ],
      },
      {
        label: '모른 척 버틴다',
        outcomes: [
          { chance: 0.55, text: '이번에는 넘어갔어요. 신청한 동기들 자리가 비어 있어요.', tone: 'lucky', effects: { stamina: -5 } },
          { chance: 0.45, text: '마감 다음 날 "역량 강화 프로그램" 대상자로 뽑혔어요. 사실상 대기발령이에요.', tone: 'unlucky', effects: { gradeBonus: -20, stamina: -10 } },
        ],
      },
    ],
  },
  {
    id: 'window_desk',
    category: '회사',
    emoji: '🏚️',
    title: '책상이 옮겨졌어요',
    text: '출근해 보니 내 책상이 {place}(으)로 옮겨져 있어요. {sign}',
    weight: 8,
    conditions: { minAge: 45 },
    vars: {
      place: ['창고 옆', '복도 끝 창가', '아무도 안 쓰는 회의실', '다른 층 빈자리'],
      sign: ['맡던 프로젝트 권한도 사라졌어요.', '팀 메신저 방에서 빠져 있어요.', '{boss}(은)는 눈을 마주치지 않아요.'],
    },
    choices: [
      {
        label: '끝까지 버틴다',
        outcomes: [
          { chance: 1, text: '아무 일도 주어지지 않는 1년을 버텼어요. 생각보다 힘들어요.', effects: { stamina: -18, gradeBonus: -10 } },
        ],
      },
      {
        label: '받아 줄 다른 팀을 찾아본다',
        check: { domain: 60, communication: 50 },
        outcomes: [
          { chance: 0.55, text: '도메인을 아는 사람이 필요하던 팀이 나를 데려갔어요.', tone: 'skill', effects: { gradeBonus: 5, stats: { domain: 2 } } },
          { chance: 0.45, text: '"연차가 너무 높으셔서요"라는 답만 돌아왔어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -5 } },
        ],
      },
      {
        label: '자존심을 지키고 나간다',
        outcomes: [
          { chance: 1, text: '짐을 상자 하나에 담아 나왔어요. 생각보다 상자가 가벼웠어요.', effects: { assets: 2000, stamina: 5, jobLoss: true } },
        ],
      },
    ],
  },
  {
    id: 'hr_interview',
    category: '회사',
    emoji: '🗣️',
    title: '인사팀 면담 호출',
    text: '{who}(이)가 "잠깐 얘기 좀 하자"며 작은 회의실로 불렀어요. 테이블 위에 {paper}(이)가 놓여 있어요.',
    weight: 9,
    conditions: { minAge: 42 },
    vars: {
      who: ['인사팀장', '본부장', '처음 보는 인사팀 직원'],
      paper: ['사직서 양식', '"퇴직 지원 프로그램" 안내문', '내 최근 3년 고과표'],
    },
    choices: [
      {
        label: '위로금을 최대한 받아낸다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.6, text: '근로기준법 조항까지 꺼내서 위로금을 두 배로 받아냈어요. 그래도 나가는 건 같아요.', tone: 'skill', effects: { assets: 9000, jobLoss: true } },
          { chance: 0.4, text: '"이게 최선입니다"만 반복했어요. 기본 위로금만 받고 나왔어요.', tone: 'unlucky', effects: { assets: 3000, stamina: -5, jobLoss: true } },
        ],
      },
      {
        label: '절대 못 나간다고 버틴다',
        outcomes: [
          { chance: 0.45, text: '면담이 흐지부지 끝났어요. 1년은 더 다닐 수 있을 것 같아요.', tone: 'lucky', effects: { stamina: -10, gradeBonus: -10 } },
          { chance: 0.55, text: '면담이 매주 이어졌어요. 석 달 만에 기본 위로금도 못 받고 나왔어요.', tone: 'unlucky', effects: { stamina: -15, assets: 1000, jobLoss: true } },
        ],
      },
    ],
  },
  {
    id: 'two_juniors',
    category: '회사',
    emoji: '🧾',
    title: '"그 연봉이면 주니어 두 명"',
    text: '{who}(이)가 회의에서 "{name}님 연봉이면 {alt}"라고 말했어요. 농담처럼 웃었지만 아무도 따라 웃지 않았어요.',
    weight: 8,
    conditions: { minAge: 47 },
    vars: {
      who: ['새로 온 CFO', '대표님', '사업부장'],
      alt: ['주니어 두 명 쓰겠네요', 'AI 구독료 10년 치예요', '외주 한 팀 써요'],
    },
    choices: [
      {
        label: '실력으로 값을 증명한다',
        check: { design: 70, domain: 70 },
        outcomes: [
          { chance: 0.55, text: '내가 아니면 못 고치는 장애를 막았어요. 그 뒤로 그 말은 다시 안 나왔어요.', tone: 'skill', effects: { stamina: -15, gradeBonus: 10, stats: { reputation: 1 } } },
          { chance: 0.45, text: '열심히 했지만 연말에 내 자리가 조직도에서 사라졌어요.', tone: 'unlucky', effects: { stamina: -15, assets: 3000, jobLoss: true } },
        ],
      },
      {
        label: '연봉 삭감을 받아들인다',
        outcomes: [
          { chance: 1, text: '연봉이 깎였지만 자리는 지켰어요. 마음 한쪽이 서늘해요.', effects: { salaryPct: -0.2, stamina: -5 } },
        ],
      },
      {
        label: '조용히 이직을 알아본다',
        outcomes: [
          { chance: 1, text: '10년 만에 이력서를 열었어요. 경력란이 두 페이지를 넘어요.', effects: { offerBonus: 2, gradeBonus: -5 } },
        ],
      },
    ],
  },
  {
    id: 'exec_contract_end',
    category: '커리어',
    emoji: '📃',
    title: '임원 계약 미연장',
    text: '{who}(이)가 "올해 말로 계약이 끝나요. 그동안 고생 많으셨어요"라고 했어요. 임원은 1년짜리 계약직이라는 걸 잊고 있었어요.',
    weight: 9,
    conditions: { minAge: 45, ranks: ['director', 'vp', 'cto', 'principal', 'fellow'] },
    vars: {
      who: ['대표님', '이사회 의장', '새로 온 사장'],
    },
    choices: [
      {
        label: '고문 자리를 받고 물러난다',
        outcomes: [
          { chance: 1, text: '1년짜리 고문 계약과 차량 지원을 받고 물러났어요. 출근할 곳은 없어요.', effects: { assets: 5000, stats: { reputation: 1 }, jobLoss: true } },
        ],
      },
      {
        label: '다른 회사 임원 자리를 알아본다',
        outcomes: [
          { chance: 1, text: '아는 헤드헌터들에게 전화를 돌렸어요. 계약은 예정대로 끝났어요.', effects: { offerBonus: 3, stamina: -5, jobLoss: true } },
        ],
      },
    ],
  },
  {
    id: 'ai_restructure',
    category: '업계',
    emoji: '🤖',
    title: 'AI 전환 구조조정 명단',
    text: '회사가 "AI 중심 조직으로 전환한다"며 {scope}(을)를 줄인대요. 명단에 40대 이상이 많다는 소문이 돌아요.',
    weight: 8,
    conditions: { minAge: 40, minCalendarYear: 2028 },
    vars: {
      scope: ['개발 인력 30%', '유지보수 조직 전체', 'QA와 운영 조직'],
    },
    choices: [
      {
        label: 'AI 도입 TF에 손을 든다',
        check: { design: 60 },
        outcomes: [
          { chance: 0.6, text: 'AI 에이전트 운영을 맡게 됐어요. 명단에서 빠졌어요.', tone: 'skill', effects: { stats: { design: 2 }, gradeBonus: 8, stamina: -8 } },
          { chance: 0.4, text: '"젊은 분들 위주로 꾸리기로 했어요"라는 답이 왔어요. 명단에 이름이 남았어요.', tone: 'unlucky', effects: { assets: 3000, jobLoss: true } },
        ],
      },
      {
        label: '위로금이 있을 때 먼저 나간다',
        outcomes: [
          { chance: 1, text: '1차 신청자에게만 주는 위로금을 챙겨 나왔어요.', effects: { assets: 5000, jobLoss: true } },
        ],
      },
    ],
  },
  {
    id: 'peer_farewell',
    category: '사람',
    emoji: '😢',
    title: '입사 동기 송별회',
    text: '입사 동기 {who}(이)가 {why} 회사를 떠나요. 이제 남은 동기는 {left}명이에요.',
    weight: 6,
    conditions: { minAge: 45 },
    vars: {
      who: ['김 책임', '박 수석', '이 부장', '최 팀장'],
      why: ['희망퇴직으로', '권고사직으로', '치킨집을 차린다며'],
      left: { min: 1, max: 4 },
    },
    choices: [
      {
        label: '나도 나갈 준비를 시작한다',
        outcomes: [
          { chance: 1, text: '송별회 다음 날 링크드아웃 프로필을 고쳤어요.', effects: { offerBonus: 2, stamina: -3 } },
        ],
      },
      {
        label: '끝까지 남겠다고 다짐한다',
        outcomes: [
          { chance: 1, text: '{who}의 빈자리까지 맡았어요. 회사에서 버티는 것도 실력이래요.', effects: { stamina: -8, gradeBonus: 5 } },
        ],
      },
    ],
  },
  {
    id: 'salary_peak',
    category: '회사',
    emoji: '📉',
    title: '임금피크제 대상',
    text: '올해부터 임금피크제 대상이래요. 정년까지는 다닐 수 있지만 연봉이 해마다 줄어요. 대신 명예퇴직도 신청할 수 있어요.',
    weight: 12,
    once: true,
    conditions: { minAge: 55, companyTypes: ['chaebol', 'chaebol_si', 'finance_public'] },
    choices: [
      {
        label: '임금피크제를 받아들인다',
        outcomes: [
          { chance: 1, text: '연봉은 줄었지만 정년까지 갈 수 있어요. 후배들 눈치가 조금 보여요.', effects: { salaryPct: -0.3, stamina: 10 } },
        ],
      },
      {
        label: '명예퇴직한다',
        outcomes: [
          { chance: 1, text: '명예퇴직금을 받고 나왔어요. 30년 만에 평일 낮의 동네를 걸어요.', effects: { assets: 10000, stamina: 15, jobLoss: true } },
        ],
      },
    ],
  },

  // ─── 회사 유형별 ──────────────────────────────────────
  {
    id: 'overtime_friends',
    category: '회사',
    emoji: '🌃',
    title: '다른 회사 친구들은 6시에 퇴근해요',
    text: '밤 {hour}시, 사무실에서 {where} 사진을 봤어요. 다른 회사 친구들은 6시에 퇴근했대요.',
    // 야근이 가장 심한 회사에서 나오라는 신호 (기획서 13장)
    weight: 9,
    conditions: { companyTypes: ['sme_si', 'agency'], minCareerYear: 2 },
    vars: {
      hour: { min: 10, max: 12 },
      where: ['동기 단톡방에 올라온 저녁 모임', '친구 SNS의 운동 인증', '전 동료의 취미 클래스'],
    },
    choices: [
      {
        label: '이직 준비를 시작한다',
        outcomes: [
          { chance: 1, text: '퇴근길에 이력서를 고쳤어요. 헤드헌터 연락이 늘기 시작했어요.', effects: { offerBonus: 2, stamina: -3 } },
        ],
      },
      {
        label: '칼퇴를 선언한다',
        check: { communication: 45 },
        outcomes: [
          { chance: 0.6, text: '할 일을 끝내고 당당히 나갔어요. 의외로 아무도 뭐라 안 해요.', tone: 'skill', effects: { stamina: 12 } },
          { chance: 0.4, text: '다음 날 {boss}(이)가 "요즘 여유 있나 봐?"라며 일을 더 줬어요.', tone: 'unlucky', effects: { gradeBonus: -10, stamina: -5 } },
        ],
      },
      {
        label: '그래도 여기서 버틴다',
        outcomes: [
          { chance: 1, text: '야근 수당 대신 야식 쿠폰이 쌓였어요.', effects: { stamina: -10, gradeBonus: 5, stats: { domain: 2 } } },
        ],
      },
    ],
  },
  {
    id: 'approval_chain',
    category: '회사',
    emoji: '🗂️',
    title: '결재 {steps}단계',
    text: '{change} 하나 하려는데 결재가 {steps}단계예요. 지금 {stage}에서 멈췄어요.',
    weight: 8,
    conditions: { companyTypes: ['chaebol', 'chaebol_si', 'finance_public'] },
    vars: {
      steps: { min: 5, max: 9 },
      change: ['라이브러리 버전 업', '서버 한 대 증설', '오픈소스 도입', '로그 보관 기간 변경'],
      stage: ['팀장님 휴가', '보안팀 검토', '상무님 출장', '협조 부서 회신 대기'],
    },
    choices: [
      {
        label: '결재 라인을 하나하나 찾아간다',
        check: { communication: 45 },
        outcomes: [
          { chance: 0.7, text: '커피 일곱 잔을 사고 일주일 만에 결재를 받았어요.', tone: 'skill', effects: { stats: { communication: 2, domain: 2 }, assets: -5 } },
          { chance: 0.3, text: '마지막 단계에서 "왜 지금 해야 하죠?"라는 반려가 왔어요.', tone: 'unlucky', effects: { stamina: -8 } },
        ],
      },
      {
        label: '다음 분기로 미룬다',
        outcomes: [
          { chance: 1, text: '미뤄 둔 일이 또 하나 늘었어요. 이 회사에서는 흔한 일이에요.', effects: { stats: { domain: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'hq_timezone',
    category: '회사',
    emoji: '🌐',
    title: '본사 회의는 새벽 {hour}시',
    text: '본사가 있는 {city} 시간에 맞춘 회의가 매주 새벽 {hour}시에 잡혔어요.',
    weight: 8,
    conditions: { companyTypes: ['foreign'] },
    vars: {
      city: ['샌프란시스코', '시애틀', '뉴욕', '런던'],
      hour: { min: 1, max: 6 },
    },
    choices: [
      {
        label: '꼬박꼬박 들어간다',
        outcomes: [
          { chance: 1, text: '본사 사람들이 내 이름을 외웠어요. 대신 늘 졸려요.', effects: { stamina: -10, stats: { communication: 2, reputation: 1 }, gradeBonus: 5 } },
        ],
      },
      {
        label: '회의 시간을 돌아가며 바꾸자고 제안한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.6, text: '본사도 동의했어요. 이제 한 달에 한 번만 새벽에 일어나요.', tone: 'skill', effects: { stamina: 8, stats: { communication: 2 } } },
          { chance: 0.4, text: '"그럼 녹화본을 보세요"라는 답을 받았어요. 중요한 결정은 다 놓쳤어요.', tone: 'unlucky', effects: { gradeBonus: -8 } },
        ],
      },
    ],
  },
  {
    id: 'reorg_again',
    category: '회사',
    emoji: '🔀',
    title: '{nth} 번째 조직 개편',
    text: '입사하고 {nth} 번째 조직 개편이에요. 이번엔 우리 팀이 {fate}.',
    weight: 7,
    conditions: { companyTypes: ['bigtech', 'unicorn', 'series_b'], minCareerYear: 2 },
    vars: {
      nth: ['두', '세', '네'],
      fate: ['다른 본부로 옮겨 가요', '두 팀으로 쪼개져요', '옆 팀과 합쳐져요'],
    },
    choices: [
      {
        label: '새 팀에서 기회를 찾는다',
        outcomes: [
          { chance: 0.5, text: '새 리더가 나를 눈여겨봤어요. 큰 프로젝트를 맡았어요.', tone: 'lucky', effects: { gradeBonus: 8, stats: { domain: 1 } } },
          { chance: 0.5, text: '인수인계만 하다 한 해가 갔어요. 하던 프로젝트는 없어졌어요.', tone: 'unlucky', effects: { gradeBonus: -5, stamina: -5 } },
        ],
      },
      {
        label: '원하는 팀으로 보내 달라고 요청한다',
        check: { communication: 50, reputation: 30 },
        outcomes: [
          { chance: 0.6, text: '원하던 팀으로 옮겼어요. 일이 다시 재밌어졌어요.', tone: 'skill', effects: { stamina: 8, stats: { design: 2 } } },
          { chance: 0.4, text: '요청은 반려됐고 "충성도가 낮다"는 메모가 남았어요.', tone: 'unlucky', effects: { gradeBonus: -8 } },
        ],
      },
    ],
  },

  // ─── 생활 ──────────────────────────────────────────────
  {
    id: 'marriage',
    category: '생활',
    emoji: '💍',
    title: '결혼',
    text: '{partner}(와)과 결혼 이야기가 나왔어요.',
    weight: 6,
    once: true,
    conditions: { minAge: 28, maxAge: 42, notFlags: ['married'] },
    vars: {
      partner: ['오래 만난 사람', '소개팅으로 만난 사람', '대학 동아리 친구', '회사 밖 개발 모임에서 만난 사람'],
      aftermath: ['축의금 정산은 아직 못 했어요', '신혼여행에도 노트북을 챙겼다가 혼났어요', '청첩장 디자인을 직접 코딩했어요'],
    },
    choices: [
      {
        label: '결혼한다',
        outcomes: [
          { chance: 1, text: '결혼했어요! {aftermath}.', effects: { assets: -3000, stamina: 10, setFlags: ['married'] } },
        ],
      },
      {
        label: '커리어가 먼저다',
        outcomes: [
          { chance: 1, text: '일에 집중하기로 했어요. 명절이 조금 길게 느껴져요.', effects: { gradeBonus: 5 } },
        ],
      },
    ],
  },
  {
    id: 'baby',
    category: '생활',
    emoji: '👶',
    title: '아기가 태어났어요',
    text: '가족이 한 명 늘었어요. 우리 회사에서 육아휴직을 쓴 개발자는 {precedent}. 쓸지 고민돼요.',
    weight: 8,
    once: true,
    conditions: { flags: ['married'], notFlags: ['hasChild'], maxAge: 45 },
    vars: {
      precedent: ['아직 없어요', '작년에 한 명 있었어요', '많아서 눈치 볼 일이 없어요', '쓰고 돌아와서 팀이 바뀌었대요'],
    },
    choices: [
      {
        label: '육아휴직을 쓴다',
        outcomes: [
          { chance: 1, text: '아이의 첫 걸음마를 직접 봤어요. 복귀하니 코드베이스가 낯설어요.', effects: { stamina: 25, gradeBonus: -25, setFlags: ['hasChild'], achievement: 'parental_leave' } },
        ],
      },
      {
        label: '계속 일한다',
        outcomes: [
          { chance: 1, text: '퇴근하면 육아 2교대가 시작돼요.', effects: { stamina: -20, setFlags: ['hasChild'] } },
        ],
      },
    ],
  },
  {
    id: 'mortgage',
    category: '생활',
    emoji: '🏠',
    title: '내 집 마련',
    text: '{trigger} "지금 아니면 못 산다"는 생각이 들었어요.',
    weight: 5,
    once: true,
    conditions: { minAge: 32, notFlags: ['mortgage'] },
    vars: {
      trigger: ['부동산 앱을 보다가', '동기가 집을 샀다는 소식을 듣고', '전세 계약 만료 알림을 받고', '집주인이 보증금을 올려 달라고 해서'],
    },
    choices: [
      {
        label: '영끌해서 산다',
        outcomes: [
          { chance: 0.5, text: '집값이 올랐어요! 대출 이자는 여전히 무서워요.', tone: 'lucky', effects: { assets: 10000, setFlags: ['mortgage'] } },
          { chance: 0.5, text: '사자마자 금리가 올랐어요. 월급의 절반이 이자예요.', tone: 'unlucky', effects: { assets: -5000, stamina: -10, setFlags: ['mortgage'] } },
        ],
      },
      {
        label: '전세로 버틴다',
        outcomes: [
          { chance: 1, text: '2년마다 이사 걱정을 하지만 마음은 가벼워요.', effects: {} },
        ],
      },
    ],
  },
  {
    id: 'parent_sick',
    category: '생활',
    emoji: '🏥',
    title: '부모님이 편찮으세요',
    text: '{who}께서 {why} 입원하셨어요. 병원과 회사를 오가야 해요.',
    weight: 4,
    once: true,
    conditions: { minAge: 35 },
    vars: {
      who: ['아버지', '어머니'],
      why: ['수술 때문에', '갑자기 쓰러지셔서', '오래 아프시던 곳이 심해져서'],
    },
    choices: [
      {
        label: '휴직하고 곁을 지킨다',
        outcomes: [
          { chance: 1, text: '{who}께서 회복하셨어요. 그 시간을 후회하지 않아요.', effects: { gradeBonus: -20, assets: -2000 } },
        ],
      },
      {
        label: '일과 병행한다',
        outcomes: [
          { chance: 1, text: '퇴근 후 병원으로 가는 1년을 보냈어요.', effects: { stamina: -25, assets: -2000 } },
        ],
      },
    ],
  },

  // ─── 업종별: AI · B2B SaaS · 공공 ───────────────────────
  {
    id: 'ai_demo_day',
    category: '업계',
    emoji: '🤖',
    title: '데모는 내일, 모델은 {state}',
    text: '내일 투자자 데모인데 모델이 {state}. 대표님은 "데모만 되면 된다"고 해요.',
    weight: 8,
    conditions: { industries: ['ai'] },
    vars: {
      state: ['아직 학습 중이에요', '자꾸 엉뚱한 답을 해요', '어제부터 30초씩 걸려요'],
    },
    choices: [
      {
        label: '데모용 답변을 미리 박아 둔다',
        outcomes: [
          { chance: 0.7, text: '데모는 완벽했어요. 투자자가 "진짜 똑똑하네요"라고 했어요. 양심이 조금 아파요.', effects: { gradeBonus: 8, stamina: -5 } },
          { chance: 0.3, text: '투자자가 대본에 없는 질문을 했어요. 정적이 길었어요.', tone: 'unlucky', effects: { gradeBonus: -8, stats: { reputation: -1 } } },
        ],
      },
      {
        label: '밤새 진짜로 고친다',
        check: { coding: 60 },
        outcomes: [
          { chance: 0.6, text: '새벽 5시에 잡았어요. 데모에서 진짜로 잘 돌아갔어요.', tone: 'skill', effects: { stamina: -15, gradeBonus: 10, stats: { coding: 2 } } },
          { chance: 0.4, text: '못 고쳤어요. 데모는 "네트워크 문제"로 끝났어요.', tone: 'unlucky', effects: { stamina: -15, gradeBonus: -5 } },
        ],
      },
    ],
  },
  {
    id: 'ai_gpu_bill',
    category: '회사',
    emoji: '🔥',
    title: 'GPU 청구서 {amount}억',
    text: '이번 달 GPU 청구서가 {amount}억 원 나왔어요. 누가 학습을 안 끄고 퇴근했대요.',
    weight: 6,
    conditions: { industries: ['ai'] },
    vars: { amount: { min: 2, max: 9 } },
    choices: [
      {
        label: '비용 줄이는 작업을 맡는다',
        check: { design: 55 },
        outcomes: [
          { chance: 0.65, text: '스팟 인스턴스와 캐시로 비용을 절반으로 줄였어요. CFO가 이름을 기억해요.', tone: 'skill', effects: { gradeBonus: 10, stats: { design: 2 } } },
          { chance: 0.35, text: '줄이다가 학습이 두 번 날아갔어요. 연구팀이 째려봐요.', tone: 'unlucky', effects: { gradeBonus: -6, stats: { communication: -1 } } },
        ],
      },
      {
        label: '범인이 내가 아니길 빈다',
        outcomes: [
          { chance: 0.8, text: '범인은 옆 팀이었어요. 휴.', effects: {} },
          { chance: 0.2, text: '로그를 보니… 나였어요. 지난주 금요일의 나.', tone: 'unlucky', effects: { gradeBonus: -10, stamina: -5 } },
        ],
      },
    ],
  },
  {
    id: 'ai_paper_hype',
    category: '업계',
    emoji: '📄',
    title: '새 논문이 나왔어요',
    text: '{lab}에서 새 논문이 나왔어요. 우리가 반년 동안 만든 걸 {days}일 만에 넘어섰대요.',
    weight: 6,
    conditions: { industries: ['ai'], minCareerYear: 1 },
    vars: {
      lab: ['오픈에어아이', '딥마인더', '구글리 리서치', '메타버스 연구소'],
      days: { min: 3, max: 14 },
    },
    choices: [
      {
        label: '주말에 논문을 재현해 본다',
        outcomes: [
          { chance: 1, text: '재현은 반쯤 됐어요. 그래도 회의에서 할 말이 생겼어요.', effects: { stamina: -10, stats: { coding: 2, reputation: 1 } } },
        ],
      },
      {
        label: '"우리 데이터가 진짜 경쟁력"이라고 정리한다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.6, text: '대표님이 그 말을 투자 자료에 그대로 넣었어요.', tone: 'skill', effects: { gradeBonus: 6, stats: { communication: 1 } } },
          { chance: 0.4, text: '"그 데이터, 저쪽도 있던데요?" 신입의 한마디에 회의가 끝났어요.', tone: 'unlucky', effects: { gradeBonus: -4 } },
        ],
      },
    ],
  },
  {
    id: 'saas_big_customer',
    category: '회사',
    emoji: '🤝',
    title: '{customer}의 맞춤 요청',
    text: '매출의 {share}%를 차지하는 {customer}에서 자기들만 쓸 기능을 만들어 달래요. 영업팀은 이미 "된다"고 했어요.',
    weight: 8,
    conditions: { industries: ['b2b_saas'] },
    vars: {
      customer: ['큰손물산', '대한제일상사', '글로벌코퍼레이션', '한빛그룹'],
      share: { min: 20, max: 45 },
    },
    choices: [
      {
        label: '설정으로 켜고 끄게 일반화해서 만든다',
        check: { design: 55 },
        outcomes: [
          { chance: 0.6, text: '다른 고객사도 그 기능을 쓰기 시작했어요. 이번 분기 효자 기능이에요.', tone: 'skill', effects: { gradeBonus: 10, stats: { design: 2 } } },
          { chance: 0.4, text: '일반화하다가 납기를 넘겼어요. 영업팀장이 직접 찾아왔어요.', tone: 'unlucky', effects: { gradeBonus: -8, stamina: -8 } },
        ],
      },
      {
        label: 'if 문으로 빠르게 넣는다',
        outcomes: [
          { chance: 1, text: '코드에 "{customer}일 때만" 분기가 하나 늘었어요. 벌써 일곱 번째예요.', effects: { gradeBonus: 4, stats: { domain: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'saas_churn',
    category: '회사',
    emoji: '📉',
    title: '해지 메일',
    text: '{years}년 쓴 고객사가 해지 메일을 보냈어요. 이유는 "{reason}"래요.',
    weight: 6,
    conditions: { industries: ['b2b_saas'], minCareerYear: 1 },
    vars: {
      years: { min: 2, max: 6 },
      reason: ['더 싼 곳을 찾았어요', '새로 온 임원이 다른 걸 써 봤대요', '로딩이 너무 느려요'],
    },
    choices: [
      {
        label: '고객사 담당자와 직접 통화한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.55, text: '한 시간 통화 끝에 1년 연장을 받아 냈어요. CS팀이 커피를 쐈어요.', tone: 'skill', effects: { gradeBonus: 8, stats: { communication: 2, domain: 1 } } },
          { chance: 0.45, text: '"이미 계약했어요"라는 말만 들었어요.', tone: 'unlucky', effects: { stamina: -5 } },
        ],
      },
      {
        label: '해지 사유를 정리해 회의에 올린다',
        outcomes: [
          { chance: 1, text: '회의에서 다들 고개를 끄덕였어요. 그리고 아무 일도 일어나지 않았어요.', effects: { stats: { domain: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'public_year_end_budget',
    category: '일정',
    emoji: '🗓️',
    title: '연말 예산 소진',
    text: '{month}월인데 올해 예산이 남았대요. 연말까지 "뭐라도" 만들어서 써야 한대요.',
    weight: 8,
    conditions: { industries: ['public'] },
    vars: { month: ['10', '11', '12'] },
    choices: [
      {
        label: '진짜 필요한 걸 찾아서 제안한다',
        check: { domain: 50 },
        outcomes: [
          { chance: 0.6, text: '민원 처리 시간을 줄이는 기능을 넣었어요. 내년 예산에도 반영됐어요.', tone: 'skill', effects: { gradeBonus: 8, stats: { domain: 2 } } },
          { chance: 0.4, text: '"그건 내년 사업으로 하죠." 결국 대시보드를 하나 더 만들었어요.', tone: 'unlucky', effects: { stamina: -5 } },
        ],
      },
      {
        label: '시키는 대시보드를 만든다',
        outcomes: [
          { chance: 1, text: '아무도 안 보는 대시보드가 하나 더 생겼어요. 그래도 칼퇴했어요.', effects: { stamina: 5 } },
        ],
      },
    ],
  },
  {
    id: 'public_audit',
    category: '회사',
    emoji: '🧾',
    title: '국정감사 자료 요청',
    text: '국정감사 자료 요청이 왔어요. 지난 {years}년 치 시스템 로그를 {hours}시간 안에 뽑아 달래요.',
    weight: 6,
    conditions: { industries: ['public'], minCareerYear: 1 },
    vars: {
      years: { min: 3, max: 10 },
      hours: ['12', '24', '48'],
    },
    choices: [
      {
        label: '스크립트로 한 번에 뽑는다',
        check: { coding: 50 },
        outcomes: [
          { chance: 0.65, text: '두 시간 만에 끝냈어요. 과장님이 "역시 IT"라며 어깨를 두드렸어요.', tone: 'skill', effects: { gradeBonus: 8, stats: { coding: 1 } } },
          { chance: 0.35, text: '로그 형식이 해마다 달랐어요. 결국 밤새 엑셀로 맞췄어요.', tone: 'unlucky', effects: { stamina: -12 } },
        ],
      },
      {
        label: '팀원들과 나눠서 손으로 정리한다',
        outcomes: [
          { chance: 1, text: '셋이서 밤새 엑셀을 맞췄어요. 전우애가 생겼어요.', effects: { stamina: -8, stats: { communication: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'public_old_browser',
    category: '레거시',
    emoji: '🧭',
    title: '{browser} 지원 요청',
    text: '{place}에서 아직 {browser}(을)를 쓴대요. 새 시스템이 거기서도 돌아가야 한대요.',
    weight: 6,
    conditions: { industries: ['public', 'si_sm'] },
    vars: {
      browser: ['인터넷 익스플로러 11', '액티브엑스 플러그인', '10년 된 전용 브라우저'],
      place: ['읍사무소 세 곳', '본청 민원실', '산하기관 전산실'],
    },
    choices: [
      {
        label: '호환 모드를 따로 만든다',
        outcomes: [
          { chance: 1, text: '코드가 두 벌이 됐어요. 대신 민원은 안 들어와요.', effects: { stamina: -8, stats: { domain: 2 }, gradeBonus: 4 } },
        ],
      },
      {
        label: '브라우저 교체를 공문으로 요청한다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.5, text: '공문이 통했어요. 다음 달부터 새 브라우저를 깐대요.', tone: 'skill', effects: { gradeBonus: 6, stats: { communication: 2 } } },
          { chance: 0.5, text: '"예산이 없어요." 공문이 그대로 돌아왔어요.', tone: 'unlucky', effects: { stamina: -5 } },
        ],
      },
    ],
  },

  // ─── 창업 (창업한 사람에게만) ─────────────────────────────
  {
    id: 'founder_investor_pitch',
    category: '회사',
    emoji: '🎤',
    title: '투자사 피칭',
    text: '{vc} 심사역 앞에서 {company} 피칭을 해요. 첫 질문은 "{question}"예요.',
    weight: 10,
    conditions: { founder: true },
    vars: {
      vc: ['스파크벤처스', '퍼스트펭귄파트너스', '로켓캐피탈', '모험투자'],
      question: ['그래서 매출은요?', '네모버가 똑같이 만들면 어떡하죠?', 'AI는 어디에 쓰나요?', '대표님은 왜 이걸 하세요?'],
    },
    choices: [
      {
        label: '숫자로 정면 돌파한다',
        check: { domain: 55 },
        outcomes: [
          { chance: 0.5, text: '지표를 술술 설명했어요. 심사역이 다음 미팅을 잡재요.', tone: 'skill', effects: { gradeBonus: 10, stats: { domain: 2 } } },
          { chance: 0.5, text: '숫자 하나가 틀렸어요. 심사역이 계산기를 꺼냈어요.', tone: 'unlucky', effects: { gradeBonus: -5 } },
        ],
      },
      {
        label: '비전을 크게 이야기한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.5, text: '"이 시장 전체를 바꿀 거예요." 심사역이 고개를 끄덕였어요.', tone: 'skill', effects: { gradeBonus: 8, stats: { communication: 2 } } },
          { chance: 0.5, text: '"그래서 내년에 뭐 하시는데요?" 비전이 너무 커서 안 보였대요.', tone: 'unlucky', effects: { gradeBonus: -4 } },
        ],
      },
    ],
  },
  {
    id: 'founder_cofounder_leaves',
    category: '사람',
    emoji: '🚪',
    title: '공동창업자의 고백',
    text: '같이 시작한 {who}(이)가 "{reason}"라며 그만두겠대요.',
    weight: 6,
    conditions: { founder: true },
    vars: {
      who: ['대학 동기', '전 회사 동료', '사이드 프로젝트 동료'],
      reason: ['대기업에서 연락이 왔어', '아이가 생겼어', '나랑은 방향이 안 맞는 것 같아', '1년만 하기로 했잖아'],
    },
    choices: [
      {
        label: '지분을 더 주고 붙잡는다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.6, text: '남기로 했어요. 대신 내 지분이 줄었어요.', tone: 'skill', effects: { gradeBonus: 4 } },
          { chance: 0.4, text: '지분 얘기를 꺼내자 분위기가 더 싸해졌어요. 결국 떠났어요.', tone: 'unlucky', effects: { gradeBonus: -8, stamina: -8 } },
        ],
      },
      {
        label: '좋게 보내 주고 혼자 버틴다',
        outcomes: [
          { chance: 1, text: '일이 두 배가 됐어요. 그래도 회사는 굴러가요.', effects: { stamina: -15, stats: { design: 2, domain: 2 } } },
        ],
      },
    ],
  },
  {
    id: 'founder_runway',
    category: '회사',
    emoji: '⏳',
    title: '통장 잔고 {months}개월',
    text: '이대로면 {months}개월 뒤에 월급을 못 줘요. 직원들 얼굴이 떠올라요.',
    weight: 8,
    conditions: { founder: true },
    vars: { months: { min: 2, max: 6 } },
    choices: [
      {
        label: '외주를 받아 버틴다',
        outcomes: [
          { chance: 1, text: '외주로 숨통이 트였어요. 우리 서비스 개발은 멈췄어요.', effects: { assets: 1500, gradeBonus: -4, stamina: -10 } },
        ],
      },
      {
        label: '내 돈을 넣는다',
        outcomes: [
          { chance: 1, text: '전세 대출 한도를 확인했어요. 회사는 석 달 더 살아요.', effects: { assets: -3000, gradeBonus: 4 } },
        ],
      },
      {
        label: '브릿지 투자를 받으러 다닌다',
        check: { reputation: 40 },
        outcomes: [
          { chance: 0.5, text: '예전 동료가 엔젤로 들어와 줬어요.', tone: 'skill', effects: { gradeBonus: 8 } },
          { chance: 0.5, text: '미팅 열두 번에 커피만 열두 잔 마셨어요.', tone: 'unlucky', effects: { stamina: -10, gradeBonus: -4 } },
        ],
      },
    ],
  },
  {
    id: 'founder_viral',
    category: '업계',
    emoji: '📣',
    title: '{where}에서 터졌어요',
    text: '{company} 서비스가 {where}에서 갑자기 화제가 됐어요. 가입자가 하룻밤에 {times}배로 늘었어요.',
    weight: 6,
    conditions: { founder: true },
    vars: {
      where: ['커뮤니티 인기글', '숏폼 영상', '테크 뉴스레터', '유명 개발자 SNS'],
      times: { min: 3, max: 30 },
    },
    choices: [
      {
        label: '밤새 서버를 늘린다',
        check: { coding: 55 },
        outcomes: [
          { chance: 0.6, text: '서버가 버텼어요. 들어온 사람들이 그대로 남았어요.', tone: 'skill', effects: { gradeBonus: 12, stamina: -12, stats: { reputation: 3 } } },
          { chance: 0.4, text: '서버가 내려갔어요. "이거 왜 안 돼요?"가 새 인기글이 됐어요.', tone: 'unlucky', effects: { gradeBonus: -2, stamina: -15 } },
        ],
      },
      {
        label: '대기 명단을 받는다',
        outcomes: [
          { chance: 1, text: '"한정 오픈"이라고 했더니 오히려 더 궁금해해요.', effects: { gradeBonus: 6, stats: { reputation: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'founder_payroll_night',
    category: '개인',
    emoji: '🧾',
    title: '대표의 25일',
    text: '월급날 전날 밤이에요. {task}까지 대표가 해야 해요.',
    weight: 5,
    conditions: { founder: true },
    vars: { task: ['세금계산서 발행', '4대 보험 신고', '사무실 정수기 필터 교체', '법인 카드 영수증 정리'] },
    choices: [
      {
        label: '오늘도 내가 한다',
        outcomes: [
          { chance: 1, text: '새벽 3시에 끝냈어요. 코드는 한 줄도 못 짰어요.', effects: { stamina: -10, stats: { domain: 1 } } },
        ],
      },
      {
        label: '운영 담당자를 뽑는다',
        outcomes: [
          { chance: 1, text: '좋은 사람이 왔어요. 고정비는 조금 늘었어요.', effects: { assets: -800, stamina: 5, gradeBonus: 2 } },
        ],
      },
    ],
  },
  // ─── 실직 공백기를 보내고 다시 취업한 첫해 ─────────────────
  {
    id: 'gap_first_day',
    category: '커리어',
    emoji: '🌅',
    title: '1년 만의 출근',
    text: '공백기 끝에 다시 출근했어요. {thing}부터 낯설어요.',
    weight: 12,
    conditions: { afterGapYear: true },
    vars: { thing: ['사원증 찍는 법', '아침 8시 지하철', '사내 메신저 알림 소리', '"회의 잠깐 가능하세요?"라는 말'] },
    choices: [
      {
        label: '첫 달은 무리해서라도 따라잡는다',
        outcomes: [
          { chance: 1, text: '퇴근 후에도 코드를 읽었어요. 한 달 만에 감이 돌아왔어요.', effects: { stamina: -12, stats: { coding: 2, domain: 2 }, gradeBonus: 6 } },
        ],
      },
      {
        label: '천천히 적응한다',
        outcomes: [
          { chance: 1, text: '서두르지 않았어요. 대신 첫 평가는 조용히 지나갔어요.', effects: { stamina: 5, gradeBonus: -3 } },
        ],
      },
    ],
  },
  {
    id: 'gap_salary_rumor',
    category: '사람',
    emoji: '🤫',
    title: '연봉을 깎고 들어온 걸 들켰어요',
    text: '회식 자리에서 {who}(이)가 "공백 있으면 연봉 좀 깎이죠?"라며 웃어요. 다들 내 쪽을 봐요.',
    weight: 8,
    conditions: { afterGapYear: true },
    vars: { who: ['옆자리 동료', '입사 동기', '술 취한 선배'] },
    choices: [
      {
        label: '웃으며 넘긴다',
        check: { communication: 45 },
        outcomes: [
          { chance: 0.6, text: '"그래서 더 열심히 해요" 한마디에 분위기가 풀렸어요.', tone: 'skill', effects: { stats: { communication: 2 } } },
          { chance: 0.4, text: '웃었는데 표정이 굳은 게 다 보였나 봐요. 집에 오는 길이 길었어요.', tone: 'unlucky', effects: { stamina: -8 } },
        ],
      },
      {
        label: '실력으로 보여 주겠다고 다짐한다',
        outcomes: [
          { chance: 1, text: '그날부터 이를 악물었어요. 평가가 좋아졌지만 몸이 고생했어요.', effects: { stamina: -10, gradeBonus: 8 } },
        ],
      },
    ],
  },
  {
    id: 'gap_new_stack',
    category: '레거시',
    emoji: '🧩',
    title: '1년 사이에 바뀐 것들',
    text: '쉬는 동안 업계 표준이 {stack}(으)로 바뀌었대요. 팀은 다 쓰는데 나만 처음 봐요.',
    weight: 8,
    conditions: { afterGapYear: true },
    vars: { stack: ['새 빌드 도구', 'AI 코드 리뷰 봇', '새 프론트엔드 프레임워크', '사내 개발 플랫폼'] },
    choices: [
      {
        label: '주말에 공식 문서를 정독한다',
        outcomes: [
          { chance: 1, text: '주말이 사라졌지만 월요일 스탠드업에서 아는 척을 할 수 있었어요.', effects: { stamina: -8, stats: { coding: 3 } } },
        ],
      },
      {
        label: '옆자리에 물어보며 배운다',
        check: { communication: 45 },
        outcomes: [
          { chance: 0.6, text: '동료가 친절하게 알려줬어요. 덕분에 팀과도 빨리 친해졌어요.', tone: 'skill', effects: { stats: { coding: 2, communication: 2 } } },
          { chance: 0.4, text: '세 번째 질문부터 대답이 짧아졌어요.', tone: 'unlucky', effects: { stats: { coding: 1 }, gradeBonus: -3 } },
        ],
      },
    ],
  },
  {
    id: 'gap_old_colleague',
    category: '개인',
    emoji: '☕',
    title: '전 직장 동료의 연락',
    text: '전 직장 동료가 "요즘 뭐 해? 한동안 소식이 없더라"며 커피를 마시재요.',
    weight: 6,
    conditions: { afterGapYear: true },
    choices: [
      {
        label: '공백기 얘기를 솔직하게 한다',
        outcomes: [
          { chance: 0.5, text: '"나도 그랬어." 동료도 공백이 있었대요. 마음이 한결 가벼워졌어요.', tone: 'lucky', effects: { stamina: 10 } },
          { chance: 0.5, text: '동료가 고개를 끄덕이더니 자기 회사 채용 링크를 보내 줬어요.', effects: { offerBonus: 1 } },
        ],
      },
      {
        label: '"잠깐 쉬었어"로 넘긴다',
        outcomes: [
          { chance: 1, text: '커피는 맛있었어요. 대화는 날씨 얘기로 끝났어요.', effects: {} },
        ],
      },
    ],
  },

  // ─── 일반 ──────────────────────────────────────────────
  {
    id: 'cert_expired',
    category: '장애',
    emoji: '🔒',
    title: 'SSL 인증서 만료',
    text: '{when} 서비스 접속 화면에 "연결이 비공개로 설정되어 있지 않습니다"가 떠요. 인증서 갱신 담당은 {owner}였어요.',
    weight: 6,
    severity: true,
    vars: {
      when: ['월요일 아침', '연휴 첫날', '대규모 이벤트 당일'],
      owner: ['작년에 퇴사한 사람', '아무도 아닌 사람', '나'],
    },
    choices: [
      {
        label: '바로 갱신하고 자동화까지 건다',
        check: { coding: 50 },
        outcomes: [
          { chance: 0.7, text: '갱신하고 자동 갱신까지 걸었어요. 다시는 이 일로 깨지 않아요.', tone: 'skill', effects: { stamina: -6, gradeBonus: 8, counters: { incidents: 1 } } },
          { chance: 0.3, text: '갱신은 했는데 중간 인증서를 빼먹어서 한 번 더 터졌어요.', tone: 'unlucky', effects: { stamina: -12, gradeBonus: -4, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '일단 갱신만 하고 잔다',
        outcomes: [
          { chance: 1, text: '불은 껐어요. 1년 뒤 같은 날 알람이 울릴지는 아무도 몰라요.', effects: { stamina: -4, gradeBonus: 2, counters: { incidents: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'cloud_bill',
    category: '장애',
    emoji: '💸',
    title: '클라우드 요금 {times}배',
    text: '이번 달 클라우드 청구서가 평소의 {times}배예요. 범인은 {culprit}(이)래요.',
    weight: 6,
    vars: {
      times: { min: 3, max: 15 },
      culprit: ['꺼지지 않은 테스트 서버', '무한 루프 도는 배치', '로그를 전부 저장하는 설정', '누가 켜 둔 GPU 인스턴스'],
    },
    choices: [
      {
        label: '비용 대시보드를 만들어 막는다',
        check: { design: 50 },
        outcomes: [
          { chance: 0.6, text: '경보까지 걸었어요. 다음 분기 비용이 30% 줄었어요.', tone: 'skill', effects: { stamina: -8, gradeBonus: 10, stats: { design: 2 } } },
          { chance: 0.4, text: '대시보드는 만들었는데 아무도 안 봐요. 다음 달에 또 터졌어요.', tone: 'unlucky', effects: { stamina: -8, gradeBonus: -2 } },
        ],
      },
      {
        label: '조용히 서버만 끈다',
        outcomes: [
          { chance: 1, text: '요금은 멈췄어요. 청구서는 재무팀이 들고 왔어요.', effects: { gradeBonus: -4 } },
        ],
      },
    ],
  },
  {
    id: 'disk_full',
    category: '장애',
    emoji: '💽',
    title: '디스크 100%',
    text: '{time}에 서버 디스크가 꽉 찼어요. 들여다보니 {file}(이)가 {size}GB예요.',
    weight: 5,
    severity: true,
    vars: {
      time: ['새벽 2시', '점심시간', '배포 직후'],
      file: ['디버그 로그', '임시 업로드 폴더', '3년 치 백업 파일'],
      size: { min: 200, max: 900 },
    },
    choices: [
      {
        label: '로그 정리 규칙을 제대로 만든다',
        outcomes: [
          { chance: 1, text: '로그 보관 정책을 만들었어요. 다들 왜 이제야 했냐고 해요.', effects: { stamina: -8, gradeBonus: 6, counters: { incidents: 1 } } },
        ],
      },
      {
        label: '일단 지우고 본다',
        outcomes: [
          { chance: 0.7, text: '지웠더니 살아났어요. 무엇을 지웠는지는 묻지 마세요.', effects: { stamina: -4, counters: { incidents: 1 } } },
          { chance: 0.3, text: '지운 파일 중에 결제 기록이 있었어요. 복구에 사흘이 걸렸어요.', tone: 'unlucky', effects: { stamina: -15, gradeBonus: -8, counters: { incidents: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'excel_core',
    category: '레거시',
    emoji: '📊',
    title: '회사의 심장은 엑셀이었다',
    text: '알고 보니 {process}(이)가 {person} PC의 엑셀 매크로 하나로 돌아가고 있었어요.',
    weight: 6,
    vars: {
      process: ['월말 정산', '전 직원 급여 계산', '재고 발주', '고객 등급 산정'],
      person: ['재무팀 과장님', '퇴사를 앞둔 대리님', '휴직 중인 차장님'],
    },
    choices: [
      {
        label: '시스템으로 옮긴다',
        check: { domain: 50 },
        outcomes: [
          { chance: 0.6, text: '매크로의 숨은 규칙 열두 개를 찾아 옮겼어요. 이제 휴가도 마음 편히 가요.', tone: 'skill', effects: { stamina: -10, gradeBonus: 10, stats: { domain: 3 }, counters: { refactors: 1 } } },
          { chance: 0.4, text: '옮기고 나니 숫자가 1원씩 달라요. 다시 엑셀로 돌아갔어요.', tone: 'unlucky', effects: { stamina: -12, gradeBonus: -5 } },
        ],
      },
      {
        label: '백업만 해 두고 모른 척한다',
        outcomes: [
          { chance: 1, text: '파일을 세 곳에 백업했어요. 마음 한구석이 계속 불안해요.', effects: {} },
        ],
      },
    ],
  },
  {
    id: 'framework_eol',
    category: '레거시',
    emoji: '⏰',
    title: '지원 종료 D-{days}',
    text: '우리 서비스가 쓰는 {framework} 지원이 {days}일 뒤에 끝나요. 업그레이드 문서는 {pages}쪽이에요.',
    weight: 6,
    conditions: { minCareerYear: 2 },
    vars: {
      days: { min: 30, max: 180 },
      framework: ['프레임워크 버전', '언어 런타임', 'DB 엔진', '운영체제 이미지'],
      pages: { min: 40, max: 300 },
    },
    choices: [
      {
        label: '업그레이드를 맡는다',
        check: { coding: 55 },
        outcomes: [
          { chance: 0.6, text: '깨지는 테스트를 하나씩 고쳐 마감 전에 끝냈어요.', tone: 'skill', effects: { stamina: -12, gradeBonus: 10, stats: { coding: 2 }, counters: { refactors: 1 } } },
          { chance: 0.4, text: '반쯤 올리다 멈췄어요. 이제 두 버전이 섞여 돌아가요.', tone: 'unlucky', effects: { stamina: -12, gradeBonus: -5 } },
        ],
      },
      {
        label: '"보안 패치만 계속 나오면 괜찮아요"',
        outcomes: [
          { chance: 1, text: '일단 미뤘어요. 내년에 같은 공지가 또 올 거예요.', effects: { gradeBonus: -2 } },
        ],
      },
    ],
  },
  {
    id: 'ceo_demo_tomorrow',
    category: '일정',
    emoji: '🎬',
    title: '내일 대표님 시연',
    text: '내일 아침 대표님 앞에서 {feature} 시연을 한대요. 지금 그 기능은 {state}예요.',
    weight: 7,
    vars: {
      feature: ['신규 결제 화면', 'AI 추천 기능', '관리자 대시보드', '모바일 앱 새 버전'],
      state: ['기획서만 있는 상태', '절반쯤 돌아가는 상태', '내 PC에서만 되는 상태'],
    },
    choices: [
      {
        label: '밤새 진짜로 돌아가게 만든다',
        outcomes: [
          { chance: 1, text: '아침 9시에 마지막 커밋을 했어요. 시연은 성공했고 눈이 빨개요.', effects: { stamina: -15, gradeBonus: 10 } },
        ],
      },
      {
        label: '정해진 순서대로만 누르면 되는 시연을 만든다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.6, text: '각본대로 매끄럽게 흘러갔어요. 아무도 다른 버튼을 누르지 않았어요.', tone: 'skill', effects: { stamina: -5, gradeBonus: 6 } },
          { chance: 0.4, text: '대표님이 "이건 뭐예요?" 하며 다른 버튼을 눌렀어요.', tone: 'unlucky', effects: { stamina: -5, gradeBonus: -8 } },
        ],
      },
    ],
  },
  {
    id: 'holiday_release',
    category: '일정',
    emoji: '🧳',
    title: '명절 전날 출시',
    text: '{holiday} 연휴 전날 출시가 잡혔어요. 고향 가는 {transport} 표는 이미 끊어 뒀어요.',
    weight: 6,
    vars: {
      holiday: ['설', '추석'],
      transport: ['KTX', '고속버스', '비행기'],
    },
    choices: [
      {
        label: '노트북을 들고 고향에 간다',
        outcomes: [
          { chance: 0.6, text: '휴게소에서 핫픽스를 올렸어요. 친척들은 내가 뭘 하는지 끝까지 몰랐어요.', effects: { stamina: -10, gradeBonus: 6 } },
          { chance: 0.4, text: '아무 일도 없었어요. 노트북은 가방에서 한 번도 안 나왔어요.', tone: 'lucky', effects: { stamina: 5 } },
        ],
      },
      {
        label: '출시를 연휴 뒤로 미루자고 한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.5, text: '"연휴에 장애 나면 아무도 못 와요." 설득이 통했어요.', tone: 'skill', effects: { stamina: 8, stats: { communication: 2 } } },
          { chance: 0.5, text: '"마케팅이 이미 나갔어요." 일정은 그대로였어요.', tone: 'unlucky', effects: { stamina: -8, gradeBonus: -3 } },
        ],
      },
    ],
  },
  {
    id: 'sprint_overload',
    category: '일정',
    emoji: '📋',
    title: '이번 스프린트 티켓 {count}개',
    text: '2주짜리 스프린트에 내 티켓이 {count}개 잡혔어요. 그중 {urgent}개는 "긴급"이에요.',
    weight: 7,
    vars: {
      count: { min: 12, max: 30 },
      urgent: { min: 4, max: 10 },
    },
    choices: [
      {
        label: '우선순위를 다시 정하자고 한다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.6, text: '진짜 긴급한 건 두 개뿐이었어요. 나머지는 다음 스프린트로 갔어요.', tone: 'skill', effects: { stamina: 4, stats: { communication: 2 }, gradeBonus: 4 } },
          { chance: 0.4, text: '"다 중요해요." 회의만 한 시간 늘었어요.', tone: 'unlucky', effects: { stamina: -8 } },
        ],
      },
      {
        label: '말없이 다 쳐낸다',
        outcomes: [
          { chance: 1, text: '다 끝냈어요. 다음 스프린트에는 티켓이 더 많이 잡혔어요.', effects: { stamina: -14, gradeBonus: 8 } },
        ],
      },
    ],
  },
  {
    id: 'meeting_marathon',
    category: '사람',
    emoji: '📆',
    title: '하루 회의 {count}개',
    text: '오늘 캘린더에 회의가 {count}개 잡혀 있어요. 코딩할 시간은 {gap}분이에요.',
    weight: 7,
    conditions: { minCareerYear: 3 },
    vars: {
      count: { min: 5, max: 9 },
      gap: { min: 10, max: 40 },
    },
    choices: [
      {
        label: '필요 없는 회의는 정중히 빠진다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.6, text: '"회의록으로 볼게요." 세 개를 빠졌고 오후에 코드를 짰어요.', tone: 'skill', effects: { stamina: 5, stats: { coding: 1 } } },
          { chance: 0.4, text: '빠진 회의에서 내 일이 정해졌어요.', tone: 'unlucky', effects: { stamina: -6, gradeBonus: -4 } },
        ],
      },
      {
        label: '다 들어가고 밤에 코딩한다',
        outcomes: [
          { chance: 1, text: '낮에는 회의, 밤에는 코딩. 오늘도 퇴근은 자정이에요.', effects: { stamina: -12, gradeBonus: 4 } },
        ],
      },
    ],
  },
  {
    id: 'late_night_message',
    category: '사람',
    emoji: '🌙',
    title: '밤 {hour}시의 메신저',
    text: '밤 {hour}시에 {boss}한테 메신저가 왔어요. "{message}"',
    weight: 7,
    vars: {
      hour: { min: 10, max: 12 },
      message: ['내일 아침에 잠깐 얘기 좀 해요', '이거 혹시 지금 확인 가능해요?', '자요?', '내일 회의 자료 한 장만 추가해 줘요'],
    },
    choices: [
      {
        label: '바로 답장한다',
        outcomes: [
          { chance: 1, text: '답장했더니 대화가 새벽 1시까지 이어졌어요.', effects: { stamina: -10, gradeBonus: 5 } },
        ],
      },
      {
        label: '아침에 확인한다',
        outcomes: [
          { chance: 0.7, text: '아침에 보니 별일 아니었어요. 잠은 푹 잤어요.', effects: { stamina: 3 } },
          { chance: 0.3, text: '"어제 연락이 안 되더라고요." 아침부터 분위기가 싸했어요.', tone: 'unlucky', effects: { gradeBonus: -5 } },
        ],
      },
    ],
  },
  {
    id: 'conference_invite',
    category: '커리어',
    emoji: '🎙️',
    title: '{conf} 발표 제안',
    text: '{conf}에서 발표해 달라는 메일이 왔어요. 주제는 "{topic}"이래요.',
    weight: 6,
    conditions: { minCareerYear: 4 },
    vars: {
      conf: ['개발자 컨퍼런스', '사내 기술 세미나', '오픈소스 밋업'],
      topic: ['우리 팀의 장애 회고', '레거시와 공존하는 법', 'AI 도구 도입기', '트래픽 10배를 버틴 이야기'],
    },
    choices: [
      {
        label: '발표를 준비한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.6, text: '질문이 끊이지 않았어요. 발표 영상이 커뮤니티에 돌았어요.', tone: 'skill', effects: { stamina: -8, stats: { reputation: 4, communication: 2 }, offerBonus: 1 } },
          { chance: 0.4, text: '데모가 멈췄어요. 그래도 끝까지 웃으며 마쳤어요.', tone: 'unlucky', effects: { stamina: -10, stats: { reputation: 1 } } },
        ],
      },
      {
        label: '바쁘다고 거절한다',
        outcomes: [
          { chance: 1, text: '대신 옆 팀 사람이 발표했어요. 박수는 그쪽이 받았어요.', effects: {} },
        ],
      },
    ],
  },
  {
    id: 'tech_blog_viral',
    category: '커리어',
    emoji: '✍️',
    title: '블로그 글이 떴어요',
    text: '퇴근 후 쓴 "{post}" 글이 {where}에 올라갔어요. 조회수가 {views}만이에요.',
    weight: 5,
    vars: {
      post: ['신입 때 몰랐던 것들', '우리 회사 레거시 탈출기', '코드 리뷰 잘 받는 법', '장애 대응 체크리스트'],
      where: ['개발 뉴스레터', '커뮤니티 인기글', '테크 큐레이션 사이트'],
      views: { min: 1, max: 30 },
    },
    choices: [
      {
        label: '후속 글을 쓴다',
        outcomes: [
          { chance: 0.6, text: '시리즈가 됐어요. 헤드헌터 연락이 늘었어요.', effects: { stamina: -8, stats: { reputation: 3 }, offerBonus: 1 } },
          { chance: 0.4, text: '후속 글은 조회수 12였어요. 원래 다 그래요.', tone: 'unlucky', effects: { stamina: -6, stats: { reputation: 1 } } },
        ],
      },
      {
        label: '댓글만 즐긴다',
        outcomes: [
          { chance: 1, text: '"이거 우리 회사 얘기 아님?" 댓글을 보며 웃었어요.', effects: { stamina: 4, stats: { reputation: 2 } } },
        ],
      },
    ],
  },
  {
    id: 'ai_agent_rumor',
    category: '업계',
    emoji: '🤖',
    title: 'AI 에이전트가 팀을 대신한대요',
    text: '{source}에 "{company_kind}들이 AI 에이전트로 개발 인력을 {percent}% 줄인다"는 기사가 떴어요.',
    weight: 6,
    conditions: { minCalendarYear: 2027 },
    vars: {
      source: ['경제 신문', '업계 뉴스레터', '블라인더 인기글'],
      company_kind: ['대기업', '빅테크', '스타트업'],
      percent: { min: 10, max: 50 },
    },
    choices: [
      {
        label: 'AI를 가장 잘 쓰는 사람이 된다',
        check: { design: 55 },
        outcomes: [
          { chance: 0.6, text: 'AI가 짠 코드를 검토하고 설계하는 쪽으로 자리를 옮겼어요.', tone: 'skill', effects: { stamina: -8, stats: { design: 3, domain: 2 } } },
          { chance: 0.4, text: '도구를 바꿔 가며 써 봤는데 뭐가 맞는지 모르겠어요.', tone: 'unlucky', effects: { stamina: -8, stats: { coding: 1 } } },
        ],
      },
      {
        label: '"작년에도 그랬어요"라며 넘긴다',
        outcomes: [
          { chance: 1, text: '마음 편하게 지냈어요. 기사는 내년에도 나올 거예요.', effects: { stamina: 5 } },
        ],
      },
    ],
  },
  {
    id: 'market_freeze',
    category: '업계',
    emoji: '🧊',
    title: '채용 시장이 얼었어요',
    text: '업계 곳곳에서 채용을 멈췄대요. {sign}',
    weight: 5,
    vars: {
      sign: ['헤드헌터 연락이 뚝 끊겼어요.', '채용 공고가 반으로 줄었어요.', '지인 회사는 이미 붙은 사람의 입사를 미뤘대요.'],
    },
    choices: [
      {
        label: '지금 자리에서 버티며 실력을 쌓는다',
        outcomes: [
          { chance: 1, text: '조용히 공부했어요. 시장이 풀리면 써먹을 거예요.', effects: { stats: { coding: 2, design: 2 }, stamina: -5 } },
        ],
      },
      {
        label: '그래도 이직 준비를 한다',
        outcomes: [
          { chance: 0.4, text: '얼어붙은 시장에서도 한 곳이 연락을 줬어요.', tone: 'lucky', effects: { offerBonus: 1, stamina: -6 } },
          { chance: 0.6, text: '서류 열 곳에 답이 하나도 없어요.', effects: { stamina: -8 } },
        ],
      },
    ],
  },
  {
    id: 'turtle_neck',
    category: '생활',
    emoji: '🐢',
    title: '거북목 진단',
    text: '건강검진에서 "목이 {cm}cm 앞으로 나와 있어요"라는 말을 들었어요. 의사 선생님이 직업을 묻더니 고개를 끄덕여요.',
    weight: 7,
    conditions: { minCareerYear: 3 },
    vars: { cm: { min: 2, max: 7 } },
    choices: [
      {
        label: '모니터 받침대와 스트레칭을 시작한다',
        outcomes: [
          { chance: 1, text: '한 시간마다 목을 돌려요. 동료들이 따라 하기 시작했어요.', effects: { stamina: 8, assets: -30 } },
        ],
      },
      {
        label: '도수 치료를 끊는다',
        outcomes: [
          { chance: 1, text: '목이 한결 가벼워졌어요. 통장은 조금 가벼워졌어요.', effects: { stamina: 12, assets: -150 } },
        ],
      },
      {
        label: '"개발자는 다 이래요"',
        outcomes: [
          { chance: 1, text: '아무것도 안 했어요. 오후마다 두통이 와요.', effects: { stamina: -8 } },
        ],
      },
    ],
  },
  {
    id: 'wedding_season',
    category: '생활',
    emoji: '💌',
    title: '청첩장 {count}장',
    text: '이번 달에만 청첩장이 {count}장 왔어요. 그중 하나는 {who}예요.',
    weight: 5,
    conditions: { minAge: 27, maxAge: 40 },
    vars: {
      count: { min: 3, max: 7 },
      who: ['10년 만에 연락 온 동창', '전 직장 동료', '얼굴만 아는 옆 팀 사람'],
    },
    choices: [
      {
        label: '다 간다',
        outcomes: [
          { chance: 1, text: '주말마다 결혼식에 갔어요. 사람은 남았고 통장은 비었어요.', effects: { assets: -100, stamina: -6, stats: { communication: 1 } } },
        ],
      },
      {
        label: '축의금만 보낸다',
        outcomes: [
          { chance: 1, text: '계좌 이체만 다섯 번 했어요. 주말은 지켰어요.', effects: { assets: -50 } },
        ],
      },
    ],
  },

  // ─── 창업 (추가) ───────────────────────────────────────
  {
    id: 'founder_hiring',
    category: '사람',
    emoji: '🧲',
    title: '첫 개발자 채용',
    text: '{company}에 첫 개발자를 뽑아야 해요. 지원자는 {applicants}명, 줄 수 있는 연봉은 대기업의 {percent}%예요.',
    weight: 7,
    conditions: { founder: true },
    vars: {
      applicants: { min: 1, max: 6 },
      percent: { min: 50, max: 80 },
    },
    choices: [
      {
        label: '지분과 비전으로 설득한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.5, text: '실력 좋은 개발자가 합류했어요. 일이 두 배로 빨라졌어요.', tone: 'skill', effects: { gradeBonus: 10, stamina: 5 } },
          { chance: 0.5, text: '"생각해 볼게요." 일주일 뒤 대기업에 갔대요.', tone: 'unlucky', effects: { gradeBonus: -3, stamina: -5 } },
        ],
      },
      {
        label: '당분간 혼자 다 한다',
        outcomes: [
          { chance: 1, text: '대표 겸 개발자 겸 고객센터가 됐어요.', effects: { stamina: -15, stats: { coding: 2, domain: 2 } } },
        ],
      },
    ],
  },
  {
    id: 'founder_big_client',
    category: '회사',
    emoji: '🏢',
    title: '대기업 PoC 제안',
    text: '{client}에서 우리 서비스로 PoC를 해 보재요. 조건은 "{condition}"이에요.',
    weight: 7,
    conditions: { founder: true },
    vars: {
      client: ['대기업 계열사', '시중 은행', '대형 유통사'],
      condition: ['무료로 3개월', '우리 서버에 설치형으로', '보안 심사 서류 200쪽 제출'],
    },
    choices: [
      {
        label: '받는다',
        check: { domain: 55 },
        outcomes: [
          { chance: 0.5, text: 'PoC가 본계약으로 이어졌어요. 투자사 미팅에서 쓸 숫자가 생겼어요.', tone: 'skill', effects: { gradeBonus: 12, stamina: -10, assets: 1000 } },
          { chance: 0.5, text: '석 달을 쏟았는데 "내부 검토 결과 보류"래요.', tone: 'unlucky', effects: { gradeBonus: -6, stamina: -12 } },
        ],
      },
      {
        label: '우리 제품에 집중한다',
        outcomes: [
          { chance: 1, text: '거절했어요. 대신 기존 고객들이 좋아하는 기능을 냈어요.', effects: { gradeBonus: 3 } },
        ],
      },
    ],
  },
  {
    id: 'founder_copycat',
    category: '업계',
    emoji: '🐘',
    title: '대기업이 똑같은 걸 냈어요',
    text: '{giant}(이)가 우리랑 거의 똑같은 서비스를 냈어요. 이름만 다르고 버튼 위치까지 같아요.',
    weight: 5,
    conditions: { founder: true },
    vars: { giant: ['네모버', '대형 플랫폼', '빅테크 계열사'] },
    choices: [
      {
        label: '더 좁고 깊은 시장으로 간다',
        check: { design: 55 },
        outcomes: [
          { chance: 0.6, text: '대기업이 신경 안 쓰는 고객에 집중했어요. 오히려 팬이 늘었어요.', tone: 'skill', effects: { gradeBonus: 8, stats: { design: 2 } } },
          { chance: 0.4, text: '방향을 트는 사이에 고객 절반이 넘어갔어요.', tone: 'unlucky', effects: { gradeBonus: -10 } },
        ],
      },
      {
        label: '"시장이 검증된 거예요"라고 투자자에게 말한다',
        check: { communication: 55 },
        outcomes: [
          { chance: 0.5, text: '투자자가 웃으며 고개를 끄덕였어요.', tone: 'skill', effects: { gradeBonus: 6 } },
          { chance: 0.5, text: '"그래서 이길 방법은요?" 대답을 못 했어요.', tone: 'unlucky', effects: { gradeBonus: -6 } },
        ],
      },
    ],
  },
  {
    id: 'founder_grant',
    category: '회사',
    emoji: '🗂️',
    title: '정부 지원사업 공고',
    text: '창업 지원금 {amount}만 원짜리 공고가 떴어요. 제출 서류는 {docs}종이에요.',
    weight: 6,
    conditions: { founder: true },
    vars: {
      amount: { min: 3000, max: 10000 },
      docs: { min: 8, max: 20 },
    },
    choices: [
      {
        label: '사업계획서를 밤새 쓴다',
        check: { communication: 50 },
        outcomes: [
          { chance: 0.5, text: '선정됐어요! 대신 분기마다 보고서를 써야 해요.', tone: 'skill', effects: { assets: 3000, stamina: -10 } },
          { chance: 0.5, text: '탈락했어요. 사유는 "사업성 불분명"이래요.', tone: 'unlucky', effects: { stamina: -10 } },
        ],
      },
      {
        label: '서류 쓸 시간에 제품을 만든다',
        outcomes: [
          { chance: 1, text: '공고는 넘겼어요. 이번 주 배포는 두 번 했어요.', effects: { gradeBonus: 4 } },
        ],
      },
    ],
  },
  {
    id: 'founder_health',
    category: '개인',
    emoji: '🩺',
    title: '대표의 건강검진',
    text: '창업하고 처음 받은 건강검진 결과지에 빨간 글씨가 {count}개예요.',
    weight: 5,
    conditions: { founder: true },
    vars: { count: { min: 2, max: 6 } },
    choices: [
      {
        label: '주 2회 운동 시간을 캘린더에 박는다',
        outcomes: [
          { chance: 1, text: '대표가 6시에 나가니 팀도 눈치 보지 않고 퇴근해요.', effects: { stamina: 15, gradeBonus: -2 } },
        ],
      },
      {
        label: '투자 받고 나서 챙긴다',
        outcomes: [
          { chance: 1, text: '결과지를 서랍에 넣었어요. 커피를 한 잔 더 마셨어요.', effects: { stamina: -8, gradeBonus: 3 } },
        ],
      },
    ],
  },
]
