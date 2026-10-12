// The rules engine for learn lessons, following lichess's learn module (lichess-org/lila,
// ui/learn) so its lessons behave exactly as they do there:
// - stars are enemy pawns underneath, so pieces stop at them and can take them;
// - the opponent never moves unless the level scripts its replies (`scenario`);
// - after a free move, the turn is handed straight back to the player;
// - on boards without stars, leaving a piece the opponent can take for free fails;
// - success and failure are small rules (`Assert`) checked after every player move.
// Pure functions over FEN strings, shared by the board and scripts/check-lessons.ts.
import { Chess } from 'chess.js'
import type { Move, Square as CSquare } from 'chess.js'

export type Assert = { fn: string; args: unknown[] }
export type Shape = { arrow?: string; circle?: string; color: string }
export type ScenarioStep = string | { move: string; shapes?: Shape[] }

export type LevelDef = {
  goal: string
  fen: string
  color: 'white' | 'black'
  apples?: string[]
  nbMoves: number
  /** 'unprotected': fail if the opponent can take a piece you cannot take back; true: fail on any capture */
  detectCapture: false | true | 'unprotected'
  success?: Assert
  failure?: Assert
  scenario?: ScenarioStep[]
  shapes?: Shape[]
  captures?: number
  pointsForCapture?: boolean
  showPieceValues?: boolean
  /** moves into check are offered, and fail when played */
  offerIllegalMove?: boolean
  /** stars that do not stand on the board as obstacles */
  emptyApples?: boolean
  autoCastle?: boolean
  /** after a failure, the opponent shows a reply */
  showFailureFollowUp?: boolean
}

export type State = {
  fen: string
  apples: string[]
  moves: number
  /** next scenario step */
  step: number
  scenarioFailed: boolean
  sans: string[]
}

/** check: your king would be in check · givesCheck: you would attack their king and still have the move · capture: they would take a piece · rule: the level's own rule */
export type Failure = 'check' | 'givesCheck' | 'capture' | 'rule'
export type Outcome =
  | { kind: 'continue'; state: State; move: Move; opponentNext: boolean }
  | { kind: 'success'; state: State; move: Move }
  | { kind: 'fail'; why: Failure; state: State; move?: Move; capture?: { from: string; to: string } }

export const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export function load(fen: string): Chess {
  return new Chess(saneCastling(fen), { skipValidation: true })
}

/** Keeps only castling rights whose king and rook are really on their squares:
    several lessons claim rights for pieces not placed yet, which chess.js trips over. */
function saneCastling(fen: string): string {
  const p = fen.split(' ')
  if (!p[2] || p[2] === '-') return fen
  const rows = p[0].split('/')
  const at = (sq: string) => {
    const row = rows[8 - Number(sq[1])]
    let file = 0
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch)
      else {
        if (file === sq.charCodeAt(0) - 97) return ch
        file++
      }
    }
    return ''
  }
  const need: Record<string, [string, string, string, string]> = {
    K: ['e1', 'K', 'h1', 'R'],
    Q: ['e1', 'K', 'a1', 'R'],
    k: ['e8', 'k', 'h8', 'r'],
    q: ['e8', 'k', 'a8', 'r'],
  }
  const kept = [...p[2]].filter((r) => need[r] && at(need[r][0]) === need[r][1] && at(need[r][2]) === need[r][3]).join('')
  p[2] = kept || '-'
  return p.join(' ')
}

const other = (c: 'w' | 'b') => (c === 'w' ? 'b' : 'w')
const playerOf = (level: LevelDef): 'w' | 'b' => (level.color === 'white' ? 'w' : 'b')
const uci = (m: Move) => m.from + m.to + (m.promotion ?? '')
const stepMove = (s: ScenarioStep) => (typeof s === 'string' ? s : s.move)

function withTurn(fen: string, turn: 'w' | 'b'): string {
  const p = fen.split(' ')
  p[1] = turn
  p[3] = '-'
  return p.join(' ')
}

