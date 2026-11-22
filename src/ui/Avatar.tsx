// 코드로 그린 옆모습 캐릭터. 책상 앞에 앉아 모니터를 보는 모습이고,
// posture(0~4)가 오를수록 등이 굽고(라운드숄더) 목이 앞으로 빠진다(거북목).

export type HairStyle = 'short' | 'long' | 'bun' | 'buzz' | 'curly'

export interface AvatarLook {
  skin: string
  hair: string
  hairStyle: HairStyle
  shirt: string
  pants: string
  glasses: boolean
}

export const SKIN_TONES = ['#F9D7C1', '#F1C6A5', '#E0AC86', '#C68A62', '#8D5A3B']
export const HAIR_COLORS = ['#1F1B18', '#4A3226', '#8B5A2B', '#D9A441', '#9AA0A6']
export const SHIRT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6']
export const HAIR_STYLES: HairStyle[] = ['short', 'long', 'bun', 'buzz', 'curly']

export const DEFAULT_LOOK: AvatarLook = {
  skin: SKIN_TONES[1],
  hair: HAIR_COLORS[0],
  hairStyle: 'short',
  shirt: SHIRT_COLORS[0],
  pants: '#374151',
  glasses: false,
}

/** 자세 단계 이름 (0 = 꼿꼿, 4 = 완전히 굽음) */
export const POSTURE_LABELS = ['꼿꼿한 신입', '살짝 거북목', '거북목', '라운드숄더', '물음표 자세']

type Point = [number, number]
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]

export function Avatar({ look = DEFAULT_LOOK, posture = 0, size = 120, desk = true }: { look?: AvatarLook; posture?: number; size?: number; desk?: boolean }) {
  const p = Math.max(0, Math.min(4, posture))

  // 뼈대: 엉덩이 → (굽은 등) → 어깨 → 목 → 머리. p가 오를수록 어깨가 앞·아래로, 머리가 앞으로 빠진다
  const hip: Point = [48, 100]
  const shoulder: Point = [50 + 3.5 * p, 63 + 2.2 * p]
  const back: Point = [42 - 3 * p, 82 - p] // 등 곡선의 조절점 (뒤로 빠질수록 둥근 등)
  const neck = add(shoulder, [2 + 1.8 * p, -5 + 0.8 * p])
  const head = add(neck, [3 + 2.6 * p, -11 + 1.4 * p])
  const elbow: Point = [shoulder[0] + 9, 85]
  const hand: Point = [86, 86]
  const knee: Point = [76, 101]
  const foot: Point = [77, 128]

  const torso = `M ${hip[0] - 8} ${hip[1]} Q ${back[0] - 8} ${back[1]} ${shoulder[0] - 7} ${shoulder[1]} L ${shoulder[0] + 6} ${shoulder[1] + 2} Q ${back[0] + 12} ${back[1] + 4} ${hip[0] + 8} ${hip[1]} Z`

  return (
    <svg viewBox="0 0 130 140" width={size} height={(size * 140) / 130} role="img" aria-label={`캐릭터, ${POSTURE_LABELS[Math.round(p)]}`}>
      {/* 의자 */}
      <rect x={30} y={100} width={34} height={5} rx={2} fill="#9CA3AF" />
      <rect x={30} y={70} width={5} height={35} rx={2} fill="#9CA3AF" />
      <rect x={45} y={105} width={3} height={22} fill="#9CA3AF" />
      <rect x={36} y={126} width={22} height={3} rx={1.5} fill="#9CA3AF" />

      {desk && (
        <>
          {/* 책상과 모니터 */}
          <rect x={80} y={88} width={48} height={4} rx={1} fill="#A16207" />
          <rect x={122} y={92} width={3} height={36} fill="#A16207" />
          <rect x={112} y={80} width={3} height={8} fill="#4B5563" />
          <rect x={104} y={86} width={18} height={2.5} rx={1} fill="#4B5563" />
          <rect x={107} y={50} width={6} height={31} rx={1.5} fill="#1F2937" />
          <rect x={108.2} y={52} width={1.6} height={27} fill="#60A5FA" opacity={0.85} />
          {/* 키보드 */}
          <rect x={84} y={85} width={14} height={3} rx={1} fill="#6B7280" />
        </>
      )}

      {/* 다리 */}
      <path d={`M ${hip[0]} ${hip[1]} L ${knee[0]} ${knee[1]} L ${foot[0]} ${foot[1]}`} stroke={look.pants} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M ${foot[0] - 3} ${foot[1] + 2} h 13`} stroke="#111827" strokeWidth={5} strokeLinecap="round" />

      {/* 몸통 */}
      <path d={torso} fill={look.shirt} />

      {/* 목 */}
      <path d={`M ${shoulder[0]} ${shoulder[1]} L ${neck[0]} ${neck[1]} L ${head[0] - 3} ${head[1] + 6}`} stroke={look.skin} strokeWidth={7} strokeLinecap="round" fill="none" />

      {/* 팔 (몸통 앞) */}
      <path d={`M ${shoulder[0] + 1} ${shoulder[1] + 3} L ${elbow[0]} ${elbow[1]} L ${hand[0]} ${hand[1]}`} stroke={look.shirt} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M ${(elbow[0] + hand[0]) / 2 + 3} ${(elbow[1] + hand[1]) / 2} L ${hand[0]} ${hand[1]}`} stroke={look.skin} strokeWidth={6} strokeLinecap="round" fill="none" />

      {/* 머리 */}
      <Head center={head} look={look} />

      {/* 통증 표시: 굽을수록 목 뒤에 번개 */}
      {p >= 3 && <Pain at={add(neck, [-9, -2])} />}
      {p >= 4 && <Pain at={add(shoulder, [-14, 4])} />}
    </svg>
  )
}

