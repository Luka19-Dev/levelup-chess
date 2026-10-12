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

/** A stage's picture: its lichess-style symbol, or for the piece lessons the piece itself. */
export function StageIcon({ stage, set }: { stage: Stage; set: SetId }) {
  return SYMBOLS[stage.key] ? <GameIcon name={stage.key} /> : <Piece set={set} color="w" type={stage.icon} />
}
