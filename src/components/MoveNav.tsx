import { useEffect, useRef, useState } from 'react'
import type { Square } from './Board'
import { t } from '../lib/i18n'

type Anim = { from: Square; to: Square; key: number }

/**
 * Every position a board has shown, for stepping back and forth like chess.com.
 * `T` is whatever the screen needs to redraw a position (a FEN, a lesson state).
 * `shown` is the earlier position on show while looking back, null on the live one.
 */
export function useMoveHistory<T>(first: T, keys: boolean) {
  const [hist, setHist] = useState<{ snap: T; move: [Square, Square] | null }[]>(() => [{ snap: first, move: null }])
  const [view, setView] = useState<number | null>(null)
  // the slide for a step through the history; undefined while the live position shows its own
  const [navAnim, setNavAnim] = useState<Anim | null | undefined>(undefined)
  // negative, so they never match the keys of the live moves' slides
  const animKey = useRef(-1)
  const end = hist.length - 1
  const at = view ?? end

  /** A move on the board: recorded, and the view goes back to the live position. */
  function push(snap: T, move: [Square, Square]) {
    setHist((h) => [...h, { snap, move }])
    setView(null)
    setNavAnim(undefined)
  }
  function reset(snap: T) {
    setHist([{ snap, move: null }])
    setView(null)
    setNavAnim(undefined)
  }
  /** Shows position `i`; one step slides the piece, a jump does not. */
  function goTo(i: number) {
    const to = Math.max(0, Math.min(i, end))
    if (to === at) return
    const m = to === at + 1 ? hist[to].move : to === at - 1 ? hist[at].move : null
    // stepping back, the piece slides from where it went to where it came from
    setNavAnim(m && (to > at ? { from: m[0], to: m[1], key: animKey.current-- } : { from: m[1], to: m[0], key: animKey.current-- }))
    setView(to === end ? null : to)
  }

  // the arrow keys step through the moves, Home and End jump, as on chess.com
  useEffect(() => {
    if (!keys) return
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      // not behind an open window (settings, a stage's start or end)
      if (document.querySelector('[aria-modal="true"]')) return
      const to = e.key === 'ArrowLeft' ? at - 1 : e.key === 'ArrowRight' ? at + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? end : null
      if (to === null) return
      e.preventDefault()
      goTo(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const past = view === null ? null : hist[view]
  return {
    shown: past && past.snap,
    lastMove: past && past.move,
    /** the slide to pass the board: a step through the history, or the live move's own */
    anim: (live: Anim | null) => (navAnim !== undefined ? navAnim : live),
    push,
    reset,
    nav: <MoveNav at={at} end={end} goTo={goTo} />,
  }
}

/** chess.com's four buttons under the moves: the start, back, forward, the live position. */
function MoveNav({ at, end, goTo }: { at: number; end: number; goTo: (i: number) => void }) {
  const buttons = [
    { to: 0, off: at === 0, label: t('საწყისი პოზიცია', 'Start position'), d: 'M7 6v12M18 6l-7 6 7 6' },
    { to: at - 1, off: at === 0, label: t('წინა სვლა', 'Previous move'), d: 'M15 6l-7 6 7 6' },
    { to: at + 1, off: at === end, label: t('შემდეგი სვლა', 'Next move'), d: 'M9 6l7 6-7 6' },
    { to: end, off: at === end, label: t('ბოლო სვლა', 'Last move'), d: 'M17 6v12M6 6l7 6-7 6' },
  ]
  return (
    <div className="move-nav" role="group" aria-label={t('სვლები', 'Moves')}>
      {buttons.map((b) => (
        <button key={b.d} className="ghost-btn" onClick={() => goTo(b.to)} disabled={b.off} aria-label={b.label} title={b.label}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d={b.d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  )
}
