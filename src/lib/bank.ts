// The puzzle bank behind the puzzles page: one JSON file per 100 rating points in
// /puzzles/, plus index.json with counts, all built by scripts/build-puzzle-bank.mjs.
import type { PieceType } from '../pieces/sets'
import type { Puzzle } from '../components/PuzzleRunner'
import type { Txt } from './i18n'

/** id, fen, moves, rating, side to play, stage (0 opening, 1 middlegame, 2 endgame), winning piece, theme indexes */
type Row = [string, string, string, number, 'w' | 'b', 0 | 1 | 2, PieceType, number[]]
type Index = { themes: string[]; bands: Record<string, { total: number; combos: Record<string, number>; themes: Record<string, number> }> }

export type Filter = {
  /** rating range, in steps of 100: puzzles rated min .. max-1 */
  min: number
  max: number
  side: 'any' | 'w' | 'b'
  stage: 'any' | '0' | '1' | '2'
  piece: 'any' | PieceType
  /** a theme ignores side, stage and piece, but keeps the rating range */
  theme?: string
}

export const RATING_MIN = 400
export const RATING_MAX = 2000
export const DEFAULT_FILTER: Filter = { min: 600, max: 1100, side: 'any', stage: 'any', piece: 'any' }

let index: Promise<Index> | null = null
const bandFiles = new Map<number, Promise<Row[]>>()

export function loadIndex(): Promise<Index> {
  index ??= fetch('/puzzles/index.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`index ${r.status}`))))
    .catch((e) => {
      index = null // a failed load is retried next time, not remembered
      throw e
    })
  return index
}

function loadBand(b: number): Promise<Row[]> {
  if (!bandFiles.has(b))
    bandFiles.set(
      b,
      fetch(`/puzzles/${b}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`band ${b} ${r.status}`))))
        .catch((e) => {
          bandFiles.delete(b) // retried next time
          throw e
        }),
    )
  return bandFiles.get(b)!
}

function bandsIn(f: Filter): number[] {
  const out: number[] = []
  for (let b = f.min; b < f.max; b += 100) out.push(b)
  return out
}

const matchesCombo = (key: string, f: Filter) =>
  (f.side === 'any' || key[0] === f.side) && (f.stage === 'any' || key[1] === f.stage) && (f.piece === 'any' || key[2] === f.piece)

/** How many puzzles a filter would give, from the index alone. */
export function count(idx: Index, f: Filter): number {
  let n = 0
  for (const b of bandsIn(f)) {
    const info = idx.bands[b]
    if (!info) continue
    if (f.theme) n += info.themes[f.theme] ?? 0
    else for (const [key, c] of Object.entries(info.combos)) if (matchesCombo(key, f)) n += c
  }
  return n
}

/** The puzzles a filter selects, shuffled. */
export async function select(f: Filter): Promise<Puzzle[]> {
  const idx = await loadIndex()
  const themeIndex = f.theme ? idx.themes.indexOf(f.theme) : -1
  const rows = (await Promise.all(bandsIn(f).map(loadBand))).flat()
  const picked = rows.filter((r) => (f.theme ? r[7].includes(themeIndex) : matchesCombo(`${r[4]}${r[5]}${r[6]}`, f)))
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked.map((r) => ({ id: r[0], fen: r[1], moves: r[2].split(' '), rating: r[3] }))
}

/** Filters travel in the link, so a teacher can send a set to the class. */
export function toQuery(f: Filter): string {
  const p = new URLSearchParams({ min: String(f.min), max: String(f.max) })
  if (f.theme) p.set('theme', f.theme)
  else {
    if (f.side !== 'any') p.set('side', f.side)
    if (f.stage !== 'any') p.set('stage', f.stage)
    if (f.piece !== 'any') p.set('piece', f.piece)
  }
  return p.toString()
}

export function fromQuery(query: string, fallback: Filter): Filter {
  const p = new URLSearchParams(query)
  const num = (k: string, d: number) => {
    const v = Number(p.get(k))
    return Number.isFinite(v) && v >= RATING_MIN && v <= RATING_MAX && v % 100 === 0 ? v : d
  }
  const min = num('min', fallback.min)
  const max = Math.max(num('max', fallback.max), min + 100)
  const pick = <T extends string>(k: string, allowed: readonly T[], d: T): T => (allowed.includes(p.get(k) as T) ? (p.get(k) as T) : d)
  return {
    min,
    max,
    side: pick('side', ['any', 'w', 'b'], query ? 'any' : fallback.side),
    stage: pick('stage', ['any', '0', '1', '2'], query ? 'any' : fallback.stage),
    piece: pick('piece', ['any', 'p', 'n', 'b', 'r', 'q', 'k'], query ? 'any' : fallback.piece),
    theme: p.get('theme') ?? undefined,
  }
}

/** Where easy, medium and hard begin on the rating scale: a reading aid, not a level. */
export const DIFFICULTY: { from: number; name: Txt }[] = [
  { from: RATING_MIN, name: { ka: 'ადვილი', en: 'Easy' } },
  { from: 1000, name: { ka: 'საშუალო', en: 'Medium' } },
  { from: 1500, name: { ka: 'რთული', en: 'Hard' } },
]

/** A plain-language reading of a rating range, from its midpoint. */
export function difficulty(f: Filter): Txt {
  const mid = (f.min + f.max) / 2
  return [...DIFFICULTY].reverse().find((d) => mid >= d.from)!.name
}

export const THEME_NAMES: Record<string, Txt> = {
  mateIn1: { ka: 'მატი ერთ სვლაში', en: 'Mate in one' },
  mateIn2: { ka: 'მატი ორ სვლაში', en: 'Mate in two' },
  mateIn3: { ka: 'მატი სამ სვლაში', en: 'Mate in three' },
  fork: { ka: 'ჩანგალი', en: 'Fork' },
  pin: { ka: 'ბმა', en: 'Pin' },
  skewer: { ka: 'შამფური', en: 'Skewer' },
  discoveredAttack: { ka: 'გახსნილი მუქარა', en: 'Discovered attack' },
  doubleCheck: { ka: 'ორმაგი ქიში', en: 'Double check' },
  hangingPiece: { ka: 'უფასო ფიგურა', en: 'Free piece' },
  trappedPiece: { ka: 'ჩაკეტილი ფიგურა', en: 'Trapped piece' },
  backRankMate: { ka: 'მატი ბოლო ხაზზე', en: 'Back-rank mate' },
  smotheredMate: { ka: 'დახშული მატი', en: 'Smothered mate' },
  promotion: { ka: 'პაიკის გადაქცევა', en: 'Promotion' },
  sacrifice: { ka: 'გაწირვა', en: 'Sacrifice' },
  deflection: { ka: 'განზიდვა', en: 'Deflection' },
  capturingDefender: { ka: 'დამცველის აყვანა', en: 'Remove the defender' },
}
