// Grows every tactics stage to PER_LEVEL puzzles, taken from the puzzle bank in public/puzzles.
// The stage's existing puzzles keep their places (saved stars point at them by position); the new
// ones go after them, rising in rating from where the stage ends, as a ladder.
// usage: node scripts/extend-puzzles.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'

const PER_LEVEL = 20
// the new puzzles climb this many rating points above the stage's hardest one
const CLIMB = 350

const THEMES = {
  mate1: 'mateIn1',
  free: 'hangingPiece',
  fork: 'fork',
  pin: 'pin',
  backrank: 'backRankMate',
  discover: 'discoveredAttack',
  promote: 'promotion',
  mate2: 'mateIn2',
}

const file = 'src/data/puzzles.json'
const { levels } = JSON.parse(readFileSync(file, 'utf8'))
const index = JSON.parse(readFileSync('public/puzzles/index.json', 'utf8'))
const bands = Object.keys(index.bands).map(Number)
const rows = bands.flatMap((b) => JSON.parse(readFileSync(`public/puzzles/${b}.json`, 'utf8')))

function valid(p) {
  try {
    const c = new Chess(p.fen)
    for (const m of p.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    return true
  } catch {
    return false
  }
}

const used = new Set(Object.values(levels).flat().map((p) => p.id))
for (const [id, theme] of Object.entries(THEMES)) {
  const have = levels[id]
  const need = PER_LEVEL - have.length
  if (need <= 0) continue
  const top = Math.max(...have.map((p) => p.rating))
  const t = index.themes.indexOf(theme)
  const pool = rows
    .filter((r) => r[7].includes(t) && r[3] > top && r[3] <= top + CLIMB && !used.has(r[0]))
    .map(([pid, fen, moves, rating]) => ({ id: pid, fen, moves: moves.split(' '), rating }))
    .filter(valid)
    .sort((a, b) => a.rating - b.rating)
  if (pool.length < need) throw new Error(`${id}: only ${pool.length} candidates`)
  // evenly spaced through the pool, so each new puzzle is a little harder than the last
  const pick = Array.from({ length: need }, (_, i) => pool[Math.floor(((i + 0.5) * pool.length) / need)])
  for (const p of pick) used.add(p.id)
  levels[id] = [...have, ...pick]
  console.log(id, levels[id].map((p) => p.rating).join(' '))
}

writeFileSync(file, JSON.stringify({ levels }))
