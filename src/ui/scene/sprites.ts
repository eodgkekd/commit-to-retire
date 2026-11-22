// 2dPig "Pixel Office Asset Pack" (CC0) 그림 목록.
// 원본: https://2dpig.itch.io/pixel-office — src/assets/pixel-office/LICENSE.txt
//
// 이름과 "어디에 놓이는지"는 팩의 예시 장면(PixelOffice.aseprite)에서 실제로 쓰인 방식을 보고 정했다.
// - floor: 바닥에 선다. 벽에 붙여 둘 때는 아랫변이 벽과 바닥 경계보다 조금 아래(바닥 쪽)에 오게 한다
// - wall: 벽에 건다. 바닥에 닿으면 안 된다
// - onTable: 책상 상판(노란 사각형)이나 주황 테이블 위에 올린다. 아랫변이 상판 안쪽에 들어와야 한다 (허공 금지)
// - onPartition: 칸막이(회색 긴 판) 앞면에 붙인다

import sheetUrl from '../../assets/pixel-office/PixelOfficeAssets.png'
import objectsUrl from '../../assets/pixel-office/PixelOfficeObjects.png'

export const SHEET_URL = sheetUrl
export const SHEET_SIZE = { w: 256, h: 160 }

export type Placement = 'floor' | 'wall' | 'onTable' | 'onPartition' | 'person'

export interface SpriteRect {
  x: number
  y: number
  w: number
  h: number
}

export interface SpriteDef extends SpriteRect {
  /** 무엇인지 */
  label: string
  placement: Placement
}

