// Picks the tactics-lesson puzzles from a filtered lichess puzzle
// export (CC0, database.lichess.org) and checks every move with chess.js.
// usage: node scripts/build-puzzles.mjs <candidates.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'

const cand = JSON.parse(readFileSync(process.argv[2], 'utf8'))

const LEVELS = [
  ['mate1', 'mateIn1'],
  ['free', 'hangingPiece'],
  ['fork', 'fork'],
  ['pin', 'pin'],
  ['backrank', 'backRankMate'],
  ['discover', 'discoveredAttack'],
  ['promote', 'promotion'],
  ['mate2', 'mateIn2'],
]
const PER_LEVEL = 10

function valid(p) {
  try {
    const c = new Chess(p.fen)
    for (const m of p.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    return true
  } catch {
    return false
  }
}
const slim = (p) => ({ id: p.id, fen: p.fen, moves: p.moves, rating: p.rating })

const levels = {}
for (const [id, theme] of LEVELS) {
  const pool = cand[theme].filter(valid).sort((a, b) => a.rating - b.rating)
  // easiest first, but spread across the lower part so the level gets harder
  const span = pool.slice(0, Math.min(pool.length, 200))
  const pick = []
  for (let i = 0; i < PER_LEVEL; i++) pick.push(span[Math.floor((i * span.length) / PER_LEVEL)])
  levels[id] = pick.map(slim)
  console.log(id, pick.map((p) => p.rating).join(' '))
}

writeFileSync('src/data/puzzles.json', JSON.stringify({ levels }))
