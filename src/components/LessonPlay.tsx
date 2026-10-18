import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Board } from './Board'
import { useMoveHistory } from './MoveNav'
import type { Position, Shape } from './Board'
import type { SetId } from '../pieces/sets'
import { isPromotion, load, opponentMove, opponentToMove, play, score, start, targets } from '../lib/lesson'
import type { LevelDef, Outcome, State } from '../lib/lesson'
import { GOALS } from '../data/learnText'
import { sfx } from '../lib/sound'
import { burst } from '../lib/celebrate'
import { caps } from '../lib/caps'
import { t } from '../lib/i18n'
import type { GoalState } from './LessonPanel'

type Props = {
  level: LevelDef
  set: SetId
  /** renders the panel top for the current goal state */
  panel: (goal: GoalState) => ReactNode
  /** the winning move, at once: the stars are kept even if the player leaves before the next level opens */
  onSolved: (stars: number) => void
  /** a moment later, once the success has been seen */
  onDone: () => void
}

const OPPONENT_DELAY = 900
const RESTART_DELAY = 1800

/** One lesson board: runs a lichess level through the rules engine and reports the stars earned. */
export function LessonPlay({ level, set, panel, onSolved, onDone }: Props) {
  const player = level.color === 'white' ? 'w' : 'b'
  const [state, setState] = useState<State>(() => start(level))
  const [goal, setGoal] = useState<GoalState>({ kind: 'goal', text: GOALS[level.goal] })
  const [busy, setBusy] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>(level.shapes ?? [])
  const [anim, setAnim] = useState<{ from: string; to: string; key: number } | null>(null)
  const [last, setLast] = useState<[string, string] | null>(null)
  const [shake, setShake] = useState(0)
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null)
  // every position played so far, to step back and forth through (the arrow keys too, not while picking a promotion)
  const moves = useMoveHistory(state, !promo)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))

  /** A move on the board: it slides in and joins the history, `s` being the position after it. */
  function slide(from: string, to: string, s: State) {
    setAnim({ from, to, key: Date.now() })
    setLast([from, to])
    moves.push(s, [from, to])
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
        slide(r.move.from, r.move.to, r.state)
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
    setGoal({ kind: 'goal', text: GOALS[level.goal] })
    setShapes(level.shapes ?? [])
    setAnim(null)
    setLast(null)
    setPromo(null)
    moves.reset(s)
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
              ? { ka: 'შენი მეფე ქიშის ქვეშ დარჩებოდა! სცადე სხვა სვლა.', en: 'Your king would be left in check! Try another move.' }
              : { ka: 'ეს ქიშია! ნამდვილ პარტიაში ახლა მოწინააღმდეგე იმოძრავებდა. სცადე სხვა სვლა.', en: 'That is check! In a real game the opponent would have to answer it. Try another move.' },
        })
        later(() => {
          setBusy(false)
          setGoal({ kind: 'goal', text: GOALS[level.goal] })
        }, RESTART_DELAY)
        return
      }
      setState(out.state)
      slide(from, to, out.state)
      if (out.why === 'capture' && out.capture) {
        const cap = out.capture
        setGoal({ kind: 'fail', text: { ka: 'მოწინააღმდეგე შენს ფიგურას აიყვანდა! სცადე თავიდან.', en: 'The opponent would take your piece! Try again.' } })
        setShapes([{ arrow: cap.from + cap.to, color: 'red' }])
      } else setGoal({ kind: 'fail', text: { ka: 'ასე არ გამოვა. სცადე თავიდან.', en: 'That does not work. Try again.' } })
      later(restart, RESTART_DELAY)
      return
    }

    const m = out.move
    const collected = out.state.apples.length < state.apples.length
    setState(out.state)
    slide(from, to, out.state)
    setShapes([])
    if (out.kind === 'success') {
      // the winning move is silent so the success sound plays on its own
      const stars = score(out.state.moves, level.nbMoves)
      setGoal({ kind: 'success', stars })
      setBusy(true)
      burst()
      sfx.right()
      onSolved(stars)
      later(onDone, 1300)
      return
    }
    if (collected) sfx.star()
    else sfx.play({ capture: !!m.captured, castle: m.flags.includes('k') || m.flags.includes('q'), promotion: !!m.promotion, check: load(out.state.fen).inCheck() })
    if (goal.kind === 'fail') setGoal({ kind: 'goal', text: GOALS[level.goal] })
    if (out.opponentNext) opponent(out.state)
  }

  function onMove(from: string, to: string) {
    if (isPromotion(state, from, to)) setPromo({ from, to })
    else apply(play(level, state, from, to), from, to)
  }

  // the position on the board: the live one, or an earlier one while looking back
  const live = moves.shown === null
  const shown = moves.shown ?? state
  // stars are shown as stars, not as the pawns that stand underneath them
  const position: Position = {}
  for (const row of load(shown.fen).board())
    for (const p of row) if (p && !shown.apples.includes(p.square)) position[p.square] = { type: p.type, color: p.color }

  const finished = goal.kind === 'success'
  const myTurn = load(state.fen).turn() === player

  return (
    <div className="play">
      <Board
        position={position}
        orientation={player}
        set={set}
        movable={!busy && !finished && !promo && live && myTurn ? player : null}
        legalFrom={(from) => targets(level, state, from)}
        onMove={onMove}
        lastMove={live ? last : moves.lastMove}
        anim={moves.anim(anim)}
        stars={shown.apples}
        // the hint arrows belong to the live position
        shapes={live ? shapes : []}
        shakeKey={shake}
        promotion={
          promo && live ? {
            to: promo.to,
            color: player,
            onPick: (p) => {
              const { from, to } = promo
              setPromo(null)
              apply(play(level, state, from, to, p), from, to)
            },
            onCancel: () => setPromo(null),
          } : null
        }
      />
      <aside className="panel">
        {panel(goal)}
        {moves.nav}
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
