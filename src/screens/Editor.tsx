import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Chess } from 'chess.js'
import type { Square as CSquare } from 'chess.js'
import { Board } from '../components/Board'
import type { Position, Square } from '../components/Board'
import { MoveNav } from '../components/MoveNav'
import { MoveList } from '../components/MoveList'
import { PIECE_NAME, Piece } from '../pieces/sets'
import type { Color, PieceType, SetId } from '../pieces/sets'
import { EMPTY_FEN, START_FEN, canCastle, epSquares, parseFen, problem, setupFromQuery, tidy, toFen, toQuery } from '../lib/editor'
import type { Castling, Setup } from '../lib/editor'
import { sfx } from '../lib/sound'
import { drawText } from '../lib/gameEnd'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'

/** What a click on the board does: nothing (pieces are dragged), remove, or put down this piece. */
type Tool = 'move' | 'erase' | `${Color}${PieceType}`

const TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p']
const FILES = 'abcdefgh'

/** The square under a point of the screen, on the page's board. */
function squareAt(x: number, y: number, flip: boolean): Square | null {
  const el = document.querySelector('.editor .board')
  if (!el) return null
  const box = el.getBoundingClientRect()
  const col = Math.floor(((x - box.left) / box.width) * 8)
  const row = Math.floor(((y - box.top) / box.height) * 8)
  if (col < 0 || col > 7 || row < 0 || row > 7) return null
  return flip ? FILES[7 - col] + (row + 1) : FILES[col] + (8 - row)
}

