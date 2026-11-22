// 개발용 미리보기: http://localhost:5173/?avatar-preview (배포 빌드에는 들어가지 않는다)

import { EventScene, type SceneKind } from './scene/EventScene'

const SCENES: { kind: SceneKind; label: string }[] = [
  { kind: 'work', label: '기본 (업계·개인 등)' },
  { kind: 'incident', label: '장애' },
  { kind: 'night', label: '레거시·일정 (야근)' },
  { kind: 'meeting', label: '사람 (회의·리뷰)' },
  { kind: 'office', label: '회사·커리어' },
  { kind: 'break', label: '생활' },
]

export function AvatarPreview() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 bg-white p-5">
      <h1 className="text-lg font-bold">이벤트 장면 시안</h1>
      {SCENES.map((s) => (
        <section key={s.kind} className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-600">{s.label}</p>
          <EventScene kind={s.kind} scale={2.6} />
        </section>
      ))}
    </div>
  )
}