function Head({ center: [x, y], look }: { center: Point; look: AvatarLook }) {
  const r = 11
  return (
    <g>
      {/* 뒤로 내려오는 머리카락은 얼굴 뒤에 */}
      {look.hairStyle === 'long' && <path d={`M ${x - r + 1} ${y - 3} Q ${x - r - 3} ${y + 12} ${x - r + 2} ${y + 20} L ${x - 2} ${y + 8} Z`} fill={look.hair} />}
      {look.hairStyle === 'bun' && <circle cx={x - r + 1} cy={y - 8} r={5} fill={look.hair} />}

      <circle cx={x} cy={y} r={r} fill={look.skin} />
      {/* 코와 귀 */}
      <path d={`M ${x + r - 1} ${y - 1} l 3 3 l -3 1`} fill={look.skin} />
      <ellipse cx={x - 2} cy={y + 1} rx={2} ry={2.8} fill={look.skin} stroke="#00000022" strokeWidth={0.8} />
      {/* 눈 */}
      <circle cx={x + 6} cy={y - 2} r={1.2} fill="#111827" />
      {/* 입 */}
      <path d={`M ${x + 6} ${y + 5} q 2 0.8 3.5 0`} stroke="#11182766" strokeWidth={0.9} fill="none" strokeLinecap="round" />

      {/* 머리카락 윗부분 */}
      {look.hairStyle === 'buzz' ? (
        <path d={`M ${x - r} ${y - 1} A ${r} ${r} 0 0 1 ${x + r - 2} ${y - 5} Q ${x} ${y - 7} ${x - r} ${y - 1} Z`} fill={look.hair} opacity={0.75} />
      ) : look.hairStyle === 'curly' ? (
        <g fill={look.hair}>
          {[-9, -4, 1, 6].map((dx) => (
            <circle key={dx} cx={x + dx} cy={y - r + 2} r={4.2} />
          ))}
          <circle cx={x - r + 2} cy={y - 3} r={4} />
        </g>
      ) : (
        <path d={`M ${x - r - 0.5} ${y + 2} A ${r + 0.5} ${r + 0.5} 0 0 1 ${x + r - 1} ${y - 5} Q ${x + 2} ${y - 4} ${x - 3} ${y - 3} Q ${x - 6} ${y + 1} ${x - r - 0.5} ${y + 2} Z`} fill={look.hair} />
      )}

      {look.glasses && (
        <g stroke="#111827" strokeWidth={1} fill="#ffffff55">
          <rect x={x + 3.5} y={y - 4.5} width={6} height={4.5} rx={1.2} />
          <path d={`M ${x + 3.5} ${y - 2.5} L ${x - 2} ${y - 1.5}`} fill="none" />
        </g>
      )}
    </g>
  )
}

function Pain({ at: [x, y] }: { at: Point }) {
  return <path d={`M ${x} ${y} l -3 4 h 3 l -3 4`} stroke="#EF4444" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
}
