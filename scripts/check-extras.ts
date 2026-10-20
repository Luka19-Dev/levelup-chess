// Checks the extra star levels (src/data/extra-levels.json) on their own, without trusting
// the generator: the setup follows the rules, and the lesson engine the board uses
// (src/lib/lesson.ts) finds the fewest moves from scratch, which must equal each level's
// 3-star target. Two-piece levels must need both pieces for 3 stars.
// Writes each level's shortest solution to devtest-paths.json for the in-browser run.
// usage: npx tsx scripts/check-extras.ts [rook,bishop,...] [--paths out.json]
import { readFileSync, writeFileSync } from 'node:fs'
import { isPromotion, load, play, start, targets } from '../src/lib/lesson'
import type { LevelDef, State } from '../src/lib/lesson'
import { GOALS } from '../src/data/learnText'
import extras from '../src/data/extra-levels.json'
import lichess from '../src/data/lichess-learn.json'

type Step = [string, string, string | null]
const EXTRAS = extras as Record<string, LevelDef[]>
const PIECE: Record<string, string> = { rook: 'r', bishop: 'b', queen: 'q', king: 'k', knight: 'n', pawn: 'p' }

/** Breadth-first search through the real engine: fewest moves to win, with one way to do it. */
function solve(level: LevelDef, limit: number): { fewest: number; path: Step[] } | null {
  type Item = { s: State; path: Step[] }
  let frontier: Item[] = [{ s: start(level), path: [] }]
  const seen = new Set<string>()
  for (let depth = 1; depth <= limit; depth++) {
    const next: Item[] = []
    for (const { s, path } of frontier)
      for (const row of load(s.fen).board())
        for (const p of row) {
          if (!p) continue
          for (const to of targets(level, s, p.square))
            for (const promo of isPromotion(s, p.square, to) ? ['q', 'r', 'b', 'n'] : [undefined]) {
              const out = play(level, s, p.square, to, promo)
              const step: Step = [p.square, to, promo ?? null]
              if (out.kind === 'success') return { fewest: depth, path: [...path, step] }
              if (out.kind !== 'continue') continue
              const key = out.state.fen.split(' ')[0] + '|' + out.state.apples.join()
              if (!seen.has(key)) {
                seen.add(key)
                next.push({ s: out.state, path: [...path, step] })
              }
            }
        }
    frontier = next
  }
  return null
}

const light = (sq: string) => (sq.charCodeAt(0) - 97 + Number(sq[1]) - 1) % 2 === 1

/** Rule problems in a level's setup, as short notes. */
function setupProblems(key: string, level: LevelDef): string[] {
  const out: string[] = []
  const c = load(level.fen)
  const pieces = c.board().flat().filter(Boolean) as { square: string; type: string; color: string }[]
  const apples = level.apples ?? []
  if (level.color !== 'white' || level.fen.split(' ')[1] !== 'w') out.push('not white to move')
  if (!GOALS[level.goal]) out.push(`unknown goal ${level.goal}`)
  if (level.detectCapture !== false || level.scenario || level.success || level.failure) out.push('extra rules on a star level')
  if (pieces.some((p) => p.color !== 'w')) out.push('black piece on the board')
  if (pieces.some((p) => p.type !== PIECE[key])) out.push('a piece of another kind')
  if (!pieces.length || pieces.length > 4) out.push(`${pieces.length} pieces`)
  if (pieces.some((p) => p.type === 'p' && /[18]/.test(p.square[1]))) out.push('pawn on row 1 or 8')
  if (!apples.length) out.push('no stars')
  if (new Set(apples).size !== apples.length) out.push('a star twice')
  if (apples.some((a) => !/^[a-h][1-8]$/.test(a))) out.push('bad star square')
  if (apples.some((a) => a[1] === '1')) out.push('star on row 1 (nothing underneath)')
  if (apples.some((a) => pieces.some((p) => p.square === a))) out.push('star under a piece')
  if (start(level).fen && load(start(level).fen).inCheck()) out.push('starts in check')
  if (key === 'bishop') {
    const b = pieces.map((p) => light(p.square))
    if (b.length === 2 && b[0] === b[1]) out.push('both bishops on one colour')
    if (apples.some((a) => !b.includes(light(a)))) out.push('a star no bishop can reach')
  }
  const goalPieces = level.goal === 'useTwoRooks' || level.goal === 'youNeedBothBishops'
  if (goalPieces !== (pieces.length === 2 && key !== 'pawn')) out.push('goal text does not match the pieces')
  return out
}

/** The level with one piece taken off the board, to see whether the other manages alone. */
function without(level: LevelDef, square: string): LevelDef {
  const c = load(level.fen)
  c.remove(square as never)
  return { ...level, fen: c.fen() }
}

const args = process.argv.slice(2)
const pathsAt = args.indexOf('--paths')
const pathsFile = pathsAt >= 0 ? args[pathsAt + 1] : null
const only = args.find((a, i) => !a.startsWith('--') && i !== pathsAt + 1)?.split(',')
const lichessKeys = new Set((lichess as { levels: LevelDef[] }[]).flatMap((s) => s.levels.map((l) => l.fen.split(' ')[0] + '|' + [...(l.apples ?? [])].sort().join())))

let bad = 0
const paths: Record<string, Step[]> = {}
for (const [key, levels] of Object.entries(EXTRAS)) {
  if (only && !only.includes(key)) continue
  const seen = new Set<string>()
  const t0 = Date.now()
  levels.forEach((level, i) => {
    const notes = setupProblems(key, level)
    const id = level.fen.split(' ')[0] + '|' + [...(level.apples ?? [])].sort().join()
    if (seen.has(id)) notes.push('same board as an earlier level')
    if (lichessKeys.has(id)) notes.push("same board as a lichess level")
    seen.add(id)
    if (i && level.nbMoves < levels[i - 1].nbMoves) notes.push('easier than the level before')
    const found = solve(level, level.nbMoves)
    if (!found) notes.push(`NOT SOLVABLE in ${level.nbMoves}`)
    else {
      if (found.fewest !== level.nbMoves) notes.push(`target ${level.nbMoves} but ${found.fewest} is enough`)
      paths[`${key}Extra/${i + 1}`] = found.path
    }
    const squares = (load(level.fen).board().flat().filter(Boolean) as { square: string }[]).map((p) => p.square)
    if (squares.length === 2 && key !== 'pawn')
      for (const sq of squares) if (solve(without(level, sq), level.nbMoves)) notes.push(`3 stars without the piece on ${sq}`)
    if (notes.length) bad++
    console.log(`${key}Extra/${i + 1}`.padEnd(15), `${found?.fewest ?? '-'}/${level.nbMoves}`, notes.length ? '<- ' + notes.join(', ') : 'ok')
  })
  console.log(`${key}: ${levels.length} levels in ${Math.round((Date.now() - t0) / 1000)}s`)
}
if (pathsFile) {
  let all: Record<string, Step[]> = {}
  try {
    all = JSON.parse(readFileSync(pathsFile, 'utf8'))
  } catch {
    /* a new file */
  }
  writeFileSync(pathsFile, JSON.stringify({ ...all, ...paths }))
}
console.log(bad ? `\n${bad} level(s) with problems` : '\nevery extra level ok')
process.exit(bad ? 1 : 0)
