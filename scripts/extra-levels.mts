// Builds the "Extra" star levels for the six piece stages: 50 a piece, our own boards in the
// style of lichess's (white pieces, stars to collect, nothing else on the board).
// Each level's target is the fewest moves found by a breadth-first search, and its solution
// is then played through the real lesson engine (src/lib/lesson.ts) to prove it wins.
// Seeded, so a re-run writes the same file. ★ Stars are saved BY POSITION: once a set is
// live, never re-run this over it with other settings; only ever append.
// usage: npx tsx scripts/extra-levels.mts
import { writeFileSync } from 'node:fs'
import { play, start } from '../src/lib/lesson'
import type { LevelDef, State } from '../src/lib/lesson'

const PER_PIECE = 50
const MAX_MOVES = 14

let seed = 20261020
function rand(): number {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)]
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))

// squares are 0..63: file + 8 * rank (rank 0 = row 1)
const name = (s: number) => String.fromCharCode(97 + (s % 8)) + (Math.floor(s / 8) + 1)
const fileOf = (s: number) => s % 8
const rankOf = (s: number) => Math.floor(s / 8)
const light = (s: number) => (fileOf(s) + rankOf(s)) % 2 === 1

type Piece = { t: string; s: number }
type Node = { pieces: Piece[]; apples: number[] }
type Step = { from: number; to: number; promo?: string }

const LINES: Record<string, [number, number][]> = {
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
}
LINES.q = [...LINES.r, ...LINES.b]
const JUMPS: Record<string, [number, number][]> = {
  n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]],
  k: [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]],
}
const at = (f: number, r: number) => (f < 0 || f > 7 || r < 0 || r > 7 ? -1 : f + 8 * r)

/** A star is a black pawn: it attacks the two squares diagonally below it. */
const attackedBy = (apples: number[], sq: number) => apples.some((a) => rankOf(a) - 1 === rankOf(sq) && Math.abs(fileOf(a) - fileOf(sq)) === 1)

function moves(node: Node): Step[] {
  const own = new Set(node.pieces.map((p) => p.s))
  const star = new Set(node.apples)
  const out: Step[] = []
  for (const p of node.pieces) {
    const [f, r] = [fileOf(p.s), rankOf(p.s)]
    if (LINES[p.t])
      for (const [df, dr] of LINES[p.t])
        for (let i = 1; ; i++) {
          const to = at(f + df * i, r + dr * i)
          if (to < 0 || own.has(to)) break
          out.push({ from: p.s, to })
          if (star.has(to)) break
        }
    else if (p.t === 'n') {
      for (const [df, dr] of JUMPS.n) {
        const to = at(f + df, r + dr)
        if (to >= 0 && !own.has(to)) out.push({ from: p.s, to })
      }
    } else if (p.t === 'k') {
      for (const [df, dr] of JUMPS.k) {
        const to = at(f + df, r + dr)
        if (to < 0 || own.has(to)) continue
        if (attackedBy(node.apples.filter((a) => a !== to), to)) continue
        out.push({ from: p.s, to })
      }
    } else if (p.t === 'p') {
      const add = (to: number) => {
        if (rankOf(to) === 7) for (const promo of ['q', 'n']) out.push({ from: p.s, to, promo })
        else out.push({ from: p.s, to })
      }
      const one = at(f, r + 1)
      if (one >= 0 && !own.has(one) && !star.has(one)) {
        add(one)
        const two = at(f, r + 2)
        if (r === 1 && !own.has(two) && !star.has(two)) add(two)
      }
      for (const df of [-1, 1]) {
        const to = at(f + df, r + 1)
        if (to >= 0 && star.has(to)) add(to)
      }
    }
  }
  return out
}

function apply(node: Node, m: Step): Node {
  return {
    pieces: node.pieces.map((p) => (p.s === m.from ? { t: m.promo ?? p.t, s: m.to } : p)),
    apples: node.apples.filter((a) => a !== m.to),
  }
}

const keyOf = (n: Node) => n.pieces.map((p) => p.t + p.s).sort().join() + '|' + n.apples.join()

// a search state packed into one number: which stars are left (10 bits), then each piece as
// type * 64 + square (9 bits), sorted so two identical pieces swapped count as one state
const TYPES = 'rbqnkp'
function pack(n: Node, all: number[]): number {
  let mask = 0
  for (const a of n.apples) mask |= 1 << all.indexOf(a)
  const codes = n.pieces.map((p) => TYPES.indexOf(p.t) * 64 + p.s).sort((a, b) => a - b)
  let key = 0
  for (const c of codes) key = key * 512 + c
  return key * 1024 + mask
}
function unpack(key: number, count: number, all: number[]): Node {
  const mask = key % 1024
  let rest = Math.floor(key / 1024)
  const pieces: Piece[] = []
  for (let i = 0; i < count; i++) {
    const c = rest % 512
    rest = Math.floor(rest / 512)
    pieces.push({ t: TYPES[Math.floor(c / 64)], s: c % 64 })
  }
  return { pieces, apples: all.filter((_, i) => mask & (1 << i)) }
}

