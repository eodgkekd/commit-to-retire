// 도트(픽셀 아트) 캐릭터. 44×40칸 격자에 모양을 픽셀 단위로 찍고(안티앨리어싱 없음),
// 캐릭터 둘레에 1칸 외곽선을 둘러 도트 그림처럼 보이게 한다. posture(0~4)가 오를수록 등이 굽고 목이 빠진다.

import { DEFAULT_LOOK, POSTURE_LABELS, type AvatarLook } from './Avatar'

const W = 44
const H = 40
type Point = [number, number]
type Grid = (string | null)[][]

const OUTLINE = '#1B1B2F'

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount))).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

class Canvas {
  grid: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null))
  /** 외곽선을 둘러야 하는 칸 (캐릭터) */
  body: boolean[][] = Array.from({ length: H }, () => Array<boolean>(W).fill(false))

  set(x: number, y: number, color: string, isBody = false) {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    this.grid[y][x] = color
    if (isBody) this.body[y][x] = true
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color)
  }

  /** 픽셀 중심이 다각형 안에 있으면 칠한다 */
  poly(points: Point[], color: string, isBody = true) {
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        if (inside(points, x + 0.5, y + 0.5)) this.set(x, y, color, isBody)
      }
    }
  }

  circle([cx, cy]: Point, r: number, color: string, isBody = true, filter?: (dx: number, dy: number) => boolean) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx
        const dy = y + 0.5 - cy
        if (dx * dx + dy * dy <= r * r && (!filter || filter(dx, dy))) this.set(x, y, color, isBody)
      }
    }
  }

  /** 두께가 있는 선 (팔·다리·목) */
  line(points: Point[], width: number, color: string, isBody = true) {
    for (let k = 0; k < points.length - 1; k++) {
      const [a, b] = [points[k], points[k + 1]]
      const minX = Math.floor(Math.min(a[0], b[0]) - width)
      const maxX = Math.ceil(Math.max(a[0], b[0]) + width)
      const minY = Math.floor(Math.min(a[1], b[1]) - width)
      const maxY = Math.ceil(Math.max(a[1], b[1]) + width)
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        if (distToSegment([x + 0.5, y + 0.5], a, b) <= width / 2) this.set(x, y, color, isBody)
      }
    }
  }

  /** 캐릭터 둘레의 빈칸·가구칸에 외곽선 */
  outline() {
    const add: Point[] = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.body[y][x]) continue
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.body[y + dy]?.[x + dx])
      if (near) add.push([x, y])
    }
    for (const [x, y] of add) this.grid[y][x] = OUTLINE
  }
}

