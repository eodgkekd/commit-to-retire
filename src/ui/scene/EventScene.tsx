// 이벤트 화면 위에 보여주는 작은 사무실 장면 (도트, 애니메이션).
// 128×72 논리 픽셀로 짜고 CSS로 정수배 확대한다. 그림은 2dPig Pixel Office (CC0).
//
// 배치 규칙 (sprites.ts의 placement와 팩 예시 장면을 따른다)
// - 벽에 거는 것은 벽(0~WALL_H) 안에만
// - 바닥 가구를 벽에 붙일 때는 아랫변을 AGAINST_WALL에 맞춘다
// - 테이블 위 물건은 onTable()로 아랫변을 상판 안에 둔다 (허공에 뜨지 않게)
// - 칸막이는 책상이 아니다. 책상 상판은 칸막이 아래의 노란 사각형이다

import type { CSSProperties, ReactNode } from 'react'
import type { EventCategory } from '../../engine'
import { OBJECT_CROPS, OBJECTS_SIZE, OBJECTS_URL, SHEET_SIZE, SHEET_URL, SPRITES, type ObjectCropName, type SpriteName } from './sprites'

export type SceneKind = 'work' | 'incident' | 'night' | 'meeting' | 'office' | 'break'

export const SCENE_W = 128
export const SCENE_H = 72
const WALL_H = 32
/** 벽에 붙여 세우는 가구의 아랫변 위치 */
const AGAINST_WALL = WALL_H + 6

/** 벽에 붙여 세울 때의 y (아랫변을 벽 바로 앞 바닥에 맞춘다) */
const wallY = (name: SpriteName) => AGAINST_WALL - SPRITES[name].h
/** 테이블 위에 올릴 때의 y (아랫변이 상판 안쪽에 오게) */
const onTable = (tableY: number, name: SpriteName) => tableY + 8 - SPRITES[name].h

/** 이벤트 카테고리 → 장면 */
export function sceneForCategory(category: EventCategory): SceneKind {
  switch (category) {
    case '장애':
      return 'incident'
    case '레거시':
    case '일정':
      return 'night'
    case '사람':
      return 'meeting'
    case '커리어':
    case '회사':
      return 'office'
    case '생활':
      return 'break'
    default:
      return 'work'
  }
}

function Sprite({ name, x, y, flip, className, style }: { name: SpriteName; x: number; y: number; flip?: boolean; className?: string; style?: CSSProperties }) {
  const r = SPRITES[name]
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: r.w,
        height: r.h,
        backgroundImage: `url(${SHEET_URL})`,
        backgroundPosition: `-${r.x}px -${r.y}px`,
        backgroundSize: `${SHEET_SIZE.w}px ${SHEET_SIZE.h}px`,
        imageRendering: 'pixelated',
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
    />
  )
}

/** 예시 장면에서 잘라 온 그림 */
function Crop({ name, x, y, className }: { name: ObjectCropName; x: number; y: number; className?: string }) {
  const r = OBJECT_CROPS[name]
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: r.w,
        height: r.h,
        backgroundImage: `url(${OBJECTS_URL})`,
        backgroundPosition: `-${r.x}px -${r.y}px`,
        backgroundSize: `${OBJECTS_SIZE.w}px ${OBJECTS_SIZE.h}px`,
        imageRendering: 'pixelated',
      }}
    />
  )
}

/** 도트 말풍선 */
function Bubble({ x, y, children, tone = 'white' }: { x: number; y: number; children: ReactNode; tone?: 'white' | 'red' }) {
  return (
    <div
      className="px-pop"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        padding: '1px 2px',
        background: tone === 'red' ? '#EF4444' : '#FFFFFF',
        color: tone === 'red' ? '#FFFFFF' : '#1B1B2F',
        boxShadow: '0 0 0 1px #1B1B2F',
        fontSize: 6,
        lineHeight: '6px',
        fontWeight: 700,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  )
}