/** Fewest moves to take every star, with one shortest solution, or null. */
function solve(first: Node): { fewest: number; path: Step[] } | null {
  const all = first.apples
  const count = first.pieces.length
  const start0 = pack(first, all)
  // how each state was first reached: the state before it and the move
  const from = new Map<number, number>([[start0, -1]])
  const via = new Map<number, Step>()
  let frontier = [start0]
  for (let depth = 1; depth <= MAX_MOVES; depth++) {
    const next: number[] = []
    for (const key of frontier) {
      const node = unpack(key, count, all)
      for (const m of moves(node)) {
        const n = apply(node, m)
        const k = pack(n, all)
        if (from.has(k)) continue
        from.set(k, key)
        via.set(k, m)
        if (!n.apples.length) {
          const path: Step[] = []
          for (let at = k; at !== start0; at = from.get(at)!) path.unshift(via.get(at)!)
          return { fewest: depth, path }
        }
        next.push(k)
      }
    }
    frontier = next
    if (from.size > 200000) return null
  }
  return null
}

function fen(pieces: Piece[]): string {
  const rows: string[] = []
  for (let r = 7; r >= 0; r--) {
    let row = ''
    let gap = 0
    for (let f = 0; f < 8; f++) {
      const p = pieces.find((x) => x.s === at(f, r))
      if (!p) gap++
      else {
        row += (gap || '') + p.t.toUpperCase()
        gap = 0
      }
    }
    rows.push(row + (gap || ''))
  }
  return rows.join('/') + ' w - - 0 1'
}

/** The shape of level i (0-based) of a piece: its pieces and how many stars. */
function design(piece: string, i: number): { pieces: Piece[]; stars: number; goal?: string } | null {
  const free = new Set<number>()
  const take = (ok: (s: number) => boolean) => {
    const s = pick(Array.from({ length: 64 }, (_, k) => k).filter((k) => !free.has(k) && ok(k)))
    free.add(s)
    return s
  }
  const u = i / (PER_PIECE - 1)
  const any = (s: number) => rankOf(s) > 0
  switch (piece) {
    case 'r':
      if (i < 25) return { pieces: [{ t: 'r', s: take(() => true) }], stars: between(2 + Math.round(u * 6), 3 + Math.round(u * 8)) }
      return { pieces: [{ t: 'r', s: take(() => true) }, { t: 'r', s: take(() => true) }], stars: between(4, 6), goal: 'useTwoRooks' }
    case 'b': {
      if (i < 25) return { pieces: [{ t: 'b', s: take(() => true) }], stars: between(2 + Math.round(u * 6), 3 + Math.round(u * 8)) }
      const a = take(() => true)
      return { pieces: [{ t: 'b', s: a }, { t: 'b', s: take((s) => light(s) !== light(a)) }], stars: between(4, 7), goal: 'youNeedBothBishops' }
    }
    case 'q':
      return { pieces: [{ t: 'q', s: take(() => true) }], stars: between(2 + Math.round(u * 5), 3 + Math.round(u * 7)) }
    case 'n':
      return { pieces: [{ t: 'n', s: take(() => true) }], stars: between(2 + Math.round(u * 4), 3 + Math.round(u * 6)) }
    case 'k':
      return { pieces: [{ t: 'k', s: take(any) }], stars: between(2 + Math.round(u * 4), 3 + Math.round(u * 5)) }
    case 'p': {
      const count = i < 10 ? 1 : between(1, Math.min(4, 1 + Math.round(u * 4)))
      const pieces = Array.from({ length: count }, () => ({ t: 'p', s: take((s) => rankOf(s) >= 1 && rankOf(s) <= 3) }))
      return { pieces, stars: between(count + 1, Math.min(8, count + 2 + Math.round(u * 3))) }
    }
  }
  return null
}

/** A star square for a piece set: never on row 1 (no pawn can stand there), on reach for the pawns. */
function starSquares(piece: string, pieces: Piece[], stars: number): number[] | null {
  const taken = new Set(pieces.map((p) => p.s))
  let ok = (s: number) => rankOf(s) > 0 && !taken.has(s)
  if (piece === 'b' && pieces.length === 1) {
    const l = light(pieces[0].s)
    const base = ok
    ok = (s) => base(s) && light(s) === l
  }
  if (piece === 'p') {
    const low = Math.min(...pieces.map((p) => rankOf(p.s)))
    const base = ok
    ok = (s) => base(s) && rankOf(s) > low && rankOf(s) < 7
  }
  const pool = Array.from({ length: 64 }, (_, k) => k).filter(ok)
  if (pool.length < stars) return null
  const out: number[] = []
  while (out.length < stars) {
    const s = pick(pool)
    if (!out.includes(s)) out.push(s)
  }
  // the king must not start in check
  const king = pieces.find((p) => p.t === 'k')
  if (king && attackedBy(out, king.s)) return null
  return out.sort((a, b) => a - b)
}

