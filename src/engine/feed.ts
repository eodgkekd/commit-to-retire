// 연말 커뮤니티 반응 피드 생성

import { companyTypes, feedTemplates, rankById } from '../data'
import { createRng, type Rng } from './rng'
import { formatSalary } from './rules'
import { fillTemplate } from './text'
import type { FeedPlatform, FeedPost, FeedTemplate, FeedTrigger, GameState, Grade } from './types'

const POSTS_PER_YEAR = 3

// ─── 작성자 ────────────────────────────────────────────

const FORUM_NICKS = [
  '야근요정', '판교불나방', '커밋장인', '레거시수호자', '퇴사각재는중', '주니어3년차', '스택오버플로우중독',
  '머지충돌', '배포는금요일에', '코드리뷰어', '연봉협상중', '물경력탈출', '세미콜론실종', '칼퇴기원',
  '사이드플젝장인', '눈팅10년차', '기본서3회독', '널포인터',
]

const BLINDER_NICKS = [
  '퇴사각', '이직각재는중', '월급루팡', '점심뭐먹지', '익명의개발자', '주말출근러', '회의중독', '연차소진중',
  '성과급기원', '재택원해요', '칼퇴요정', '눈치게임중',
]

const LINKEDOUT_NAMES = [
  'Jay Kim | 성장하는 개발자', 'Daniel Park · Tech Lead', 'Sophie Lee 🚀 Growth Mindset',
  '이준호 | Passionate Engineer', 'Chris Choi · Ex-빅테크', '박서연 | 매일 1% 성장',
  'Kevin Jung · Open to Work', '김민지 | AI · 리더십', 'Brian Han · 10x Engineer',
  '정하늘 | Keynote Speaker',
]

const GITHUB_IDS = [
  'null-pointer-kim', 'yageun-dev', 'refactor-later', 'hotfix-only', 'lgtm-machine', 'segfault42',
  'copypasta-dev', 'stackoverflower', 'sleepless-coder', 'works-on-my-machine', 'todo-collector',
  'rebase-hell',
]

/** "구글리 코리아" → "구글리", "네모버 (인수됨)" → "네모버", "(주)솔루션원" → "솔루션원" */
function companyTag(name: string): string {
  return name.replace(/^\(주\)\s*/, '').replace(/\s*\(.*\)\s*$/, '').split(' ')[0]
}

/**
 * 플랫폼별 작성자 이름 후보.
 * 블라인더는 "회사 · 닉네임" 꼴이다. 우리 회사 이야기를 하는 글({company}가 들어간 글)은
 * 우리 회사 사람이, 나머지는 다른 회사 사람이 쓴다.
 */
function authorPool(platform: FeedPlatform, s: GameState, rawText: string, r: Rng): string[] {
  switch (platform) {
    case 'blinder': {
      const own = companyTag(s.company.name)
      const others = companyTypes.flatMap((t) => t.names).map(companyTag).filter((n) => n !== own)
      const tag = rawText.includes('{company}') ? own : r.pick(others)
      return BLINDER_NICKS.map((nick) => `${tag} · ${nick}`)
    }
    case 'linkedout':
      return LINKEDOUT_NAMES
    case 'github':
      return GITHUB_IDS
    case 'okko':
    case 'jobplanet':
      return FORUM_NICKS
  }
}

// ─── 생성 ──────────────────────────────────────────────

/**
 * 올해의 커뮤니티 반응 (최대 3개).
 * 넘겨받은 rng에서는 값을 하나만 꺼내 피드 전용 RNG의 시드로 쓴다.
 * 그래서 템플릿·작성자를 늘리거나 고쳐도 게임 진행(이벤트·고과 등)의 난수 흐름은 달라지지 않는다.
 */
export function generateFeed(
  state: GameState,
  grade: Grade,
  triggers: FeedTrigger[],
  rng: Rng,
): FeedPost[] {
  const r = createRng(Math.floor(rng.next() * 4294967296))
  const matching = feedTemplates.filter((t) => matches(t, state, grade, triggers))
  // 조건이 구체적인 템플릿일수록 우선 (올해 일어난 일에 반응하도록)
  const weight = (t: FeedTemplate) => 1 + Object.keys(t.conditions ?? {}).length * 2

  // 올해 사건이 있었다면 그 사건에 반응하는 글을 하나는 꼭 넣는다
  const chosen: FeedTemplate[] = []
  const reacting = r.weighted(matching.filter((t) => t.conditions?.triggers), weight)
  if (reacting) chosen.push(reacting)

  while (chosen.length < POSTS_PER_YEAR) {
    const template = r.weighted(matching.filter((t) => !chosen.includes(t)), weight)
    if (!template) break
    chosen.push(template)
  }

  const usedAuthors = new Set<string>()
  return chosen.map((template) => {
    const rawText = r.pick(template.texts)
    const pool = authorPool(template.platform, state, rawText, r).filter((a) => !usedAuthors.has(a))
    const author = pool.length > 0 ? r.pick(pool) : '익명'
    usedAuthors.add(author)
    return {
      platform: template.platform,
      author,
      text: fillText(rawText, state),
      likes: r.int(3, 300),
    }
  })
}

function matches(t: FeedTemplate, s: GameState, grade: Grade, triggers: FeedTrigger[]): boolean {
  const c = t.conditions
  if (!c) return true
  if (c.grades && !c.grades.includes(grade)) return false
  if (c.companyTypes && !c.companyTypes.includes(s.company.type)) return false
  if (c.industries && !c.industries.includes(s.company.industry)) return false
  if (c.ranks && !c.ranks.includes(s.rank)) return false
  if (c.focus && (!s.focus || !c.focus.includes(s.focus))) return false
  if (c.triggers && !c.triggers.some((tr) => triggers.includes(tr))) return false
  // 피드는 올해 기록을 history에 넣기 전에 만들어지므로 마지막 기록이 작년이다
  if (c.afterGapYear && !s.history.at(-1)?.gap) return false
  return true
}

/** 치환어를 채우고 뒤따르는 조사를 받침에 맞춘다 */
export function fillText(text: string, s: GameState): string {
  return fillTemplate(text, {
    name: s.profile.name,
    company: s.company.name,
    salary: formatSalary(s.salary),
    rank: s.startup ? '대표' : rankById[s.rank].label,
  })
}

export { applyParticles } from './text'
