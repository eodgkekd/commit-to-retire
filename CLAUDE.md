# 커밋에서 은퇴까지 — 작업 규칙

기획의 기준 문서는 `docs/기획서.md`. 규칙·수치가 바뀌면 기획서도 같이 고친다.

## 구조 원칙
- `src/engine/`은 순수 함수만. React·DOM·localStorage를 import하지 않는다.
- 랜덤은 항상 주입받은 시드 RNG를 쓴다 (`Math.random` 금지). 같은 시드 = 같은 결과.
- 콘텐츠(이벤트, 회사, 반응 문구)는 로직과 분리해 `src/data/*.ts`에 타입이 붙은 배열로 둔다. 타입은 `src/engine/types.ts`.
- 콘텐츠를 추가·수정하면 `npm test`(데이터 무결성 검사)와 `npm run build`가 통과해야 한다.
- 화면 문구는 한국어, 해요체.
- 실존 회사·커뮤니티는 패러디 이름만 쓴다 (블라인더, OKKO, 잡행성, 네모버 등).

## 명령
- `npm run dev` 개발 서버
- `npm test` 엔진 테스트 (Vitest)
- `npm run build` 타입 체크 + 빌드
- `npm run deploy` 빌드 후 Cloudflare에 배포 (https://commit-to-retire.commit-to-retire.workers.dev)
- `npm run balance` 봇 자동 플레이 리포트 + **필승법 검사** (고정 전략 하나라도 S 20% 초과면 실패). 약 2분. 수치를 바꾸면 반드시 돌린다

## 엔진 흐름
(`applyFirstJobs`로 첫 회사 결정) → `createGame` → (`startYear` → `chooseEventOption`* → `finishYear` → `acknowledgeYear` → 허브: `applyToPosting`/`acceptOffer`/`declineOffers`/`chooseTrack`/`spendGapYear`/`nextYear`/`retireNow`) 반복 → `retired`.
모든 함수는 상태를 복사해 새 상태를 돌려준다. 밸런스 규칙은 `src/engine/year.ts`·`rules.ts`·`jobs.ts`, **밸런스 수치는 `src/data/balance.ts`**, 나머지 데이터는 `src/data/`.

## 저장과 CI
- 저장 데이터는 불러올 때 `src/engine/save.ts`의 `isLoadableSave`로 검사한다. `GameState`에 **필수** 필드를 추가하거나 데이터 id(회사 유형·직급 등)를 지우면 예전 세이브가 걸러지므로, 새 필드는 가능한 한 선택(`?`)으로 두고 없을 때의 기본 동작을 넣는다.
- 저장 형식 자체를 바꾸면 `src/store/game.ts`의 `version`을 올리고 `migrate`에서 변환한다.
- GitHub Actions(`.github/workflows/ci.yml`)가 푸시·PR마다 `npm run lint`, `npm test`, `npm run build`, `npm run balance`를 돌린다. 올리기 전에 로컬에서 같은 명령을 통과시킨다.
- 실명, 실제 회사명, 참고한 게임 이름을 코드·문서·커밋 메시지에 넣지 않는다 (이 저장소는 포트폴리오로 공개돼 있다).

## 문구
- 이벤트·반응 문구에 `{변수}`(이벤트의 `vars`, 피드의 `{name}` `{company}` 등)를 쓸 수 있다.
- 변수 뒤 조사는 `(이)가` `(은)는` `(을)를` `(와)과` `(으)로`로 쓰면 받침에 맞게 바뀐다 (`src/engine/text.ts`).
- 반응 문구(피드)는 게임 속 게시글이라 커뮤니티 말투(반말·음슴체), 화면 문구는 해요체.

## 화면
- 모바일 우선: `ui/`의 `Screen`(최대 폭 28rem, 하단 고정 버튼) 안에 만든다. 375px 폭에서 가로 스크롤이 생기면 안 된다.
- 화면은 `GameState.phase`로 고른다 (`App.tsx`). 상태 변경은 `store/game.ts`의 액션만 쓴다.
- 이모지는 합성 이모지(🧑‍💻 같은 ZWJ)를 쓰지 않는다. Windows 10에서 두 글자로 깨진다.