type Made = { level: LevelDef; path: Step[]; fewest: number }

/** Plays the found solution through the real lesson engine: it must win on the last move. */
function proven(level: LevelDef, path: Step[]): boolean {
  let s: State = start(level)
  for (let i = 0; i < path.length; i++) {
    const out = play(level, s, name(path[i].from), name(path[i].to), path[i].promo)
    if (out.kind === 'fail') return false
    if (out.kind === 'success') return i === path.length - 1
    s = out.state
  }
  return false
}

function makeLevel(piece: string, i: number, seen: Set<string>): Made {
  // several solvable candidates per slot; later slots take the ones that need the most detours
  const candidates: Made[] = []
  for (let tries = 0; candidates.length < 8 && tries < 3000; tries++) {
    const d = design(piece, i)
    if (!d) continue
    const apples = starSquares(piece, d.pieces, d.stars)
    if (!apples) continue
    const node: Node = { pieces: d.pieces, apples }
    const k = keyOf(node)
    if (seen.has(k)) continue
    const found = solve(node)
    if (!found || found.fewest < 2) continue
    // levels with several pieces must really use all of them
    if (d.pieces.length > 1 && new Set(pathMovers(d.pieces, found.path)).size < d.pieces.length) continue
    // and a "use both" level must not be done in as few moves with one piece taken off the board
    if (d.goal && d.pieces.some((_, j) => {
      const alone = solve({ pieces: d.pieces.filter((_, k) => k !== j), apples })
      return !!alone && alone.fewest <= found.fewest
    })) continue
    const detour = found.fewest - d.stars
    // a level whose best way promotes to a knight says so, as lichess's own knight-promotion level does
    const knight = found.path.some((m) => m.promo === 'n')
    const goal = d.goal ?? (knight ? 'mostOfTheTimePromotingToAQueenIsBest' : detour >= 2 ? 'theFewerMoves' : 'grabAllTheStars')
    const level: LevelDef = { goal, detectCapture: false, fen: fen(d.pieces), color: 'white', apples: apples.map(name), nbMoves: found.fewest }
    candidates.push({ level, path: found.path, fewest: found.fewest })
  }
  if (!candidates.length) throw new Error(`no level for ${piece} ${i}`)
  candidates.sort((a, b) => a.fewest - b.fewest)
  const u = i / (PER_PIECE - 1)
  const chosen = candidates[Math.min(candidates.length - 1, Math.round(u * (candidates.length - 1)))]
  if (!proven(chosen.level, chosen.path)) throw new Error(`engine disagrees: ${piece} ${i} ${chosen.level.fen} ${chosen.level.apples}`)
  seen.add(chosen.level.fen + chosen.level.apples)
  return chosen
}

/** Which starting pieces the solution moves (a piece is tracked as it walks). */
function pathMovers(pieces: Piece[], path: Step[]): number[] {
  const where = pieces.map((p) => p.s)
  const used: number[] = []
  for (const m of path) {
    const idx = where.indexOf(m.from)
    used.push(idx)
    where[idx] = m.to
  }
  return used
}

const STAGE: Record<string, string> = { r: 'rook', b: 'bishop', q: 'queen', k: 'king', n: 'knight', p: 'pawn' }
const out: Record<string, LevelDef[]> = {}
for (const piece of ['r', 'b', 'q', 'k', 'n', 'p']) {
  const seen = new Set<string>()
  const t0 = Date.now()
  const made = Array.from({ length: PER_PIECE }, (_, i) => {
    const m = makeLevel(piece, i, seen)
    if (i % 10 === 9) console.log(`  ${STAGE[piece]} ${i + 1}/${PER_PIECE} ${Math.round((Date.now() - t0) / 1000)}s`)
    return m
  })
  // easy to hard: fewest moves first, then fewer stars
  made.sort((a, b) => a.fewest - b.fewest || a.level.apples!.length - b.level.apples!.length)
  out[STAGE[piece]] = made.map((m) => m.level)
  console.log(STAGE[piece].padEnd(7), made.map((m) => m.fewest).join(' '))
}
writeFileSync(new URL('../src/data/extra-levels.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log('wrote src/data/extra-levels.json')