export function start(level: LevelDef): State {
  const c = load(level.fen)
  const apples = level.apples ?? []
  const opp = other(c.turn())
  // an opponent pawn cannot stand on the player's own back row (chess.js breaks on it),
  // so a star there is a plain star with nothing underneath
  const backRow = opp === 'b' ? '1' : '8'
  if (!level.emptyApples) for (const a of apples) if (a[1] !== backRow) c.put({ type: 'p', color: opp }, a as CSquare)
  return { fen: c.fen(), apples, moves: 0, step: 0, scenarioFailed: false, sans: [] }
}

/** Whether the scripted opponent should move now (the level opens on their turn, or a step is due). */
export function opponentToMove(level: LevelDef, state: State): boolean {
  return load(state.fen).turn() !== playerOf(level) && !!level.scenario && state.step < level.scenario.length
}

/** Plays the opponent's next scripted move. */
export function opponentMove(level: LevelDef, state: State): { state: State; move?: Move; shapes?: Shape[] } {
  const step = level.scenario![state.step]
  const c = load(state.fen)
  try {
    const u = stepMove(step)
    const move = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    return { state: { ...state, fen: c.fen(), step: state.step + 1 }, move, shapes: typeof step === 'string' ? undefined : step.shapes }
  } catch {
    return { state: { ...state, scenarioFailed: true } }
  }
}

/** Squares the piece on `from` may go to. Escape levels also offer moves into check, which then fail. */
export function targets(level: LevelDef, state: State, from: string): string[] {
  const c = load(state.fen)
  if (c.turn() !== playerOf(level)) return []
  const legal = c.moves({ square: from as CSquare, verbose: true }).map((m) => m.to as string)
  if (!level.offerIllegalMove) return legal
  return [...new Set([...legal, ...pseudoTargets(c, from)])]
}

/** Moves that ignore check: chess.js only lists legal ones, so the king's steps are
    listed by hand and the other pieces move with their own king lifted off. */
function pseudoTargets(c: Chess, from: string): string[] {
  const piece = c.get(from as CSquare)
  if (!piece) return []
  if (piece.type === 'k') {
    const [f, r] = [from.charCodeAt(0) - 97, Number(from[1]) - 1]
    const out: string[] = []
    for (let df = -1; df <= 1; df++)
      for (let dr = -1; dr <= 1; dr++) {
        const [nf, nr] = [f + df, r + dr]
        if ((!df && !dr) || nf < 0 || nf > 7 || nr < 0 || nr > 7) continue
        const s = String.fromCharCode(97 + nf) + (nr + 1)
        if (c.get(s as CSquare)?.color !== piece.color) out.push(s)
      }
    return out
  }
  const lifted = load(c.fen())
  for (const row of lifted.board()) for (const p of row) if (p && p.color === piece.color && p.type === 'k') lifted.remove(p.square)
  return lifted.moves({ square: from as CSquare, verbose: true }).map((m) => m.to)
}

/** Whether moving from -> to promotes, so the board can ask which piece. */
export function isPromotion(state: State, from: string, to: string): boolean {
  const p = load(state.fen).get(from as CSquare)
  return p?.type === 'p' && (to[1] === '8' || to[1] === '1')
}

/** A capture the opponent could make right now (their turn): any, or only one we cannot take back. */
function findCapture(c: Chess, unprotectedOnly: boolean): { from: string; to: string } | undefined {
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue
    if (!unprotectedOnly) return { from: m.from, to: m.to }
    const after = load(c.fen())
    after.move({ from: m.from, to: m.to, promotion: m.promotion })
    if (!after.moves({ verbose: true }).some((r) => r.to === m.to)) return { from: m.from, to: m.to }
  }
  return undefined
}