function Room({ night = false, children }: { night?: boolean; children: ReactNode }) {
  return (
    <>
      {/* 벽 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: WALL_H,
          background: night ? 'repeating-linear-gradient(#2E3550 0 5px, #283048 5px 6px)' : 'repeating-linear-gradient(#F1F4F9 0 5px, #DCE2EC 5px 6px)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: WALL_H - 2, height: 2, background: night ? '#1E2438' : '#5A6B85' }} />
      {/* 바닥 타일 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: WALL_H,
          bottom: 0,
          backgroundColor: night ? '#24508A' : '#3B9BE6',
          backgroundImage: night
            ? 'repeating-linear-gradient(#1C3F6E 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, #1C3F6E 0 1px, transparent 1px 16px)'
            : 'repeating-linear-gradient(#2F7FC4 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, #2F7FC4 0 1px, transparent 1px 16px)',
        }}
      />
      {children}
    </>
  )
}

const DESK_X = 26
const DESK_Y = 36

/** 칸막이 자리: 예시 장면에서 의자에 앉아 일하는 사람이 있는 칸을 잘라 쓴다 */
function Desk({ alert = false, bob = 'px-bob' }: { alert?: boolean; bob?: string }) {
  const up = OBJECT_CROPS.seatedUpper
  const base = OBJECT_CROPS.seatedCubicle
  return (
    <>
      <Crop name="seatedCubicle" x={DESK_X} y={DESK_Y} className={alert ? 'px-alert-glow' : undefined} />
      {/* 앉은 사람의 상체만 겹쳐서 움직인다 */}
      <Crop name="seatedUpper" x={DESK_X + up.x - base.x} y={DESK_Y + up.y - base.y} className={bob} />
    </>
  )
}
/** 앉은 사람 머리 위치 (말풍선·땀방울 기준) */
const HEAD = { x: DESK_X + 10, y: DESK_Y + 4 }

export function EventScene({ kind, scale = 3 }: { kind: SceneKind; scale?: number }) {
  return (
    <div aria-hidden style={{ width: SCENE_W * scale, height: SCENE_H * scale, overflow: 'hidden', borderRadius: 12, boxShadow: '0 0 0 1px #E5E7EB' }}>
      <div style={{ position: 'relative', width: SCENE_W, height: SCENE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {kind === 'work' && (
          <Room>
            <Sprite name="window" x={30} y={4} />
            <Sprite name="clock" x={66} y={4} />
            <Sprite name="calendar" x={100} y={8} />
            <Sprite name="plant" x={6} y={wallY('plant')} />
            <Sprite name="waterCooler" x={112} y={wallY('waterCooler')} />
            <Desk />
          </Room>
        )}

        {kind === 'incident' && (
          <Room>
            <Sprite name="window" x={30} y={4} />
            <Sprite name="clock" x={66} y={4} />
            <Sprite name="plant" x={6} y={wallY('plant')} />
            <Desk alert bob="px-shake" />
            <Bubble x={HEAD.x - 4} y={HEAD.y - 10} tone="red">!!</Bubble>
            {/* 칸막이에서 떨어진 메모지가 바닥으로 */}
            <Sprite name="memo" x={110} y={62} className="px-fall" />
            <Sprite name="chairOrange" x={108} y={44} style={{ transform: 'rotate(-14deg)' }} />
            {/* 경보: 화면 전체가 빨갛게 깜빡인다 */}
            <div className="px-alarm" style={{ position: 'absolute', inset: 0, background: '#EF4444', mixBlendMode: 'multiply' }} />
          </Room>
        )}

        {kind === 'night' && (
          <Room night>
            <Sprite name="window" x={30} y={4} style={{ filter: 'brightness(0.45) saturate(0.6)' }} />
            <div style={{ position: 'absolute', left: 36, top: 8, width: 4, height: 4, borderRadius: 4, background: '#FDE68A' }} />
            <Bubble x={66} y={4}>23:47</Bubble>
            <Sprite name="plant" x={6} y={wallY('plant')} style={{ filter: 'brightness(0.55)' }} />
            {/* 모니터 불빛 */}
            <div style={{ position: 'absolute', left: DESK_X + 2, top: DESK_Y - 4, width: 76, height: 36, background: 'radial-gradient(closest-side, #7DD3FC55, transparent)' }} />
            <Desk bob="px-bob-slow" />
            <div className="px-sweat" style={{ position: 'absolute', left: HEAD.x + 10, top: HEAD.y, width: 2, height: 3, borderRadius: '1px 1px 2px 2px', background: '#7DD3FC' }} />
          </Room>
        )}

        {kind === 'meeting' && (
          <Room>
            <Sprite name="windowNote" x={51} y={4} />
            <Sprite name="calendar" x={14} y={10} />
            <Sprite name="plant" x={110} y={wallY('plant')} />
            {/* 테이블 뒤에 선 두 사람 (테이블이 다리를 가린다) */}
            <Sprite name="ponytail" x={40} y={30} className="px-bob" />
            <Sprite name="capGuy" x={74} y={31} flip className="px-bob-alt" />
            <Sprite name="tableLong" x={44} y={48} />
            <Sprite name="mug" x={48} y={onTable(48, 'mug')} />
            <Sprite name="fax" x={72} y={onTable(48, 'fax')} />
            <Bubble x={24} y={22}>
              <span className="px-dots">...</span>
            </Bubble>
            <Bubble x={92} y={23}>?</Bubble>
          </Room>
        )}

        {kind === 'office' && (
          <Room>
            <Sprite name="window" x={8} y={4} />
            <Sprite name="door" x={56} y={wallY('door')} />
            <Sprite name="clock" x={55} y={0} />
            <Sprite name="plant" x={38} y={wallY('plant')} />
            <Sprite name="plant" x={76} y={wallY('plant')} />
            <Sprite name="vending" x={100} y={wallY('vending')} />
            {/* 걸어 들어오는 사람 */}
            <div className="px-walk" style={{ position: 'absolute', left: 0, top: 44 }}>
              <Sprite name="redHair" x={0} y={0} className="px-step" />
            </div>
          </Room>
        )}

        {kind === 'break' && (
          <Room>
            <Sprite name="landscape" x={44} y={12} />
            <Sprite name="windowNote" x={78} y={4} />
            {/* 벽에 붙은 테이블 위에 커피머신과 머그컵 */}
            <Sprite name="tableSmall" x={4} y={wallY('tableSmall')} />
            <Sprite name="mug" x={8} y={onTable(wallY('tableSmall'), 'mug')} />
            <Sprite name="coffeeMachine" x={20} y={onTable(wallY('tableSmall'), 'coffeeMachine')} />
            <Sprite name="waterCooler" x={34} y={wallY('waterCooler')} />
            <Sprite name="sofaOrange" x={86} y={wallY('sofaOrange')} />
            <Sprite name="darkHair" x={44} y={36} className="px-bob-slow" />
            <Bubble x={58} y={30}>~♪</Bubble>
            <div className="px-cat" style={{ position: 'absolute', left: 0, top: 57 }}>
              <Sprite name="cat" x={0} y={0} />
            </div>
          </Room>
        )}
      </div>
    </div>
  )
}