function inside(pts: Point[], x: number, y: number): boolean {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function distToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax
  const dy = by - ay
  const t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function draw(look: AvatarLook, p: number, desk: boolean): Grid {
  const c = new Canvas()
  const skin = look.skin
  const skinDark = shade(look.skin, -0.18)
  const shirt = look.shirt
  const shirtDark = shade(look.shirt, -0.28)
  const shirtLight = shade(look.shirt, 0.2)
  const hair = look.hair
  const hairLight = shade(look.hair, 0.25)

  // ── 가구 (외곽선 없이 자체 음영) ──
  c.rect(7, 16, 3, 16, '#3F3F5A') // 의자 등받이
  c.rect(8, 17, 1, 13, '#E04848')
  c.rect(7, 31, 13, 2, '#3F3F5A') // 좌판
  c.rect(13, 33, 2, 5, '#55556E')
  c.rect(10, 38, 8, 1, '#55556E')
  if (desk) {
    c.rect(27, 29, 17, 2, '#8B6B4A') // 책상
    c.rect(27, 30, 17, 1, '#6E5238')
    c.rect(41, 31, 2, 9, '#6E5238')
    c.rect(36, 13, 3, 15, '#25253A') // 모니터
    for (let y = 15; y < 26; y += 2) c.rect(36, y, 1, 1, y % 4 === 3 ? '#4ADE80' : '#22C55E')
    c.rect(37, 28, 2, 1, '#25253A')
    c.rect(35, 28, 4, 1, '#25253A')
    c.rect(28, 28, 5, 1, '#45455E') // 키보드
    c.rect(28, 27, 5, 1, '#A78BFA')
    c.rect(33, 25, 2, 4, '#84CC16') // 에너지 드링크
    c.rect(33, 25, 2, 1, '#D4D4D8')
  }

  // ── 뼈대 ──
  const hip: Point = [15, 30]
  const sh: Point = [16.5 + 0.95 * p, 19 + 0.75 * p]
  const backBulge: Point = [10.5 - 0.45 * p, 24.5 + 0.1 * p]
  const neck: Point = [sh[0] + 1.6 + 0.5 * p, sh[1] - 1.6 + 0.35 * p]
  const head: Point = [neck[0] + 2.6 + 0.7 * p, neck[1] - 4.6 + 0.45 * p]
  const elbow: Point = [sh[0] + 3.5, 27.5]
  const hand: Point = [29, 27.5]
  const knee: Point = [24, 31]
  const foot: Point = [24, 37]

  // 다리 (바지 + 신발)
  c.line([hip, knee, foot], 3.6, look.pants)
  c.rect(23, 37, 5, 2, '#3B82F6')
  c.set(27, 38, '#93C5FD', true)
  for (let y = 37; y < 39; y++) for (let x = 23; x < 28; x++) c.body[y][x] = true

  // 몸통 (후드티)
  const torso: Point[] = [
    [hip[0] - 3.5, hip[1] + 1],
    backBulge,
    [sh[0] - 3, sh[1] - 0.5],
    [sh[0] + 2.5, sh[1] + 0.5],
    [hip[0] + 4.5, hip[1] - 4],
    [hip[0] + 4, hip[1] + 1],
  ]
  c.poly(torso, shirt)
  // 등 쪽 음영과 후드
  c.poly([[backBulge[0], backBulge[1]], [sh[0] - 3, sh[1] - 0.5], [sh[0] - 1.5, sh[1] + 2], [backBulge[0] + 2, backBulge[1] + 1]], shirtDark)
  c.circle([sh[0] - 2.6, sh[1] + 1.3], 1.9, shirtDark)
  // 후드 끈
  c.set(Math.round(sh[0] + 1), Math.round(sh[1] + 2), '#F4F4F5', true)
  c.set(Math.round(sh[0] + 1), Math.round(sh[1] + 3), '#F4F4F5', true)

  // 목
  c.line([[sh[0] + 0.5, sh[1]], neck, [head[0] - 1.2, head[1] + 3]], 2.4, skin)

  // 팔
  c.line([[sh[0] + 0.5, sh[1] + 1.5], elbow, [hand[0] - 2, hand[1]]], 2.6, shirt)
  c.line([[elbow[0] + 0.5, elbow[1] - 0.6], [hand[0] - 2, hand[1]]], 1, shirtLight)
  c.circle(hand, 1.3, skin)

  // ── 머리 ──
  const [hx, hy] = head
  const r = 5.3
  if (look.hairStyle === 'long') c.poly([[hx - r + 0.5, hy - 1], [hx - r - 1, hy + 5], [hx - r + 1.5, hy + 8], [hx - 1, hy + 3]], hair)
  if (look.hairStyle === 'bun') c.circle([hx - r + 0.8, hy - r + 0.8], 2.2, hair)
  c.circle(head, r, skin)
  c.circle(head, r, skinDark, true, (dx, dy) => dy > 3.6 && dx < 2) // 턱 아래 음영
  c.set(Math.round(hx + r), Math.round(hy + 0.4), skin, true) // 코
  c.set(Math.round(hx + 2.5), Math.round(hy + 2.6), '#F87171', true) // 볼
  c.set(Math.round(hx + 3), Math.round(hy + 3.6), '#7F1D1D', true) // 입

  // 머리카락
  if (look.hairStyle === 'buzz') {
    c.circle(head, r, shade(hair, 0.1), true, (dx, dy) => dy < -2.4 || (dx < -2.6 && dy < 0.5))
  } else if (look.hairStyle === 'curly') {
    for (const dx of [-4, -1.6, 0.8, 3]) c.circle([hx + dx, hy - r + 1.2], 1.9, hair)
    c.circle([hx - r + 1, hy - 1.2], 1.8, hair)
  } else {
    c.circle(head, r, hair, true, (dx, dy) => dy < -1.8 + dx * 0.15 || (dx < -1.8 && dy < 1.2))
    // 뻗친 머리
    c.set(Math.round(hx - 2), Math.round(hy - r - 0.8), hair, true)
    c.set(Math.round(hx + 0.5), Math.round(hy - r - 1.2), hair, true)
    c.set(Math.round(hx + 0.5), Math.round(hy - r - 0.2), hair, true)
    c.set(Math.round(hx + 3), Math.round(hy - r - 0.4), hair, true)
    c.set(Math.round(hx - 1), Math.round(hy - r + 0.6), hairLight, true)
  }

  // 헤드폰: 귀 위 컵 + 정수리 밴드
  const cx = Math.round(hx - 3.4)
  const cy = Math.round(hy - 0.8)
  c.rect(cx, cy, 2, 3, '#2A2A40')
  c.set(cx, cy + 1, '#E04848')
  for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 2; x++) c.body[y][x] = true
  for (let y = Math.round(hy - r); y < cy; y++) c.set(cx + 1, y, '#2A2A40', true)

  // 뿔테 안경 + 눈
  const gx = Math.round(hx + 2)
  const gy = Math.round(hy - 1.2)
  c.rect(gx, gy, 3, 3, '#1B1B2F')
  c.set(gx + 1, gy + 1, '#E0F2FE', true)
  c.set(gx + 2, gy + 1, '#1B1B2F', true)
  c.set(gx - 1, gy + 1, '#1B1B2F', true)
  c.set(gx - 2, gy + 1, '#1B1B2F', true)

  c.outline()

  // 통증 표시는 외곽선 위에
  if (p >= 3) {
    const [x, y] = [Math.round(neck[0] - 3.5), Math.round(neck[1] - 1)]
    c.set(x, y, '#EF4444'); c.set(x - 1, y + 1, '#EF4444'); c.set(x, y + 1, '#EF4444'); c.set(x - 1, y + 2, '#EF4444')
  }
  if (p >= 4) {
    const [x, y] = [Math.round(hx - 1), Math.round(hy - r - 3.5)]
    c.set(x, y, '#A1A1AA'); c.set(x + 1, y - 1, '#A1A1AA'); c.set(x + 3, y, '#A1A1AA'); c.set(x + 4, y - 1, '#A1A1AA')
  }
  return c.grid
}

export function PixelAvatar({ look = DEFAULT_LOOK, posture = 0, size = 120, desk = true }: { look?: AvatarLook; posture?: number; size?: number; desk?: boolean }) {
  const p = Math.max(0, Math.min(4, Math.round(posture)))
  const grid = draw(look, p, desk)

  // 같은 색이 이어지는 칸은 한 rect로 합친다
  const rects: { x: number; y: number; w: number; color: string }[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < W) {
      const color = row[x]
      if (!color) { x++; continue }
      let w = 1
      while (x + w < W && row[x + w] === color) w++
      rects.push({ x, y, w, color })
      x += w
    }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} shapeRendering="crispEdges" role="img" aria-label={`도트 캐릭터, ${POSTURE_LABELS[p]}`}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  )
}
