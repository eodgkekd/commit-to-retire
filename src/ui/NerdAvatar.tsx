// 너드 스타일 옆모습 캐릭터. 머리가 큰 2등신에 가까운 비율, 두꺼운 뿔테 안경, 후드티, 헤드폰, 에너지 드링크.
// 뼈대와 자세(posture 0~4) 규칙은 Avatar.tsx와 같다.

import { DEFAULT_LOOK, POSTURE_LABELS, type AvatarLook } from './Avatar'

type Point = [number, number]
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]

/** 색을 조금 어둡게 (후드 안쪽, 끈) */
function shade(hex: string, amount = 0.25): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

export function NerdAvatar({ look = DEFAULT_LOOK, posture = 0, size = 120, desk = true }: { look?: AvatarLook; posture?: number; size?: number; desk?: boolean }) {
  const p = Math.max(0, Math.min(4, posture))
  const hoodie = look.shirt
  const hoodieDark = shade(look.shirt)

  const hip: Point = [48, 102]
  const shoulder: Point = [50 + 3.5 * p, 72 + 2.2 * p]
  const back: Point = [41 - 3 * p, 88 - p]
  const neck = add(shoulder, [2 + 1.8 * p, -3 + 0.8 * p])
  const head = add(neck, [3 + 2.8 * p, -14 + 1.6 * p])
  const elbow: Point = [shoulder[0] + 8, 88]
  const hand: Point = [86, 87]
  const knee: Point = [74, 103]
  const foot: Point = [75, 128]

  const torso = `M ${hip[0] - 9} ${hip[1]} Q ${back[0] - 9} ${back[1]} ${shoulder[0] - 8} ${shoulder[1]} L ${shoulder[0] + 7} ${shoulder[1] + 2} Q ${back[0] + 14} ${back[1] + 5} ${hip[0] + 9} ${hip[1]} Z`
  // 등 뒤로 늘어진 후드
  const hood = `M ${shoulder[0] - 8} ${shoulder[1] - 1} Q ${shoulder[0] - 16} ${shoulder[1] + 4} ${shoulder[0] - 12} ${shoulder[1] + 13} Q ${shoulder[0] - 5} ${shoulder[1] + 9} ${shoulder[0] - 1} ${shoulder[1] + 3} Z`

  return (
    <svg viewBox="0 0 130 140" width={size} height={(size * 140) / 130} role="img" aria-label={`너드 캐릭터, ${POSTURE_LABELS[Math.round(p)]}`}>
      {/* 게이밍 의자 */}
      <rect x={28} y={102} width={36} height={5} rx={2.5} fill="#1F2937" />
      <path d="M 28 104 L 28 62 Q 28 56 34 56 L 36 56 L 36 104 Z" fill="#1F2937" />
      <rect x={30} y={60} width={4} height={40} rx={1} fill="#EF4444" />
      <rect x={45} y={107} width={3} height={20} fill="#374151" />
      <rect x={36} y={126} width={22} height={3} rx={1.5} fill="#374151" />

      {desk && (
        <>
          <rect x={80} y={89} width={48} height={4} rx={1} fill="#57534E" />
          <rect x={122} y={93} width={3} height={35} fill="#57534E" />
          {/* 모니터: 초록 코드 */}
          <rect x={112} y={80} width={3} height={9} fill="#111827" />
          <rect x={104} y={87} width={18} height={2.5} rx={1} fill="#111827" />
          <rect x={106} y={46} width={7} height={35} rx={1.5} fill="#111827" />
          {[50, 55, 60, 65, 70, 75].map((y, i) => (
            <rect key={y} x={107.4} y={y} width={1.4} height={i % 2 ? 2.5 : 3.5} fill="#22C55E" />
          ))}
          {/* 기계식 키보드 + 에너지 드링크 */}
          <rect x={83} y={85.5} width={15} height={3.5} rx={1} fill="#1F2937" />
          <rect x={84} y={84.5} width={13} height={1.5} rx={0.5} fill="#A855F7" opacity={0.8} />
          <rect x={99} y={78} width={5} height={11} rx={1.2} fill="#84CC16" />
          <rect x={99} y={78} width={5} height={1.6} fill="#D1D5DB" />
        </>
      )}

      {/* 다리 (트레이닝 바지 + 슬리퍼) */}
      <path d={`M ${hip[0]} ${hip[1]} L ${knee[0]} ${knee[1]} L ${foot[0]} ${foot[1]}`} stroke={look.pants} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M ${knee[0] - 2} ${knee[1] + 6} L ${foot[0] - 2} ${foot[1] - 2}`} stroke="#ffffff99" strokeWidth={1.2} />
      <path d={`M ${foot[0] - 4} ${foot[1] + 2} h 13`} stroke="#3B82F6" strokeWidth={4} strokeLinecap="round" />

      {/* 후드티 */}
      <path d={hood} fill={hoodieDark} />
      <path d={torso} fill={hoodie} />
      {/* 앞주머니와 끈 */}
      <path d={`M ${hip[0] + 1} ${hip[1] - 9} q 7 -1 9 -9`} stroke={hoodieDark} strokeWidth={1.4} fill="none" />
      <path d={`M ${shoulder[0] + 4} ${shoulder[1] + 3} l 1 8 M ${shoulder[0] + 6} ${shoulder[1] + 3} l 1.5 7`} stroke="#F9FAFB" strokeWidth={1.1} strokeLinecap="round" />

      {/* 목 */}
      <path d={`M ${shoulder[0]} ${shoulder[1]} L ${neck[0]} ${neck[1]} L ${head[0] - 4} ${head[1] + 9}`} stroke={look.skin} strokeWidth={7} strokeLinecap="round" fill="none" />

      {/* 팔 */}
      <path d={`M ${shoulder[0] + 1} ${shoulder[1] + 3} L ${elbow[0]} ${elbow[1]} L ${hand[0] - 4} ${hand[1]}`} stroke={hoodie} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={hand[0] - 1} cy={hand[1] - 0.5} r={3} fill={look.skin} />

      <NerdHead center={head} look={look} />

      {p >= 3 && <Pain at={add(neck, [-10, -1])} />}
      {p >= 4 && <Pain at={add(shoulder, [-16, 5])} />}
      {/* 4단계: 머리 위에 김 (과열) */}
      {p >= 4 && <path d={`M ${head[0] - 4} ${head[1] - 22} q 2 -3 0 -6 M ${head[0] + 2} ${head[1] - 23} q 2 -3 0 -6`} stroke="#9CA3AF" strokeWidth={1.2} fill="none" strokeLinecap="round" />}
    </svg>
  )
}

function NerdHead({ center: [x, y], look }: { center: Point; look: AvatarLook }) {
  const r = 15
  return (
    <g>
      {look.hairStyle === 'long' && <path d={`M ${x - r + 1} ${y - 4} Q ${x - r - 4} ${y + 14} ${x - r + 3} ${y + 22} L ${x - 3} ${y + 10} Z`} fill={look.hair} />}
      {look.hairStyle === 'bun' && <circle cx={x - r + 2} cy={y - 11} r={6} fill={look.hair} />}

      <ellipse cx={x} cy={y} rx={r} ry={r - 1} fill={look.skin} />
      {/* 볼 홍조, 코, 귀 */}
      <circle cx={x + 7} cy={y + 5} r={2.6} fill="#F87171" opacity={0.35} />
      <path d={`M ${x + r - 1.5} ${y} l 3.5 3.5 l -3.5 1.5`} fill={look.skin} />
      <ellipse cx={x - 3} cy={y + 2} rx={2.4} ry={3.4} fill={look.skin} stroke="#00000022" strokeWidth={0.8} />
      {/* 뻐드렁니 미소 */}
      <path d={`M ${x + 6} ${y + 8} q 3 1.4 6 -0.5`} stroke="#11182799" strokeWidth={1} fill="none" strokeLinecap="round" />
      <rect x={x + 8.5} y={y + 8.2} width={2} height={2.2} rx={0.4} fill="#FFFFFF" stroke="#11182744" strokeWidth={0.4} />

      {/* 부스스한 머리 */}
      {look.hairStyle === 'buzz' ? (
        <path d={`M ${x - r} ${y - 1} A ${r} ${r - 1} 0 0 1 ${x + r - 3} ${y - 7} Q ${x} ${y - 9} ${x - r} ${y - 1} Z`} fill={look.hair} opacity={0.75} />
      ) : look.hairStyle === 'curly' ? (
        <g fill={look.hair}>
          {[-12, -6, 0, 6].map((dx) => (
            <circle key={dx} cx={x + dx} cy={y - r + 3} r={5.2} />
          ))}
          <circle cx={x - r + 3} cy={y - 4} r={5} />
        </g>
      ) : (
        <path
          d={`M ${x - r - 1} ${y + 3} Q ${x - r - 2} ${y - r} ${x - 4} ${y - r - 1} L ${x - 6} ${y - r - 6} L ${x - 1} ${y - r - 1} L ${x + 1} ${y - r - 7} L ${x + 4} ${y - r} L ${x + 9} ${y - r - 4} L ${x + 9} ${y - r + 3} Q ${x + r} ${y - 9} ${x + r - 2} ${y - 5} Q ${x + 3} ${y - 6} ${x - 4} ${y - 4} Q ${x - 8} ${y + 1} ${x - r - 1} ${y + 3} Z`}
          fill={look.hair}
        />
      )}

      {/* 헤드폰 */}
      <path d={`M ${x - 6} ${y - r + 1} Q ${x - 2} ${y - r - 6} ${x + 4} ${y - r + 1}`} stroke="#111827" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d={`M ${x - 6} ${y - r + 1} Q ${x - 9} ${y - 6} ${x - 4} ${y - 2}`} stroke="#111827" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <rect x={x - 7.5} y={y - 3} width={7} height={9} rx={3} fill="#EF4444" stroke="#111827" strokeWidth={1.2} />

      {/* 두꺼운 뿔테 안경 (항상) */}
      <circle cx={x + 8} cy={y - 1} r={5.2} fill="#FFFFFF66" stroke="#111827" strokeWidth={2} />
      <path d={`M ${x + 2.8} ${y - 1.5} L ${x - 1} ${y - 1}`} stroke="#111827" strokeWidth={1.8} />
      <circle cx={x + 9.5} cy={y - 1} r={1.4} fill="#111827" />
      <path d={`M ${x + 5.5} ${y - 4} l 1.6 -0.6`} stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" />
    </g>
  )
}

function Pain({ at: [x, y] }: { at: Point }) {
  return <path d={`M ${x} ${y} l -3 4 h 3 l -3 4`} stroke="#EF4444" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
}