export const SPRITES = {
  // ─── 사람 (모두 정면으로 서 있는 그림) ───
  capGuy: { x: 2, y: 105, w: 15, h: 23, label: '짧은 검은 머리 남자', placement: 'person' },
  ponytail: { x: 19, y: 104, w: 19, h: 24, label: '빨간 포니테일', placement: 'person' },
  glasses: { x: 40, y: 107, w: 13, h: 21, label: '회색 머리 안경 남자', placement: 'person' },
  redHair: { x: 3, y: 132, w: 17, h: 23, label: '빨간 단발 여자', placement: 'person' },
  darkHair: { x: 22, y: 132, w: 17, h: 23, label: '검은 머리 여자', placement: 'person' },
  cat: { x: 65, y: 129, w: 16, h: 13, label: '검은 고양이', placement: 'floor' },
  dog: { x: 59, y: 146, w: 24, h: 11, label: '엎드린 강아지', placement: 'floor' },

  // ─── 바닥에 서는 가구 ───
  chairOrange: { x: 6, y: 41, w: 11, h: 22, label: '의자(주황)', placement: 'floor' },
  chairYellow: { x: 19, y: 41, w: 11, h: 22, label: '의자(노랑)', placement: 'floor' },
  chairGreen: { x: 32, y: 41, w: 11, h: 22, label: '의자(초록)', placement: 'floor' },
  chairBlue: { x: 45, y: 41, w: 11, h: 22, label: '의자(파랑)', placement: 'floor' },
  chairWhite: { x: 58, y: 41, w: 11, h: 22, label: '의자(흰색)', placement: 'floor' },
  chairGray: { x: 71, y: 41, w: 11, h: 22, label: '의자(회색)', placement: 'floor' },
  tableSmall: { x: 85, y: 47, w: 26, h: 16, label: '주황 테이블(작은)', placement: 'floor' },
  tableLong: { x: 115, y: 47, w: 40, h: 16, label: '주황 테이블(긴)', placement: 'floor' },
  partition: { x: 171, y: 44, w: 79, h: 17, label: '칸막이 (책상 뒤 낮은 벽, 책상 아님)', placement: 'floor' },
  deskTop: { x: 188, y: 63, w: 17, h: 19, label: '책상 상판(노랑)', placement: 'floor' },
  deskTop2: { x: 213, y: 63, w: 17, h: 19, label: '책상 상판(노랑)', placement: 'floor' },
  partitionSide: { x: 207, y: 63, w: 4, h: 27, label: '칸막이 옆판', placement: 'floor' },
  sofaGray: { x: 119, y: 66, w: 33, h: 15, label: '소파(회색)', placement: 'floor' },
  sofaBlue: { x: 120, y: 83, w: 33, h: 16, label: '소파(파랑)', placement: 'floor' },
  sofaGreen: { x: 120, y: 102, w: 33, h: 16, label: '소파(초록)', placement: 'floor' },
  sofaOrange: { x: 120, y: 121, w: 33, h: 16, label: '소파(주황)', placement: 'floor' },
  plant: { x: 170, y: 65, w: 14, h: 19, label: '화분', placement: 'floor' },
  door: { x: 98, y: 120, w: 16, h: 31, label: '유리문', placement: 'floor' },
  vending: { x: 159, y: 123, w: 24, h: 34, label: '과자 자판기', placement: 'floor' },
  drinkFridge: { x: 184, y: 126, w: 24, h: 31, label: '음료 냉장고', placement: 'floor' },
  waterCooler: { x: 147, y: 140, w: 9, h: 17, label: '정수기', placement: 'floor' },
  trashGreen: { x: 116, y: 143, w: 9, h: 14, label: '쓰레기통(초록)', placement: 'floor' },
  trashRed: { x: 126, y: 143, w: 9, h: 14, label: '쓰레기통(빨강)', placement: 'floor' },
  trashBlue: { x: 136, y: 143, w: 9, h: 14, label: '쓰레기통(파랑)', placement: 'floor' },

  // ─── 벽에 거는 것 ───
  window: { x: 59, y: 96, w: 26, h: 21, label: '창문', placement: 'wall' },
  windowNote: { x: 88, y: 96, w: 26, h: 21, label: '메모 붙은 창문', placement: 'wall' },
  clock: { x: 159, y: 108, w: 19, h: 6, label: '디지털 시계 12:00', placement: 'wall' },
  calendar: { x: 234, y: 81, w: 17, h: 11, label: '달력', placement: 'wall' },
  landscape: { x: 239, y: 94, w: 11, h: 8, label: '풍경 액자', placement: 'wall' },

  // ─── 칸막이에 붙이는 것 ───
  flagIndia: { x: 179, y: 94, w: 12, h: 9, label: '국기(인도)', placement: 'onPartition' },
  flagUK: { x: 193, y: 94, w: 12, h: 9, label: '국기(영국)', placement: 'onPartition' },
  flagUSA: { x: 207, y: 94, w: 12, h: 9, label: '국기(미국)', placement: 'onPartition' },
  photoBlue: { x: 222, y: 94, w: 6, h: 8, label: '작은 사진(파랑)', placement: 'onPartition' },
  photoSunset: { x: 230, y: 94, w: 6, h: 8, label: '작은 사진(노을)', placement: 'onPartition' },
  memo: { x: 183, y: 107, w: 6, h: 8, label: '메모지', placement: 'onPartition' },
  memo2: { x: 192, y: 107, w: 6, h: 9, label: '메모지', placement: 'onPartition' },

  // ─── 책상·테이블 위에 올리는 것 ───
  computerSet: { x: 233, y: 106, w: 15, h: 19, label: '컴퓨터(모니터+키보드)', placement: 'onTable' },
  monitorThin: { x: 240, y: 128, w: 6, h: 19, label: '얇은 모니터(옆모습)', placement: 'onTable' },
  keyboard: { x: 233, y: 135, w: 5, h: 12, label: '키보드(옆모습)', placement: 'onTable' },
  retroRed: { x: 211, y: 119, w: 11, h: 8, label: '레트로 컴퓨터(빨강)', placement: 'onTable' },
  retroBlue: { x: 211, y: 129, w: 11, h: 8, label: '레트로 컴퓨터(파랑)', placement: 'onTable' },
  retroGreen: { x: 211, y: 140, w: 11, h: 8, label: '레트로 컴퓨터(초록)', placement: 'onTable' },
  coffeeMachine: { x: 159, y: 91, w: 7, h: 11, label: '커피머신', placement: 'onTable' },
  mug: { x: 169, y: 95, w: 8, h: 7, label: '머그컵', placement: 'onTable' },
  fax: { x: 200, y: 107, w: 9, h: 9, label: '팩스·프린터', placement: 'onTable' },
} satisfies Record<string, SpriteDef>

export type SpriteName = keyof typeof SPRITES

/**
 * 팩 예시 장면의 '사무실 소품' 레이어만 투명 배경으로 뽑은 그림 (256×224).
 * 의자에 앉은 사람은 에셋 시트에 없고 이 장면에만 그려져 있어서 여기서 잘라 쓴다
 */
export const OBJECTS_URL = objectsUrl
export const OBJECTS_SIZE = { w: 256, h: 224 }

export const OBJECT_CROPS = {
  /** 칸막이 + 노란 책상 두 칸. 왼쪽 책상에는 흰 의자에 옆으로 앉아 일하는 안경 남자, 오른쪽 책상에는 컴퓨터 */
  seatedCubicle: { x: 33, y: 162, w: 76, h: 30 },
  /** 위 자리에서 앉은 사람의 상체 (타자 치는 움직임용) */
  seatedUpper: { x: 42, y: 166, w: 14, h: 13 },
} satisfies Record<string, SpriteRect>

export type ObjectCropName = keyof typeof OBJECT_CROPS
