# 커밋에서 은퇴까지

신입 첫 출근부터 은퇴까지, 한국 개발자의 커리어를 1년 단위로 살아보는 풍자 육성 게임.
게임은 브라우저에서 동작하며, 짧은 결과 공유 링크는 Cloudflare Workers KV에 결과를 저장합니다.

- 플레이: https://commit-to-retire.commit-to-retire.workers.dev
- 기획서: [docs/기획서.md](docs/기획서.md)

## 실행

```bash
npm install
npm run dev
```

짧은 링크까지 로컬에서 확인하려면 먼저 `npm run build` 후 별도 터미널에서 `npm run dev:api`를 실행합니다.
Vite의 `/api` 요청은 로컬 Worker(8787 포트)로 전달됩니다. 로컬 KV는 `.wrangler`에 저장되며 운영 데이터와 분리됩니다.

## 스택

Vite · React · TypeScript · Zustand · Tailwind CSS · Vitest

## 구조

```
src/
  engine/   게임 규칙 (순수 TS 함수, UI 의존 없음)
  data/     회사·이벤트·반응 콘텐츠 (타입 붙은 TS 배열)
  store/    Zustand 상태 + localStorage 저장
  screens/  화면 (phase별 한 화면)
  ui/       공통 UI 조각 (모바일 레이아웃, 버튼, 능력치 바)
docs/       기획 문서
```

## 배포

Cloudflare Workers에 정적 자산과 공유 API를 함께 배포합니다 (`wrangler.jsonc`).

```bash
npm run deploy
```

첫 배포 시 Wrangler가 `SHARED_RESULTS` KV 저장소를 자동 생성·연결합니다. 원본 저장소 관리자의 Cloudflare 계정에서 배포해야 합니다.
CLI가 기록한 KV ID는 이후 배포에도 유지하세요. 공유 결과는 만료 없이 저장하며, 링크를 가진 사람은 조회할 수 있습니다.
생성 요청은 IP별 분당 10회, 결과 크기는 24KB로 제한합니다. KV 변경은 다른 지역에 반영되기까지 잠시 걸릴 수 있어 조회 실패 시 다시 불러오기를 제공합니다.
기존 `#result=...` 링크도 계속 지원하고, 새 링크는 `#s=16자리ID` 형태입니다.