function check(a: Assert | undefined, c: Chess, state: State, level: LevelDef): boolean {
  if (!a) return false
  const args = a.args as never[]
  const keys = (k: string | string[]) => (typeof k === 'string' ? k.split(' ') : k)
  const isPiece = (sq: string, fenPiece: string) => {
    const p = c.get(sq as CSquare)
    return !!p && p.type === fenPiece.toLowerCase() && p.color === (fenPiece === fenPiece.toUpperCase() ? 'w' : 'b')
  }
  switch (a.fn) {
    case 'pieceOn':
      return isPiece(args[1], args[0])
    case 'pieceNotOn':
      return !isPiece(args[1], args[0])
    case 'noPieceOn': {
      const allowed = keys(args[0])
      return c.board().some((row) => row.some((p) => p && !allowed.includes(p.square)))
    }
    case 'whitePawnOnAnyOf':
      return keys(args[0]).some((k) => isPiece(k, 'P'))
    case 'extinct':
      return !c.board().some((row) => row.some((p) => p && p.color === (args[0] === 'white' ? 'w' : 'b')))
    case 'check':
      return c.inCheck()
    case 'mate':
      return c.isCheckmate()
    case 'lastMoveSan':
      return state.sans[state.sans.length - 1] === args[0]
    case 'checkIn':
      return state.moves <= args[0] && c.inCheck()
    case 'noCheckIn':
      return state.moves >= args[0] && !c.inCheck()
    case 'not':
      return !check(args[0], c, state, level)
    case 'and':
      return (args as Assert[]).every((x) => check(x, c, state, level))
    case 'or':
      return (args as Assert[]).some((x) => check(x, c, state, level))
    case 'scenarioComplete':
      return state.step >= (level.scenario?.length ?? 0)
    case 'scenarioFailed':
      return state.scenarioFailed
    default:
      throw new Error(`unknown rule ${a.fn}`)
  }
}

/** One player move, judged the way lichess judges it. */
export function play(level: LevelDef, state: State, from: string, to: string, promotion?: string): Outcome {
  const c = load(state.fen)
  const legal = c.moves({ square: from as CSquare, verbose: true }).some((m) => m.to === to)
  if (!legal) return { kind: 'fail', why: 'check', state }

  const move = c.move({ from, to, promotion: isPromotion(state, from, to) ? (promotion ?? 'q') : undefined })
  let next: State = {
    ...state,
    fen: c.fen(),
    moves: state.moves + 1,
    sans: [...state.sans, move.san.replace(/[+#]$/, '')],
    apples: state.apples.filter((a) => a !== to),
  }

  let inScenario = false
  const steps = level.scenario ?? []
  if (next.step < steps.length) {
    const want = stepMove(steps[next.step])
    if (want === uci(move) || want === move.from + move.to) {
      next = { ...next, step: next.step + 1 }
      inScenario = true
    } else next = { ...next, scenarioFailed: true }
  }

  if (!inScenario) {
    const capture = level.detectCapture ? findCapture(c, level.detectCapture === 'unprotected') : undefined
    if (capture) return { kind: 'fail', why: 'capture', state: next, move, capture }
    if (check(level.failure, c, next, level)) return { kind: 'fail', why: 'rule', state: next, move }
  }

  const won = level.success ? check(level.success, c, next, level) : next.apples.length === 0
  if (won) return { kind: 'success', state: next, move }

  // A free move hands the turn straight back, which would leave their king in check on our
  // move: a position no real game can reach. Such a move is refused instead (lichess allows it).
  if (!inScenario && c.inCheck()) return { kind: 'fail', why: 'givesCheck', state }

  // a free move hands the turn straight back; a scripted move waits for the opponent's reply
  if (!inScenario) next = { ...next, fen: withTurn(c.fen(), playerOf(level)) }
  return { kind: 'continue', state: next, move, opponentNext: inScenario && next.step < steps.length }
}

/** lichess's grading: 3 stars at or under the target, 2 if a little over, otherwise 1. */
export function score(moves: number, nb: number): number {
  const late = moves - nb
  return late <= 0 ? 3 : late <= Math.max(1, nb / 8) ? 2 : 1
}
