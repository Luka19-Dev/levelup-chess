// Progress lives in this browser only. Every access is guarded: private windows
// and blocked storage must never break the game, they just forget.
import { DEFAULT_FILTER } from './bank'
import type { Filter } from './bank'
import type { Lang } from './i18n'
import { MINUTES } from './challenge'
import type { Challenge } from './challenge'
import { BOARDS, DEFAULT_BOARD, DEFAULT_SET, PIECE_SETS } from '../pieces/catalog'
import { DIFFICULTY } from './bank'

const KEY = 'kai-chess:v1'
/** bumped when the lesson boards change, so old per-level stars do not land on new boards */
const LESSONS_VERSION = 2
/** the tactics stages kept their puzzles across that change, so their stars survive */
const TACTICS = ['mate1p', 'free', 'backrank', 'fork', 'promote', 'pin', 'discover', 'mate2']

export type Saved = {
  /** stage key -> best stars per level (0 = not solved yet) */
  learn: Record<string, number[]>
  lessonsVersion: number
  /** a piece set id from catalog.ts */
  set: string
  /** a board colour id from catalog.ts */
  board: string
  sound: boolean
  /** best time-challenge score per difficulty and length, keyed like "1-5" */
  challengeBests: Record<string, number>
  /** the last difficulty and length chosen */
  challenge: Challenge
  /** the last puzzle filters, so a returning player lands where they left off */
  puzzles: Filter
  lang: Lang
  /** light or dark when chosen in the header; absent means follow the system */
  theme?: 'light' | 'dark'
}

const EMPTY: Saved = { learn: {}, lessonsVersion: LESSONS_VERSION, set: DEFAULT_SET, board: DEFAULT_BOARD, sound: true, challengeBests: {}, challenge: { level: 0, minutes: 2 }, puzzles: DEFAULT_FILTER, lang: 'ka' }

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    // fields from earlier drafts (stars per old level, unlockAll) are dropped here
    const s = { ...EMPTY, lessonsVersion: 1, ...JSON.parse(raw) } as Saved
    const learn = s.lessonsVersion === LESSONS_VERSION ? s.learn : Object.fromEntries(Object.entries(s.learn).filter(([k]) => TACTICS.includes(k)))
    return {
      learn,
      lessonsVersion: LESSONS_VERSION,
      set: PIECE_SETS.some((p) => p.id === s.set) ? s.set : DEFAULT_SET,
      board: BOARDS.some((b) => b.id === s.board) ? s.board : DEFAULT_BOARD,
      sound: s.sound,
      // the old single speed-round record drew from a different pool, so it is not carried over
      challengeBests: s.challengeBests ?? {},
      challenge:
        s.challenge && Number.isInteger(s.challenge.level) && s.challenge.level >= 0 && s.challenge.level < DIFFICULTY.length && MINUTES.includes(s.challenge.minutes)
          ? s.challenge
          : EMPTY.challenge,
      puzzles: { ...DEFAULT_FILTER, ...s.puzzles, theme: undefined },
      lang: s.lang === 'en' ? 'en' : 'ka',
      theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : undefined,
    }
  } catch {
    return EMPTY
  }
}

export function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* forgotten, not broken */
  }
}
