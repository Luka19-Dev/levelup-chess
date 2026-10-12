// Checks every lesson level against the same engine the board uses:
//  - it can be solved within its target move count (breadth-first search);
//  - no position the player can reach has the opponent's king in check while it is
//    the player's move, which cannot happen in a real game (reported, not fatal:
//    lichess's lessons hand the move back after a check on purpose in a few places).
// usage: npx tsx scripts/check-lessons.ts [stage,stage,...]   (all stages when none are named)
import { SECTIONS } from '../src/data/learn'
import { isPromotion, load, opponentMove, opponentToMove, play, start, targets } from '../src/lib/lesson'
import type { LevelDef, State } from '../src/lib/lesson'

/** Lets the scripted opponent reply until it is the player's turn. */
function settle(level: LevelDef, s: State): State {
  while (opponentToMove(level, s)) {
    const r = opponentMove(level, s)
    if (!r.move) return r.state
    s = r.state
  }
  return s
}

const opponentInCheck = (fen: string) => {
  const c = load(fen)
  const p = fen.split(' ')
  p[1] = p[1] === 'w' ? 'b' : 'w'
  return load(p.join(' ')).inCheck() && !c.inCheck()
}

function solve(level: LevelDef, limit: number): { fewest: number; impossible: number } {
  let frontier: State[] = [settle(level, start(level))]
  const seen = new Set<string>()
  let impossible = 0
  for (let depth = 1; depth <= limit; depth++) {
    const next: State[] = []
    for (const st of frontier) {
      for (const row of load(st.fen).board())
        for (const p of row) {
          if (!p) continue
          for (const to of targets(level, st, p.square)) {
            for (const promo of isPromotion(st, p.square, to) ? ['q', 'n'] : [undefined]) {
              const out = play(level, st, p.square, to, promo)
              if (out.kind === 'success') return { fewest: depth, impossible }
              if (out.kind !== 'continue') continue
              const s = settle(level, out.state)
              if (opponentInCheck(s.fen)) impossible++
              const key = s.fen.split(' ').slice(0, 3).join(' ') + '|' + s.apples.join() + '|' + s.step
              if (!seen.has(key)) {
                seen.add(key)
                next.push(s)
              }
            }
          }
        }
    }
    frontier = next
  }
  return { fewest: Infinity, impossible }
}

const only = process.argv[2]?.split(',')
let bad = 0
let warned = 0
for (const section of SECTIONS)
  for (const stage of section.stages) {
    if (!stage.levels || (only && !only.includes(stage.key))) continue
    const cells = stage.levels.map((level, i) => {
      const { fewest, impossible } = solve(level, level.nbMoves)
      const start0 = settle(level, start(level))
      const startImpossible = opponentInCheck(start0.fen)
      if (fewest === Infinity) bad++
      if (startImpossible || impossible) warned++
      const notes = [fewest === Infinity ? `NOT SOLVABLE in ${level.nbMoves}` : '', startImpossible ? 'starts with the opponent in check' : '', impossible ? `${impossible} reachable check-on-your-move` : '']
        .filter(Boolean)
        .join(', ')
      return `${i + 1}:${fewest === Infinity ? '-' : fewest}/${level.nbMoves}${notes ? ' <- ' + notes : ''}`
    })
    console.log(stage.key.padEnd(11), cells.join('  '))
  }
console.log(`\n${bad ? bad + ' level(s) not solvable within their target' : 'every level solvable within its target'}; ${warned} level(s) with check-on-your-move positions`)
process.exit(bad ? 1 : 0)
