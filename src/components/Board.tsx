import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { PIECE_NAME, Piece } from '../pieces/sets'
import type { Color, PieceType, SetId } from '../pieces/sets'
import { tr } from '../lib/i18n'

export type Square = string // 'e4'
export type Placed = { type: PieceType; color: Color }
export type Position = Record<Square, Placed>

const FILES = 'abcdefgh'

export function sq(file: number, rank: number): Square {
  return FILES[file] + (rank + 1)
}
export function coords(s: Square): [number, number] {
  return [FILES.indexOf(s[0]), Number(s[1]) - 1]
}

type Props = {
  position: Position
  orientation: Color
  set: SetId
  /** the color the player may move, or null when the board is locked */
  movable: Color | null
  legalFrom: (from: Square) => Square[]
  onMove: (from: Square, to: Square) => void
  lastMove?: [Square, Square] | null
  /** bump `key` to animate the piece now on `to` sliding in from `from` */
  anim?: { from: Square; to: Square; key: number } | null
  hint?: Square | null
  check?: Square | null
  stars?: Square[]
  shakeKey?: number
  /** hint arrows and circles, like lichess's: green to suggest, red for a threat */
  shapes?: Shape[]
  /** called with any clicked square while no piece is movable (setup lessons) */
  onSquare?: (s: Square) => void
  /** a pawn waiting on its last row: the four pieces stand on that file to pick from */
  promotion?: { to: Square; color: Color; onPick: (p: PieceType) => void; onCancel: () => void } | null
}

const PROMOTE_TO = ['q', 'n', 'r', 'b'] as const

