import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Board } from './Board'
import type { Position, Shape } from './Board'
import { PIECE_NAME, Piece } from '../pieces/sets'
import type { SetId } from '../pieces/sets'
import { isPromotion, load, opponentMove, opponentToMove, play, score, start, targets } from '../lib/lesson'
import type { LevelDef, Outcome, State } from '../lib/lesson'
import { GOALS } from '../data/learnText'
import { sfx } from '../lib/sound'
import { burst } from '../lib/celebrate'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'
import type { GoalState } from './LessonPanel'

type Props = {
  level: LevelDef
  set: SetId
  /** renders the panel top for the current goal state */
  panel: (goal: GoalState) => ReactNode
  onDone: (stars: number) => void
}

const OPPONENT_DELAY = 900
const RESTART_DELAY = 1800

/** One lesson board: runs a lichess level through the rules engine and reports the stars earned. */
export function LessonPlay({ level, set, panel, onDone }: Props) {
  const player = level.color === 'white' ? 'w' : 'b'
  const [state, setState] = useState<State>(() => start(level))
  const [goal, setGoal] = useState<GoalState>({ kind: 'goal', text: tr(GOALS[level.goal]) })
  const [busy, setBusy] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>(level.shapes ?? [])
  const [anim, setAnim] = useState<{ from: string; to: string; key: number } | null>(null)
  const [last, setLast] = useState<[string, string] | null>(null)
  const [shake, setShake] = useState(0)
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))

  function slide(from: string, to: string) {
    setAnim({ from, to, key: Date.now() })
    setLast([from, to])
  }

  /** The scripted opponent plays its next move, if one is due. */
  function opponent(s: State) {
    if (!opponentToMove(level, s)) {
      setBusy(false)
      return
    }
    setBusy(true)
    later(() => {
      const r = opponentMove(level, s)
      if (r.move) {
        sfx.play({ opponent: true, capture: !!r.move.captured })
        slide(r.move.from, r.move.to)
      }
      setState(r.state)
      if (r.shapes) setShapes(r.shapes)
      setBusy(false)
    }, OPPONENT_DELAY)
  }

  function restart() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const s = start(level)
    setState(s)
    setGoal({ kind: 'goal', text: tr(GOALS[level.goal]) })
    setShapes(level.shapes ?? [])
    setAnim(null)
    setLast(null)
    setPromo(null)
    opponent(s)
  }

  useEffect(() => {
    opponent(state)
    return () => timers.current.forEach(clearTimeout)
    // the opening move only, once per level
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function apply(out: Outcome, from: string, to: string) {
    if (out.kind === 'fail') {
      sfx.wrong()
      setShake((n) => n + 1)
      setBusy(true)
      if (out.why === 'check' || out.why === 'givesCheck') {
        // the move is not made: either king would be left in check on the wrong move
        setGoal({
          kind: 'fail',
          text:
            out.why === 'check'
              ? t('შენი მეფე ქიშის ქვეშ დარჩებოდა! სცადე სხვა სვლა.', 'Your king would be left in check! Try another move.')
              : t('ეს ქიშია! ნამდვილ პარტიაში ახლა მოწინააღმდეგე იმოძრავებდა. სცადე სხვა სვლა.', 'That is check! In a real game the opponent would have to answer it. Try another move.'),
        })
        later(() => {
          setBusy(false)
          setGoal({ kind: 'goal', text: tr(GOALS[level.goal]) })
        }, RESTART_DELAY)
        return
      }
      setState(out.state)
      slide(from, to)
      if (out.why === 'capture' && out.capture) {
        const cap = out.capture
        setGoal({ kind: 'fail', text: t('მოწინააღმდეგე შენს ფიგურას აიყვანდა! სცადე თავიდან.', 'The opponent would take your piece! Try again.') })
        setShapes([{ arrow: cap.from + cap.to, color: 'red' }])
      } else setGoal({ kind: 'fail', text: t('ასე არ გამოვა. სცადე თავიდან.', 'That does not work. Try again.') })
      later(restart, RESTART_DELAY)
      return
    }

    const m = out.move
    const collected = out.state.apples.length < state.apples.length
    setState(out.state)
    slide(from, to)
    setShapes([])
    if (out.kind === 'success') {
      // the winning move is silent so the success sound plays on its own
      const stars = score(out.state.moves, level.nbMoves)
      setGoal({ kind: 'success', stars })
      setBusy(true)
      burst()
      sfx.right()
      later(() => onDone(stars), 1300)
      return
    }
    if (collected) sfx.star()
    else sfx.play({ capture: !!m.captured, castle: m.flags.includes('k') || m.flags.includes('q'), promotion: !!m.promotion, check: load(out.state.fen).inCheck() })
    if (goal.kind === 'fail') setGoal({ kind: 'goal', text: tr(GOALS[level.goal]) })
    if (out.opponentNext) opponent(out.state)
  }

  function onMove(from: string, to: string) {
    if (isPromotion(state, from, to)) setPromo({ from, to })
    else apply(play(level, state, from, to), from, to)
  }

  // stars are shown as stars, not as the pawns that stand underneath them
  const position: Position = {}
  for (const row of load(state.fen).board())
    for (const p of row) if (p && !state.apples.includes(p.square)) position[p.square] = { type: p.type, color: p.color }

  const finished = goal.kind === 'success'
  const myTurn = load(state.fen).turn() === player

  return (
    <div className="play">
      <Board
        position={position}
        orientation={player}
        set={set}
        movable={!busy && !finished && !promo && myTurn ? player : null}
        legalFrom={(from) => targets(level, state, from)}
        onMove={onMove}
        lastMove={last}
        anim={anim}
        stars={state.apples}
        shapes={shapes}
        shakeKey={shake}
      />
      <aside className="panel">
        {panel(goal)}
        {promo && (
          <div className="promotion" role="group" aria-label={t('აირჩიე ფიგურა', 'Choose a piece')}>
            <span className="label">{caps(t('აირჩიე ფიგურა', 'Choose a piece'))}</span>
            <div className="chips">
              {(['q', 'n', 'r', 'b'] as const).map((p) => (
                <button
                  key={p}
                  className="chip chip-icon"
                  aria-label={tr(PIECE_NAME[p])}
                  onClick={() => {
                    const { from, to } = promo
                    setPromo(null)
                    apply(play(level, state, from, to, p), from, to)
                  }}
                >
                  <Piece set={set} color={player} type={p} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="controls">
          {level.nbMoves > 1 && (
            <span className="muted">
              {t('სვლები', 'Moves')}: {state.moves} · {t('საუკეთესო', 'Best')}: {level.nbMoves}
            </span>
          )}
          <button className="ghost-btn icon-label" onClick={restart}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 14 4 9l5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {caps(t('თავიდან', 'Restart'))}
          </button>
        </div>
      </aside>
    </div>
  )
}
