// The board editor's position: pieces, whose move, castling and en passant, read from and
// written to FEN, like lichess's /editor. Validation explains, in words, why a position
// cannot be played from.
import { Chess } from 'chess.js'
import type { Position, Square } from '../components/Board'
import type { Color, PieceType } from '../pieces/sets'
import { t } from './i18n'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'

export type Castling = { K: boolean; Q: boolean; k: boolean; q: boolean }
export type Setup = { position: Position; turn: Color; castling: Castling; ep: Square | '' }

const FILES = 'abcdefgh'
const NO_CASTLING: Castling = { K: false, Q: false, k: false, q: false }

/** Reads a FEN (or just its board part); anything unreadable gives null. */
export function parseFen(fen: string): Setup | null {
  const [board, turn = 'w', castle = '-', ep = '-'] = fen.trim().split(/\s+/)
  const rows = board?.split('/')
  if (!rows || rows.length !== 8) return null
  const position: Position = {}
  for (let r = 0; r < 8; r++) {
    let f = 0
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) f += Number(ch)
      else if (/[prnbqk]/i.test(ch)) {
        if (f > 7) return null
        position[FILES[f] + (8 - r)] = { type: ch.toLowerCase() as PieceType, color: ch === ch.toUpperCase() ? 'w' : 'b' }
        f++
      } else return null
    }
    if (f !== 8) return null
  }
  if (turn !== 'w' && turn !== 'b') return null
  const castling = { ...NO_CASTLING }
  if (castle !== '-') for (const c of castle) if (c in castling) castling[c as keyof Castling] = true
  const setup: Setup = { position, turn, castling, ep: /^[a-h][36]$/.test(ep) ? ep : '' }
  return tidy(setup)
}

/** The FEN of a setup; the move counters always start again at 0 and 1. */
export function toFen(s: Setup): string {
  let board = ''
  for (let r = 7; r >= 0; r--) {
    let empty = 0
    for (let f = 0; f < 8; f++) {
      const p = s.position[FILES[f] + (r + 1)]
      if (!p) {
        empty++
        continue
      }
      if (empty) board += empty
      empty = 0
      board += p.color === 'w' ? p.type.toUpperCase() : p.type
    }
    if (empty) board += empty
    if (r) board += '/'
  }
  const castle = (['K', 'Q', 'k', 'q'] as const).filter((c) => s.castling[c]).join('') || '-'
  return `${board} ${s.turn} ${castle} ${s.ep || '-'} 0 1`
}

const CASTLE_SQUARES: Record<keyof Castling, [Square, Square, Color]> = {
  K: ['e1', 'h1', 'w'],
  Q: ['e1', 'a1', 'w'],
  k: ['e8', 'h8', 'b'],
  q: ['e8', 'a8', 'b'],
}

/** Castling is possible only with the king and that rook still on their first squares. */
export function canCastle(position: Position, c: keyof Castling): boolean {
  const [k, r, color] = CASTLE_SQUARES[c]
  return position[k]?.type === 'k' && position[k].color === color && position[r]?.type === 'r' && position[r].color === color
}

/**
 * The squares a pawn could be taken on en passant: the side that just moved has a pawn on
 * its fourth row with the two squares behind it empty, and a pawn of the side to move beside it.
 */
export function epSquares(s: Setup): Square[] {
  const mover: Color = s.turn === 'w' ? 'b' : 'w'
  const row = mover === 'b' ? 5 : 4
  const behind = mover === 'b' ? [6, 7] : [3, 2]
  const out: Square[] = []
  for (let f = 0; f < 8; f++) {
    const p = s.position[FILES[f] + row]
    if (p?.type !== 'p' || p.color !== mover) continue
    if (behind.some((r) => s.position[FILES[f] + r])) continue
    const beside = [f - 1, f + 1].filter((x) => x >= 0 && x < 8).map((x) => s.position[FILES[x] + row])
    if (beside.some((b) => b?.type === 'p' && b.color === s.turn)) out.push(FILES[f] + behind[0])
  }
  return out
}

/** Drops castling rights and an en passant square the pieces no longer allow. */
export function tidy(s: Setup): Setup {
  const castling = { ...s.castling }
  for (const c of ['K', 'Q', 'k', 'q'] as const) if (!canCastle(s.position, c)) castling[c] = false
  const ep = s.ep && epSquares(s).includes(s.ep) ? s.ep : ''
  return { ...s, castling, ep }
}

/** Why this position cannot be played, in words; null when it can. */
export function problem(s: Setup): string | null {
  const kings = { w: 0, b: 0 }
  for (const [square, p] of Object.entries(s.position)) {
    if (p.type === 'k') kings[p.color]++
    if (p.type === 'p' && (square[1] === '1' || square[1] === '8'))
      return t('პაიკი პირველ ან ბოლო ხაზზე ვერ დადგება.', 'A pawn cannot stand on the first or last row.')
  }
  if (kings.w !== 1 || kings.b !== 1) return t('თითოეულ მხარეს ზუსტად ერთი მეფე უნდა ჰყავდეს.', 'Each side needs exactly one king.')
  // the side that just moved cannot have left its own king in check
  const other = toFen({ ...s, turn: s.turn === 'w' ? 'b' : 'w', ep: '' })
  try {
    if (new Chess(other).inCheck())
      return s.turn === 'w'
        ? t('შავის მეფე ქიშშია, ამიტომ სვლა შავისაა.', "Black's king is in check, so it must be black to move.")
        : t('თეთრის მეფე ქიშშია, ამიტომ სვლა თეთრისაა.', "White's king is in check, so it must be white to move.")
    new Chess(toFen(s))
  } catch {
    return t('ამ პოზიციიდან თამაში ვერ დაიწყება.', 'A game cannot start from this position.')
  }
  return null
}

/** The setup inside a `fen=` link, or the starting position. */
export function setupFromQuery(query: string): { setup: Setup; flip: boolean } {
  const q = new URLSearchParams(query)
  return { setup: parseFen(fenFromParam(q.get('fen'))) ?? parseFen(START_FEN)!, flip: q.get('o') === 'b' }
}

export function toQuery(fen: string, flip: boolean): string {
  // spaces become underscores, as in lichess's editor links, so the link stays readable
  return `fen=${encodeURIComponent(fen.replace(/ /g, '_')).replace(/%2F/g, '/')}${flip ? '&o=b' : ''}`
}

/** Reads the underscores of `toQuery` back as spaces. */
export function fenFromParam(v: string | null): string {
  return (v ?? '').replace(/_/g, ' ')
}
