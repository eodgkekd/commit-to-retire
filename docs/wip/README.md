# 진행 중: 도트 장면·캐릭터 (보류)

main에 합치지 않은 실험 브랜치예요. 개발 서버에서 `http://localhost:5173/?avatar-preview`로 볼 수 있어요.

## 들어 있는 것
- `src/ui/scene/EventScene.tsx`: 이벤트 종류별 사무실 장면 6개 (기본·장애·야근·회의·출근·휴식) + CSS 애니메이션 (`src/index.css`의 `px-*`)
- `src/ui/scene/sprites.ts`: 2dPig Pixel Office(CC0) 조각 46개의 이름과 놓이는 곳 (바닥·벽·책상 위·칸막이)
- `src/assets/pixel-office/`: 에셋 시트, 예시 장면의 사무실 소품 레이어(투명 배경), CC0 라이선스
- `src/ui/Avatar.tsx`, `NerdAvatar.tsx`, `PixelAvatar.tsx`: 코드로 그린 캐릭터 시안 3종 (거북목 자세 0~4단계). 퀄리티 문제로 쓰지 않기로 함
- `docs/wip/*.jpg|png`: 시안 캡처

## 정리된 사실
- 팩의 사람 5명은 모두 정면으로 서 있는 그림. 의자에 앉은 그림은 예시 장면(PixelOffice.aseprite의 Office 레이어)에만 1명 있음
- 동작 애니메이션 프레임은 없음 (Aseprite 파일도 1프레임)
- 회색 긴 판 = 칸막이(책상 아님), 노란 사각형 = 책상 상판, 빨강·파랑·초록 상자 = 레트로 컴퓨터

## 남은 결정
- 이벤트 삽화를 그림 AI(예: Nano Banana)로 만들지, 종류별 도트 장면 + 일부 전용 장면으로 갈지
- 캐릭터 선택을 이 팩의 5명으로 바꿀지 (책상 장면은 앉은 그림이 1명뿐이라 구도 변경 필요)
