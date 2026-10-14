// Class battle: players take turns on one device, each solving the same number of puzzles.
// The lobby and a game in progress are kept in this browser, so a reload mid-lesson loses nothing.
import { DEFAULT_FILTER } from './bank'
import type { Filter } from './bank'
import type { Puzzle } from '../components/PuzzleRunner'
import { lang } from './i18n'

export const MAX_PLAYERS = 30
export const MAX_PER = 20
/** wrong moves after which the Solution button appears */
export const SOLUTION_AFTER = 3

export type Lobby = { players: string[]; per: number; filter: Filter }

export type Game = Lobby & {
  /** each player's own puzzles, all from the same filter */
  puzzles: Puzzle[][]
  /** points per player per puzzle, filled in as they are played */
  scores: number[][]
  turn: number
  at: number
  /** handoff: the "now playing" screen before a player's turn */
  phase: 'handoff' | 'play' | 'done'
  /** wrong moves and hints on the current puzzle so far, kept so a reload cannot wipe them */
  slips?: { mistakes: number; hints: number }
}

type Stored = { lobby: Lobby; game: Game | null }

const KEY = 'kai-chess:battle'
const EMPTY: Stored = { lobby: { players: [], per: 5, filter: DEFAULT_FILTER }, game: null }

export function loadBattle(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function saveBattle(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* forgotten, not broken */
  }
}

/**
 * Points for one puzzle (Luka's rules): up to one wrong move costs nothing, two give 0.5,
 * three or more give 0; any hint caps it at 0.2; a revealed solution gives 0.
 */
export function points(r: { mistakes: number; hints: number; revealed?: boolean }): number {
  if (r.revealed) return 0
  const byMistakes = r.mistakes <= 1 ? 1 : r.mistakes === 2 ? 0.5 : 0
  return r.hints > 0 ? Math.min(byMistakes, 0.2) : byMistakes
}

export const total = (scores: number[]) => scores.reduce((a, b) => a + b, 0)

/** A score with at most one decimal; Georgian writes the decimal with a comma. */
export function fmtScore(n: number): string {
  const s = String(Math.round(n * 10) / 10)
  return lang() === 'ka' ? s.replace('.', ',') : s
}

/**
 * Players best first; equal totals share a place (1, 1, 3). Players who never played are left out.
 * `upTo`: only the first players, e.g. those whose turn is over.
 */
export function standings(g: Game, upTo = g.players.length): { name: string; score: number; place: number; i: number }[] {
  const rows = g.players
    .map((name, i) => ({ name, score: total(g.scores[i]), played: g.scores[i].length, i }))
    .filter((r) => r.played > 0 && r.i < upTo)
    .sort((a, b) => b.score - a.score || a.i - b.i)
  return rows.map((r) => ({ name: r.name, score: r.score, i: r.i, place: 1 + rows.filter((o) => o.score > r.score + 1e-9).length }))
}