export function Board(props: Props) {
  const { position, orientation, set, movable, legalFrom, onMove, lastMove, anim, hint, check, stars = [], shakeKey = 0, shapes = [], onSquare, promotion } = props
  const boardRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number; moved: boolean } | null>(null)
  // the player's own arrows and circles, drawn with the right button as on chess.com
  const [drawn, setDrawn] = useState<Shape[]>([])
  const [drawing, setDrawing] = useState<{ from: Square; to: Square; color: string } | null>(null)
  // a move clears them, as a left click does
  const moveKey = anim?.key
  useEffect(() => setDrawn([]), [moveKey])
  const [shaking, setShaking] = useState(false)
  // A dragged piece is already standing where it was dropped, so the slide-in for
  // that one move is skipped. `key` pins the skip to the first animation that
  // arrives for the drop, so a later move onto the same square (a recapture) still slides.
  const dropped = useRef<{ to: Square; key?: number } | null>(null)

  // A wrong answer shakes the board; the key changing is the trigger.
  const lastShake = useRef(shakeKey)
  useLayoutEffect(() => {
    if (shakeKey === lastShake.current) return
    lastShake.current = shakeKey
    setShaking(true)
    const t = setTimeout(() => setShaking(false), 420)
    return () => clearTimeout(t)
  }, [shakeKey])

  // Clear a selection the position no longer supports (a move happened elsewhere).
  const selectedPiece = selected ? position[selected] : undefined
  const activeSel = selectedPiece && movable && selectedPiece.color === movable ? selected : null
  const targets = activeSel ? legalFrom(activeSel) : []

  const toScreen = (s: Square) => {
    const [f, r] = coords(s)
    return orientation === 'w' ? [f, 7 - r] : [7 - f, r]
  }
  const fromPoint = (clientX: number, clientY: number): Square | null => {
    const el = boardRef.current
    if (!el) return null
    const box = el.getBoundingClientRect()
    const col = Math.floor(((clientX - box.left) / box.width) * 8)
    const row = Math.floor(((clientY - box.top) / box.height) * 8)
    if (col < 0 || col > 7 || row < 0 || row > 7) return null
    return orientation === 'w' ? sq(col, 7 - row) : sq(7 - col, row)
  }

  /** Keeps the pointer's moves coming to the board; a pointer the browser no longer knows makes this throw. */
  function capture(e: ReactPointerEvent) {
    try {
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    } catch {
      /* the moves still arrive while the pointer stays over the board */
    }
  }

  function down(e: ReactPointerEvent) {
    const s = fromPoint(e.clientX, e.clientY)
    if (!s) return
    if (e.button === 2) {
      // orange by default like chess.com; Shift green, Ctrl red, Alt blue
      const color = e.shiftKey ? 'green' : e.ctrlKey ? 'red' : e.altKey ? 'blue' : 'yellow'
      setDrawing({ from: s, to: s, color })
      capture(e)
      return
    }
    setDrawn([])
    if (!movable) {
      onSquare?.(s)
      return
    }
    if (activeSel && targets.includes(s)) {
      setSelected(null)
      dropped.current = null
      onMove(activeSel, s)
      return
    }
    const p = position[s]
    if (p && p.color === movable) {
      setSelected(s)
      setDrag({ from: s, x: e.clientX, y: e.clientY, moved: false })
      capture(e)
    } else {
      setSelected(null)
    }
  }
  function move(e: ReactPointerEvent) {
    if (drawing) {
      const s = fromPoint(e.clientX, e.clientY)
      if (s && s !== drawing.to) setDrawing({ ...drawing, to: s })
      return
    }
    if (!drag) return
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved })
  }
  function up(e: ReactPointerEvent) {
    if (drawing) {
      const d = drawing
      setDrawing(null)
      // a plain right click colours the square itself, as on chess.com
      const shape: Shape = d.from === d.to ? { square: d.from, color: d.color } : { arrow: d.from + d.to, color: d.color }
      const same = (x: Shape) => x.arrow === shape.arrow && x.square === shape.square
      // drawing it again in the same colour takes it away; in another colour, recolours it
      setDrawn((list) => (list.some((x) => same(x) && x.color === shape.color) ? list.filter((x) => !same(x)) : [...list.filter((x) => !same(x)), shape]))
      return
    }
    if (!drag) return
    const s = fromPoint(e.clientX, e.clientY)
    const d = drag
    setDrag(null)
    if (d.moved && s && s !== d.from && legalFrom(d.from).includes(s)) {
      setSelected(null)
      dropped.current = { to: s }
      onMove(d.from, s)
    }
  }

  let slide = anim
  if (anim && dropped.current && anim.to === dropped.current.to) {
    dropped.current.key ??= anim.key
    if (dropped.current.key === anim.key) slide = null
  }

  const boxRect = boardRef.current?.getBoundingClientRect()
  const cell = boxRect ? boxRect.width / 8 : 0

  const marks: Record<Square, string> = {}
  for (const x of drawn) if (x.square) marks[x.square] = x.color
  const squares = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const s = orientation === 'w' ? sq(col, 7 - row) : sq(7 - col, row)
      const [f, r] = coords(s)
      const light = (f + r) % 2 === 1
      const cls = ['sq', light ? 'light' : 'dark']
      if (lastMove && (lastMove[0] === s || lastMove[1] === s)) cls.push('last')
      if (activeSel === s) cls.push('sel')
      if (hint === s) cls.push('hint')
      if (check === s) cls.push('check')
      squares.push(
        <div key={s} className={cls.join(' ')} style={{ left: `${col * 12.5}%`, top: `${row * 12.5}%` }}>
          {col === 0 && <span className="coord rank">{s[1]}</span>}
          {row === 7 && <span className="coord file">{s[0]}</span>}
          {targets.includes(s) && <span className={position[s] ? 'target capture' : 'target'} />}
          {marks[s] && <span className="mark" style={{ background: MARK_COLOURS[marks[s]] }} />}
          {stars.includes(s) && <span className="star">★</span>}
        </div>,
      )
    }
  }

  return (
    <div
      ref={boardRef}
      className={`board${shaking ? ' shake' : ''}${movable || onSquare ? ' live' : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        setDrag(null)
        setDrawing(null)
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {squares}
      {Object.entries(position).map(([s, p]) => {
        const [col, row] = toScreen(s)
        const dragging = drag?.moved && drag.from === s
        return (
          <PieceAt
            key={s + p.color + p.type}
            col={col}
            row={row}
            dragging={!!dragging}
            animFrom={slide && slide.to === s ? toScreen(slide.from) : null}
            animKey={slide && slide.to === s ? slide.key : 0}
          >
            <Piece set={set} color={p.color} type={p.type} />
          </PieceAt>
        )
      })}
      {(shapes.length > 0 || drawn.some((x) => !x.square) || drawing) && (
        <Shapes
          shapes={[...shapes, ...drawn.filter((x) => !x.square), ...(drawing && drawing.to !== drawing.from ? [{ arrow: drawing.from + drawing.to, color: drawing.color }] : [])]}
          at={toScreen}
        />
      )}
      {promotion && (
        // on the board itself, so a phone never has to scroll to find it; a tap beside it cancels
        <div
          className="promo-shade"
          onPointerDown={(e) => {
            e.stopPropagation()
            if (e.button === 0) promotion.onCancel()
          }}
        >
          {PROMOTE_TO.map((type, i) => {
            const [col, row] = toScreen(promotion.to)
            return (
              <button
                key={type}
                className="promo-pick"
                aria-label={tr(PIECE_NAME[type])}
                style={{ left: `${col * 12.5}%`, top: `${(row === 0 ? i : 7 - i) * 12.5}%` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => promotion.onPick(type)}
              >
                <Piece set={set} color={promotion.color} type={type} />
              </button>
            )
          })}
        </div>
      )}
      {drag?.moved && position[drag.from] && boxRect && (
        <div
          className="ghost"
          style={{ width: cell, height: cell, left: drag.x - boxRect.left - cell / 2, top: drag.y - boxRect.top - cell / 2 }}
        >
          <Piece set={set} color={position[drag.from].color} type={position[drag.from].type} />
        </div>
      )}
    </div>
  )
}

function PieceAt(props: { col: number; row: number; dragging: boolean; animFrom: number[] | null; animKey: number; children: React.ReactNode }) {
  const { col, row, dragging, animFrom, animKey, children } = props
  const ref = useRef<HTMLDivElement>(null)
  const done = useRef(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !animFrom || animKey === done.current) return
    done.current = animKey
    el.style.transition = 'none'
    el.style.transform = `translate(${(animFrom[0] - col) * 100}%, ${(animFrom[1] - row) * 100}%)`
    el.getBoundingClientRect()
    el.style.transition = 'transform 260ms cubic-bezier(.2,.7,.3,1)'
    el.style.transform = 'translate(0, 0)'
  }, [animKey, animFrom, col, row])
  return (
    <div ref={ref} className={`pc${dragging ? ' lifted' : ''}`} style={{ left: `${col * 12.5}%`, top: `${row * 12.5}%` }}>
      {children}
    </div>
  )
}

/** arrow 'e2e4' or circle 'e4' (lesson hints); square 'e4' = a right-clicked square, coloured under the piece */
export type Shape = { arrow?: string; circle?: string; square?: string; color: string }

// chess.com-like highlight fills: orange by default
const MARK_COLOURS: Record<string, string> = {
  yellow: 'rgba(240, 130, 30, 0.8)',
  green: 'rgba(40, 170, 60, 0.75)',
  red: 'rgba(220, 50, 50, 0.75)',
  blue: 'rgba(40, 110, 230, 0.75)',
}

const SHAPE_COLOURS: Record<string, string> = { green: '#15781b', red: '#882020', yellow: '#e68f00', blue: '#003088' }

/** Translucent arrows and circles, in board units: each square is 1 x 1 out of 8. */
function Shapes({ shapes, at }: { shapes: Shape[]; at: (s: Square) => number[] }) {
  return (
    <svg className="arrow" viewBox="0 0 8 8" width="8" height="8" aria-hidden="true">
      <defs>
        {Object.entries(SHAPE_COLOURS).map(([name, colour]) => (
          <marker key={name} id={`head-${name}`} viewBox="0 0 4 4" refX="1.4" refY="2" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0 0 4 2 0 4z" fill={colour} />
          </marker>
        ))}
      </defs>
      {shapes.map((sh, i) => {
        const colour = SHAPE_COLOURS[sh.color] ?? SHAPE_COLOURS.green
        if (sh.circle) {
          const [x, y] = at(sh.circle)
          return <circle key={i} cx={x + 0.5} cy={y + 0.5} r={0.45} fill="none" stroke={colour} strokeWidth={0.08} />
        }
        const f = at(sh.arrow!.slice(0, 2))
        const t = at(sh.arrow!.slice(2, 4))
        const [x1, y1, x2, y2] = [f[0] + 0.5, f[1] + 0.5, t[0] + 0.5, t[1] + 0.5]
        const head = `url(#head-${sh.color in SHAPE_COLOURS ? sh.color : 'green'})`
        const [dx, dy] = [Math.abs(x2 - x1), Math.abs(y2 - y1)]
        // a knight's jump bends like an L, as on chess.com: the two-square leg first, then the turn
        const knight = (dx === 1 && dy === 2) || (dx === 2 && dy === 1)
        const [cx, cy] = knight ? (dx === 2 ? [x2, y1] : [x1, y2]) : [x1, y1]
        const len = Math.hypot(x2 - cx, y2 - cy)
        // stop short so the head lands inside the target square
        const ex = x2 - ((x2 - cx) / len) * 0.3
        const ey = y2 - ((y2 - cy) / len) * 0.3
        return (
          <path
            key={i}
            d={knight ? `M${x1} ${y1}L${cx} ${cy}L${ex} ${ey}` : `M${x1} ${y1}L${ex} ${ey}`}
            fill="none"
            stroke={colour}
            strokeWidth="0.16"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={head}
          />
        )
      })}
    </svg>
  )
}
