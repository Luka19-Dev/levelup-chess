import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Chess } from 'chess.js'
import type { Square as CSquare } from 'chess.js'
import { Board } from './Board'
import type { Position, Square } from './Board'
import type { Color, SetId } from '../pieces/sets'
import { sfx } from '../lib/sound'
import { caps } from '../lib/caps'
import { t } from '../lib/i18n'

export type Puzzle = { id: string; fen: string; moves: string[]; rating: number }

type Props = {
  puzzle: Puzzle
  set: SetId
  /** learn: wrong moves can be retried. sprint: the first wrong move ends the puzzle. */
  mode: 'learn' | 'sprint'
  onSolved: (result: { mistakes: number; hints: number }) => void
  onFailed?: () => void
  onMistake?: () => void
  /** shown at the top of the side panel, above the move message */
  top?: ReactNode
  /** shown at the bottom of the side panel, left of the buttons */
  bottom?: ReactNode
  /** buttons after the hint button, e.g. skip */
  actions?: ReactNode
}

function toPosition(c: Chess): Position {
  const pos: Position = {}
  for (const row of c.board()) for (const p of row) if (p) pos[p.square] = { type: p.type, color: p.color }
  return pos
}

function kingInCheck(c: Chess): Square | null {
  if (!c.inCheck()) return null
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === c.turn()) return p.square
  return null
}

export function PuzzleRunner({ puzzle, set, mode, onSolved, onFailed, onMistake, top, bottom, actions }: Props) {
  const game = useRef(new Chess(puzzle.fen))
  const [, redraw] = useState(0)
  const [step, setStep] = useState(0)
  // the solver is the side NOT to move in the FEN: the opponent plays first
  const [player, setPlayer] = useState<Color>(() => (new Chess(puzzle.fen).turn() === 'w' ? 'b' : 'w'))
  const [anim, setAnim] = useState<{ from: Square; to: Square; key: number } | null>(null)
  const [last, setLast] = useState<[Square, Square] | null>(null)
  const [hint, setHint] = useState<Square | null>(null)
  const [shake, setShake] = useState(0)
  const [status, setStatus] = useState<'waiting' | 'yours' | 'right' | 'wrong' | 'solved' | 'failed'>('waiting')
  const tally = useRef({ mistakes: 0, hints: 0 })
  const animKey = useRef(1)

  /** `silent`: the winning move, which lets the success sound play alone */
  const play = useCallback((uci: string, opponent: boolean, silent = false) => {
    const from = uci.slice(0, 2) as CSquare
    const to = uci.slice(2, 4) as CSquare
    const m = game.current.move({ from, to, promotion: uci[4] ?? 'q' })
    if (!silent)
      sfx.play({
        capture: !!m.captured,
        castle: m.flags.includes('k') || m.flags.includes('q'),
        promotion: !!m.promotion,
        check: game.current.inCheck(),
        mate: game.current.isCheckmate(),
        opponent,
      })
    setAnim({ from, to, key: animKey.current++ })
    setLast([from, to])
    redraw((n) => n + 1)
  }, [])

  // New puzzle: set the position, then the opponent plays the move that starts it.
  useEffect(() => {
    game.current = new Chess(puzzle.fen)
    tally.current = { mistakes: 0, hints: 0 }
    setStep(0)
    setLast(null)
    setAnim(null)
    setHint(null)
    setStatus('waiting')
    redraw((n) => n + 1)
    setPlayer(game.current.turn() === 'w' ? 'b' : 'w')
    const t = setTimeout(() => {
      play(puzzle.moves[0], true)
      setStep(1)
      setStatus('yours')
    }, 650)
    return () => clearTimeout(t)
  }, [puzzle, play])

  const legalFrom = (from: Square) => game.current.moves({ square: from as CSquare, verbose: true }).map((m) => m.to)

  function onMove(from: Square, to: Square) {
    if (status !== 'yours' && status !== 'wrong') return
    const expected = puzzle.moves[step]
    const isLast = step === puzzle.moves.length - 1
    const promo = expected.slice(0, 4) === from + to ? expected[4] : undefined
    const trial = new Chess(game.current.fen())
    trial.move({ from: from as CSquare, to: to as CSquare, promotion: promo ?? 'q' })
    // Any mate on the final move counts, even if the database names a different one.
    const right = from + to === expected.slice(0, 4) || (isLast && trial.isCheckmate())
    if (!right) {
      tally.current.mistakes++
      sfx.wrong()
      setShake((n) => n + 1)
      if (mode === 'sprint') {
        setStatus('failed')
        setHint(expected.slice(0, 2))
        onFailed?.()
      } else {
        setStatus('wrong')
        onMistake?.()
      }
      return
    }
    setHint(null)
    play(from + to + (promo ?? trial.history({ verbose: true })[0]?.promotion ?? ''), false, isLast)
    if (isLast) {
      setStatus('solved')
      sfx.right()
      onSolved({ ...tally.current })
      return
    }
    setStatus('right')
    const reply = puzzle.moves[step + 1]
    setStep(step + 2)
    setTimeout(() => {
      play(reply, true)
      setStatus('yours')
    }, 500)
  }

  function showHint() {
    if (!usable) return
    tally.current.hints++
    setHint(puzzle.moves[step].slice(0, 2))
  }

  const c = game.current
  const usable = status === 'yours' || status === 'wrong'
  const message =
    status === 'waiting'
      ? t('მოწინააღმდეგე ფიქრობს...', 'The opponent is thinking...')
      : status === 'wrong'
        ? t('არა, სცადე სხვა სვლა.', 'No, try another move.')
        : status === 'right'
          ? t('სწორია! გააგრძელე.', 'Right! Keep going.')
          : status === 'solved'
            ? t('შესანიშნავია!', 'Excellent!')
            : status === 'failed'
              ? t('ეს სვლა არ იყო.', 'That was not the move.')
              : player === 'w'
                ? caps(t('თეთრის სვლაა', 'White to move'))
                : caps(t('შავის სვლაა', 'Black to move'))

  return (
    <div className="play">
      <Board
        position={toPosition(c)}
        orientation={player}
        set={set}
        movable={status === 'yours' || status === 'wrong' ? player : null}
        legalFrom={legalFrom}
        onMove={onMove}
        lastMove={last}
        anim={anim}
        hint={hint}
        check={kingInCheck(c)}
        shakeKey={shake}
      />
      <aside className="panel">
        {top}
        <div className={`message ${status}`}>
          <span className={`turn-dot ${player}`} />
          {message}
        </div>
        {(mode === 'learn' || bottom || actions) && (
          <div className="controls">
            {bottom ?? <span />}
            <div className="actions">
              {mode === 'learn' && (
                // stays in place between moves, only greyed out, so nothing shifts
                <button className="primary-btn icon-label" onClick={showHint} disabled={!usable}>
                  {/* a lit bulb: the bulb, its base and five rays */}
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M12 6.5a4.5 4.5 0 0 0-2.7 8.1c.5.4.8 1 .8 1.6v.8h3.8v-.8c0-.6.3-1.2.8-1.6A4.5 4.5 0 0 0 12 6.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M10.4 20.2h3.2M12 1.8v2.2M5.4 4.4l1.5 1.5M18.6 4.4l-1.5 1.5M2.8 11h2.1M19.1 11h2.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {caps(t('მინიშნება', 'Hint'))}
                </button>
              )}
              {actions}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
