import { useEffect, useRef } from 'react'
import { t } from '../lib/i18n'

/**
 * The moves of a game in numbered pairs, like lichess; a click jumps to that move.
 * `at` = how many moves are on the board. A game that starts with black opens on „1. ...".
 */
export function MoveList({ sans, at, blackFirst, goTo, empty }: { sans: string[]; at: number; blackFirst: boolean; goTo: (i: number) => void; empty: string }) {
  const listRef = useRef<HTMLDivElement>(null)
  // the move on show stays in sight
  useEffect(() => {
    listRef.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' })
  }, [at, sans.length])

  const rows: { n: number; w?: number; b?: number }[] = []
  sans.forEach((_, i) => {
    const k = i + (blackFirst ? 1 : 0)
    const n = Math.floor(k / 2) + 1
    if (k % 2 === 0) rows.push({ n, w: i })
    else if (rows.length && rows[rows.length - 1].n === n) rows[rows.length - 1].b = i
    else rows.push({ n, b: i })
  })
  const cell = (i?: number) =>
    i === undefined ? (
      <span className="mv empty">...</span>
    ) : (
      <button className={`mv${at === i + 1 ? ' on' : ''}`} onClick={() => goTo(i + 1)}>
        {sans[i]}
      </button>
    )

  return (
    <div className="move-list" ref={listRef} aria-label={t('სვლები', 'Moves')}>
      {rows.length === 0 ? (
        <p className="ed-tip">{empty}</p>
      ) : (
        rows.map((r) => (
          <div key={r.n} className="mv-row">
            <span className="mv-n">{r.n}.</span>
            {cell(r.w)}
            {r.b !== undefined ? cell(r.b) : <span className="mv empty" />}
          </div>
        ))
      )}
    </div>
  )
}