/** The board editor, like lichess's: set up any position, then play it out from there. */
export function Editor({ query, set, onChange, go }: { query: string; set: SetId; onChange: (query: string) => void; go: (hash: string) => void }) {
  const [first] = useState(() => setupFromQuery(query))
  const [setup, setSetup] = useState<Setup>(first.setup)
  const [flip, setFlip] = useState(first.flip)
  const [tool, setTool] = useState<Tool>('move')
  // a piece dragged out of the palette, drawn under the pointer
  const [ghost, setGhost] = useState<{ tool: Tool; x: number; y: number } | null>(null)
  const fen = toFen(setup)
  const [fenText, setFenText] = useState(fen)
  const [copied, setCopied] = useState(false)

  // the position lives in the link, so a teacher can send it; replaced, so editing does not fill the back history
  useEffect(() => {
    onChange(toQuery(fen, flip))
    // not while the teacher is typing in the box: their half-typed text stays
    if (document.activeElement?.id !== 'ed-fen') setFenText(fen)
  }, [fen, flip, onChange])

  const change = (patch: Partial<Setup>) => setSetup((s) => tidy({ ...s, ...patch }))
  const changePosition = (f: (p: Position) => Position) => setSetup((s) => tidy({ ...s, position: f({ ...s.position }) }))

  /** Puts a piece down; with `toggle`, clicking the same piece again takes it away. */
  function place(square: Square, what: Tool, toggle: boolean) {
    if (what === 'move') return
    changePosition((pos) => {
      if (what === 'erase') delete pos[square]
      else {
        const piece = { color: what[0] as Color, type: what[1] as PieceType }
        if (toggle && pos[square]?.color === piece.color && pos[square]?.type === piece.type) delete pos[square]
        else pos[square] = piece
      }
      return pos
    })
  }

  function onDrop(from: Square, to: Square | null) {
    changePosition((pos) => {
      const p = pos[from]
      delete pos[from]
      if (to && p) pos[to] = p
      return pos
    })
  }

  /** A palette piece: a click picks it as the tool, a drag puts it straight onto the board. */
  function paletteDown(e: ReactPointerEvent, what: Tool) {
    if (e.button !== 0) return
    setTool(what)
    if (what === 'move' || what === 'erase') return
    const [sx, sy] = [e.clientX, e.clientY]
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true
      if (moved) setGhost({ tool: what, x: ev.clientX, y: ev.clientY })
    }
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setGhost(null)
      if (!moved || ev.type === 'pointercancel') return
      const s = squareAt(ev.clientX, ev.clientY, flip)
      if (s) place(s, what, false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const err = problem(setup)
  const eps = epSquares(setup)
  const toolButton = (what: Tool, label: string, icon: ReactNode) => (
    <button
      key={what}
      className={`tool${what.length === 2 ? ' piece-tool' : ''}${tool === what ? ' on' : ''}`}
      aria-pressed={tool === what}
      aria-label={label}
      title={label}
      onPointerDown={(e) => paletteDown(e, what)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setTool(what)}
    >
      {icon}
    </button>
  )
  const pieceTool = (color: Color, type: PieceType) =>
    toolButton(`${color}${type}`, `${color === 'w' ? t('თეთრი', 'White') : t('შავი', 'Black')} ${tr(PIECE_NAME[type]).toLowerCase()}`, <Piece set={set} color={color} type={type} />)

  return (
    <div className={`play editor tool-${tool === 'move' ? 'move' : tool === 'erase' ? 'erase' : 'piece'}`}>
      <Board
        position={setup.position}
        orientation={flip ? 'b' : 'w'}
        set={set}
        movable={null}
        legalFrom={() => []}
        onMove={() => {}}
        onSquare={(s) => place(s, tool, true)}
        edit={{ onDrop }}
      />
      <aside className="panel editor-panel">
        <div className="palette" role="toolbar" aria-label={t('ფიგურები', 'Pieces')}>
          {toolButton('move', t('გადაადგილება', 'Move pieces'), <HandIcon />)}
          {TYPES.map((p) => pieceTool('w', p))}
          {toolButton('erase', t('წაშლა', 'Remove'), <EraseIcon />)}
          {TYPES.map((p) => pieceTool('b', p))}
        </div>
        <p className="ed-tip">
          {tool === 'move'
            ? t('გადაიტანე ფიგურები დაფაზე. დაფის გარეთ გატანილი ფიგურა წაიშლება.', 'Drag pieces around the board. A piece dragged off the board is removed.')
            : tool === 'erase'
              ? t('დააწკაპუნე ფიგურაზე, რომ წაშალო.', 'Click a piece to remove it.')
              : t('დააწკაპუნე უჯრაზე, რომ ფიგურა დადო.', 'Click a square to put the piece there.')}
        </p>

        <div className="ed-field">
          <span className="label">{caps(t('ვისი სვლაა', 'To move'))}</span>
          <div className="chips">
            {(['w', 'b'] as const).map((c) => (
              <button key={c} className={`chip${setup.turn === c ? ' on' : ''}`} aria-pressed={setup.turn === c} onClick={() => change({ turn: c })}>
                <span className="chip-pieces">
                  <Piece set={set} color={c} type="k" />
                </span>
                {caps(c === 'w' ? t('თეთრი', 'White') : t('შავი', 'Black'))}
              </button>
            ))}
          </div>
        </div>

        <div className="ed-field">
          <span className="label">{caps(t('როქი', 'Castling'))}</span>
          <div className="castling">
            {(['w', 'b'] as const).map((c) => (
              <div key={c} className="chips">
                <span className="chip-pieces castle-king" aria-hidden="true">
                  <Piece set={set} color={c} type="k" />
                </span>
                {([c === 'w' ? 'K' : 'k', c === 'w' ? 'Q' : 'q'] as (keyof Castling)[]).map((k) => (
                  <button
                    key={k}
                    className={`chip${setup.castling[k] ? ' on' : ''}`}
                    aria-pressed={setup.castling[k]}
                    disabled={!canCastle(setup.position, k)}
                    aria-label={`${c === 'w' ? t('თეთრი', 'White') : t('შავი', 'Black')}: ${k.toLowerCase() === 'k' ? t('მოკლე როქი', 'castle short') : t('გრძელი როქი', 'castle long')}`}
                    onClick={() => change({ castling: { ...setup.castling, [k]: !setup.castling[k] } })}
                  >
                    {caps(k.toLowerCase() === 'k' ? t('მოკლე', 'Short') : t('გრძელი', 'Long'))}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {eps.length > 0 && (
          <div className="ed-field">
            <span className="label">{caps(t('გავლით აყვანა', 'En passant'))}</span>
            <div className="chips">
              {['', ...eps].map((s) => (
                <button key={s} className={`chip${setup.ep === s ? ' on' : ''}`} aria-pressed={setup.ep === s} onClick={() => change({ ep: s })}>
                  {s || caps(t('არა', 'No'))}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ed-buttons">
          <button className="ghost-btn" onClick={() => setSetup(parseFen(START_FEN)!)}>
            {caps(t('საწყისი პოზიცია', 'Start position'))}
          </button>
          <button className="ghost-btn" onClick={() => setSetup({ ...parseFen(EMPTY_FEN)!, turn: setup.turn })}>
            {caps(t('გასუფთავება', 'Clear board'))}
          </button>
          <button className="ghost-btn icon-label wide" onClick={() => setFlip((f) => !f)}>
            <FlipIcon />
            {caps(t('შემობრუნება', 'Flip board'))}
          </button>
        </div>

        <div className="ed-field">
          <div className="fen-head">
            <label className="label" htmlFor="ed-fen">
              FEN
            </label>
            <button
              className="copy-btn"
              onClick={() => {
                void navigator.clipboard?.writeText(location.href).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1600)
                })
              }}
            >
              <LinkIcon />
              {copied ? caps(t('დაკოპირდა', 'Copied')) : caps(t('ბმულის კოპირება', 'Copy link'))}
            </button>
          </div>
          <input
            id="ed-fen"
            className={`fen-input${parseFen(fenText) ? '' : ' bad'}`}
            value={fenText}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setFenText(e.target.value)
              const s = parseFen(e.target.value)
              if (s) setSetup(s)
            }}
            onBlur={() => setFenText(fen)}
          />
        </div>

        {err && (
          <p className="ed-problem" role="status">
            {err}
          </p>
        )}
        <button className="primary-btn play-from" disabled={!!err} onClick={() => go(`editor/play?${toQuery(fen, flip)}`)}>
          {caps(t('ითამაშე ამ პოზიციიდან', 'Play from here'))}
        </button>
      </aside>
      {ghost && ghost.tool.length === 2 && (
        <div className="palette-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <Piece set={set} color={ghost.tool[0] as Color} type={ghost.tool[1] as PieceType} />
        </div>
      )}
    </div>
  )
}

type Ply = { san: string; from: Square; to: Square }

/** Plays a position from the editor: legal moves for both sides, step back and forth, take back. */
export function PlayFrom({ query, set, go }: { query: string; set: SetId; go: (hash: string) => void }) {
  const { setup, flip: flipped } = useMemo(() => setupFromQuery(query), [query])
  const start = toFen(setup)
  const bad = problem(setup)
  const [flip, setFlip] = useState(flipped)
  const [plies, setPlies] = useState<Ply[]>([])
  // how many of the moves are on the board: less than all while looking back
  const [at, setAt] = useState(0)
  const [anim, setAnim] = useState<{ from: Square; to: Square; key: number } | null>(null)
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null)
  const animKey = useRef(1)

  // replayed from the start each time, so repetitions and the 50-move count are known
  const game = useMemo(() => {
    if (bad) return null
    const c = new Chess(start)
    for (const p of plies.slice(0, at)) c.move(p.san)
    return c
  }, [bad, start, plies, at])

  /** Shows the position after `i` moves; one step slides the piece, a jump does not. */
  function goTo(i: number) {
    const to = Math.max(0, Math.min(i, plies.length))
    if (to === at) return
    setPromo(null)
    if (to === at + 1) setAnim({ from: plies[at].from, to: plies[at].to, key: animKey.current++ })
    else if (to === at - 1) setAnim({ from: plies[to].to, to: plies[to].from, key: animKey.current++ })
    else setAnim(null)
    setAt(to)
  }

  // the arrow keys step through the moves, Home and End jump, as on every other board
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || promo) return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      if (document.querySelector('[aria-modal="true"]')) return
      const to = e.key === 'ArrowLeft' ? at - 1 : e.key === 'ArrowRight' ? at + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? plies.length : null
      if (to === null) return
      e.preventDefault()
      goTo(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!game) {
    return (
      <div className="sprint-card">
        <p>{bad}</p>
        <button className="primary-btn" onClick={() => go(`editor?${query}`)}>
          {caps(t('რედაქტორში დაბრუნება', 'Back to the editor'))}
        </button>
      </div>
    )
  }

  const legalFrom = (from: Square) => game.moves({ square: from as CSquare, verbose: true }).map((m) => m.to)

  function play(from: Square, to: Square, promotion?: PieceType) {
    const c = new Chess(game!.fen())
    const m = c.move({ from: from as CSquare, to: to as CSquare, promotion })
    sfx.play({
      capture: !!m.captured,
      castle: m.flags.includes('k') || m.flags.includes('q'),
      promotion: !!m.promotion,
      check: c.inCheck(),
      mate: c.isCheckmate(),
      opponent: m.color !== (flip ? 'b' : 'w'),
    })
    // a move made while looking back replaces the moves after it
    setPlies((p) => [...p.slice(0, at), { san: m.san, from, to }])
    setAt(at + 1)
    setAnim({ from, to, key: animKey.current++ })
  }

  function onMove(from: Square, to: Square) {
    const piece = game!.get(from as CSquare)
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) setPromo({ from, to })
    else play(from, to)
  }

  const turn = game.turn()
  const over = game.isGameOver()
  const message = game.isCheckmate()
    ? turn === 'w'
      ? t('მატი! შავმა მოიგო.', 'Checkmate! Black wins.')
      : t('მატი! თეთრმა მოიგო.', 'Checkmate! White wins.')
    : (drawText(game) ??
      (turn === 'w' ? caps(t('თეთრის სვლაა', 'White to move')) : caps(t('შავის სვლაა', 'Black to move'))))
  let check: Square | null = null
  if (game.inCheck()) for (const row of game.board()) for (const p of row) if (p && p.type === 'k' && p.color === turn) check = p.square
  const position: Position = {}
  for (const row of game.board()) for (const p of row) if (p) position[p.square] = { type: p.type, color: p.color }
  const last = at > 0 ? ([plies[at - 1].from, plies[at - 1].to] as [Square, Square]) : null

  return (
    <div className="play editor-play">
      <Board
        position={position}
        orientation={flip ? 'b' : 'w'}
        set={set}
        movable={over || promo ? null : turn}
        legalFrom={legalFrom}
        onMove={onMove}
        lastMove={last}
        anim={anim}
        check={check}
        promotion={
          promo
            ? {
                to: promo.to,
                color: turn,
                onPick: (p) => {
                  setPromo(null)
                  play(promo.from, promo.to, p)
                },
                onCancel: () => setPromo(null),
              }
            : null
        }
      />
      <aside className="panel">
        <div className={`message${game.isCheckmate() ? ' solved' : ''}`}>
          <span className={`turn-dot ${turn}`} />
          {message}
        </div>
        <MoveList sans={plies.map((p) => p.san)} at={at} blackFirst={setup.turn === 'b'} goTo={goTo} empty={t('ითამაშე ორივე მხრისთვის.', 'Play the moves for both sides.')} />
        <MoveNav at={at} end={plies.length} goTo={goTo} />
        <div className="ed-buttons">
          <button
            className="ghost-btn"
            disabled={plies.length === 0}
            onClick={() => {
              setPromo(null)
              setAnim(null)
              setPlies((p) => p.slice(0, -1))
              setAt(plies.length - 1)
            }}
          >
            {caps(t('სვლის გაუქმება', 'Take back'))}
          </button>
          <button className="ghost-btn icon-label" onClick={() => setFlip((f) => !f)}>
            <FlipIcon />
            {caps(t('შემობრუნება', 'Flip board'))}
          </button>
          <button className="ghost-btn wide" onClick={() => go(`editor?${toQuery(game.fen(), flip)}`)}>
            {caps(t('ამ პოზიციის შეცვლა', 'Edit this position'))}
          </button>
        </div>
      </aside>
    </div>
  )
}

/** An open hand: drag the pieces. */
function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v8M14 11.5V5.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1.2a7 7 0 0 1-5.6-2.8L3.4 15.5a1.6 1.6 0 0 1 2.5-2L8 15.5" />
    </svg>
  )
}

/** A bin: remove pieces. */
function EraseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 6.5h17M9 6.5V4h6v2.5M6 6.5l1 14h10l1-14M10 10.5v6M14 10.5v6" />
    </svg>
  )
}

/** Two curved arrows chasing each other: turn the board round. */
function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a8 8 0 0 1 14-5.3M20 13a8 8 0 0 1-14 5.3" />
      <path d="M18.5 2v4h-4M5.5 22v-4h4" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.8 5.8" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4" />
    </svg>
  )
}
