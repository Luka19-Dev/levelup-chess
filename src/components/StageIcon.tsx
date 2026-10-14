import { Piece } from '../pieces/sets'
import type { SetId } from '../pieces/sets'
import { MIRRORED, SYMBOLS } from '../pieces/symbols'
import type { Stage } from '../data/learn'

/** One game-icons.net symbol, drawn in the current text colour. */
export function GameIcon({ name, className = 'piece-svg symbol' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width="45" height="45" className={className} aria-hidden="true">
      <g transform={MIRRORED.has(name) ? 'translate(512 0) scale(-1 1)' : undefined}>
        {SYMBOLS[name].map((d, i) => (
          <path key={i} d={d} fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}

/** Skip forward: a play triangle against a bar, for the skip and next buttons. */
export function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 5.5v13L15 12z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18.5 5.5v13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

/** A stage's picture: its lichess-style symbol, or for the piece lessons the piece itself. */
export function StageIcon({ stage, set }: { stage: Stage; set: SetId }) {
  return SYMBOLS[stage.key] ? <GameIcon name={stage.key} /> : <Piece set={set} color="w" type={stage.icon} />
}
