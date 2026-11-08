import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Square as CSquare } from 'chess.js'
import { Board } from '../components/Board'
import type { Position, Square } from '../components/Board'
import { MoveNav } from '../components/MoveNav'
import { MoveList } from '../components/MoveList'
import { Piece } from '../pieces/sets'
import type { Color, PieceType, SetId } from '../pieces/sets'
import { BOTS, botById } from '../data/bots'
import type { Bot } from '../data/bots'
import { engineMove, stopEngine } from '../lib/engine'
import { setLeaveGuard } from '../lib/leave'
import { drawText } from '../lib/gameEnd'
import { sfx } from '../lib/sound'
import { bigCelebration } from '../lib/celebrate'
import { caps } from '../lib/caps'
import { t } from '../lib/i18n'

// The last level, side and difficulty picked, the best stars won per level, and one game in
// progress, in this browser only.
const KEY = 'kai-chess:bots'
type Side = 'w' | 'b' | 'random'
/** the difficulty, in stars: 1 = take backs without limit, 2 = three take backs, 3 = none */
type Mode = 1 | 2 | 3
type Game = {
  bot: number
  color: Color
  mode: Mode
  sans: string[]
  undos: number
  /** the bot's move, kept the moment it is chosen: a reload cannot make it choose again */
  next?: { ply: number; uci: string }
  /** the browser tab playing it: a game opened in a second tab belongs to that tab */
  tab?: string
}
type Store = { bot: number; side: Side; mode: Mode; stars: Record<number, number>; game?: Game }

/** How many take backs a difficulty allows. */
const UNDOS: Record<Mode, number> = { 1: Infinity, 2: 3, 3: 0 }
const isMode = (m: unknown): m is Mode => m === 1 || m === 2 || m === 3
/** this page's own id, to tell its saves from another tab's */
const TAB = Math.random().toString(36).slice(2)

/** The moves that replay legally from the start; anything after a bad one is dropped. */
function legalPrefix(sans: unknown[]): string[] {
  const c = new Chess()
  const out: string[] = []
  for (const s of sans) {
    if (typeof s !== 'string') break
    try {
      c.move(s)
    } catch {
      break
    }
    out.push(s)
  }
  return out
}

function loadStore(): Store {
  const empty: Store = { bot: 1, side: 'w', mode: 1, stars: {} }
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!s) return empty
    return {
      bot: botById(s.bot) ? s.bot : 1,
      side: s.side === 'b' || s.side === 'random' ? s.side : 'w',
      mode: isMode(s.mode) ? s.mode : 1,
      stars: s.stars && typeof s.stars === 'object' ? s.stars : {},
      game:
        s.game && botById(s.game.bot) && Array.isArray(s.game.sans) && (s.game.color === 'w' || s.game.color === 'b') && isMode(s.game.mode)
          ? {
              bot: s.game.bot,
              color: s.game.color,
              mode: s.game.mode,
              sans: legalPrefix(s.game.sans),
              undos: Math.max(0, Number(s.game.undos) || 0),
              next: s.game.next && typeof s.game.next.uci === 'string' && Number.isInteger(s.game.next.ply) ? s.game.next : undefined,
              tab: typeof s.game.tab === 'string' ? s.game.tab : undefined,
            }
          : undefined,
    }
  } catch {
    return empty
  }
}
function saveStore(patch: Partial<Store>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadStore(), ...patch }))
  } catch {
    /* storage blocked: the game just is not remembered */
  }
}

const levelName = (bot: Bot) => t(`დონე ${bot.id}`, `Level ${bot.id}`)

/** The level's number in a round badge; the top two wear gold. */
function LevelBadge({ bot }: { bot: Bot }) {
  return (
    <span className={`bot-avatar${bot.id >= 7 ? ' master' : ''}`} aria-hidden="true">
      {bot.id}
    </span>
  )
}

/** Pick a bot and a side. */
export function BotPicker({ set, go }: { set: SetId; go: (hash: string) => void }) {
  const [store, setStore] = useState(loadStore)
  const update = (patch: Partial<Store>) => {
    saveStore(patch)
    setStore((s) => ({ ...s, ...patch }))
  }
  const running = store.game && store.game.sans.length > 0 && botById(store.game.bot)

  function start() {
    const color: Color = store.side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : store.side
    update({ game: undefined })
    go(`bots/play?bot=${store.bot}&color=${color}&stars=${store.mode}`)
  }

  return (
    <div className="bots-page">
      {running && store.game && (
        <div className="bot-resume">
          <LevelBadge bot={running} />
          <span>{t(`დაუმთავრებელი პარტია: ${levelName(running)}`, `Unfinished game: ${levelName(running)}`)}</span>
          <button className="primary-btn" onClick={() => go(`bots/play?bot=${running.id}&color=${store.game!.color}&stars=${store.game!.mode}`)}>
            {caps(t('გაგრძელება', 'Continue'))}
          </button>
        </div>
      )}
      <div className="bot-levels">
        <span className="label">{caps(t('დონე', 'Level'))}</span>
        <div className="level-row" role="group" aria-label={t('დონე', 'Level')}>
          {BOTS.map((b) => (
            <button
              key={b.id}
              className={`level-btn${store.bot === b.id ? ' on' : ''}`}
              aria-pressed={store.bot === b.id}
              aria-label={`${levelName(b)}, ≈ ${b.rating}, ★ ${store.stars[b.id] ?? 0}/3`}
              onClick={() => update({ bot: b.id })}
            >
              <strong>{b.id}</strong>
              <span className="bot-rating">≈ {b.rating}</span>
              <Stars n={store.stars[b.id] ?? 0} />
            </button>
          ))}
        </div>
        <p className="ed-tip">{t('1 ყველაზე ადვილია, 8 ყველაზე რთული. ვარსკვლავები გვიჩვენებს, რა სირთულით მოიგე დონე.', '1 is the easiest, 8 the hardest. The stars show the difficulty you have beaten a level on.')}</p>
      </div>
      <div className="bot-levels">
        <span className="label">{caps(t('სირთულე', 'Difficulty'))}</span>
        <div className="mode-row" role="group" aria-label={t('სირთულე', 'Difficulty')}>
          {([1, 2, 3] as const).map((m) => (
            <button key={m} className={`level-btn mode-btn${store.mode === m ? ' on' : ''}`} aria-pressed={store.mode === m} onClick={() => update({ mode: m })}>
              <Stars n={m} of={m} />
              <span>{modeText(m)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bot-levels">
        <span className="label">{caps(t('ფიგურების ფერი', 'Your pieces'))}</span>
        <div className="chips">
          {(['w', 'random', 'b'] as const).map((s) => (
            <button key={s} className={`chip${store.side === s ? ' on' : ''}`} aria-pressed={store.side === s} onClick={() => update({ side: s })}>
              {s === 'random' ? (
                <span className="chip-pieces half-king">
                  <Piece set={set} color="w" type="k" />
                  <Piece set={set} color="b" type="k" />
                </span>
              ) : (
                <span className="chip-pieces">
                  <Piece set={set} color={s} type="k" />
                </span>
              )}
              {caps(s === 'w' ? t('თეთრი', 'White') : s === 'b' ? t('შავი', 'Black') : t('შემთხვევითი', 'Random'))}
            </button>
          ))}
        </div>
      </div>
      {/* only the start button is pinned to the bottom of the screen, so it never covers the choices */}
      <div className="bot-start">
        <button className="primary-btn play-from" onClick={start}>
          {caps(t(`ითამაშე: ${levelName(botById(store.bot)!)}`, `Play ${levelName(botById(store.bot)!)}`))}
        </button>
      </div>
    </div>
  )
}

/** What a difficulty allows, in words. */
const modeText = (m: Mode) =>
  m === 1 ? t('სვლის გაუქმება ულიმიტოდ', 'Unlimited take backs') : m === 2 ? t('3 სვლის გაუქმება', '3 take backs') : t('სვლის გაუქმების გარეშე', 'No take backs')

/** `n` gold stars out of `of`, the rest grey. */
function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="bot-stars" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? 'won' : ''}>
          ★
        </span>
      ))}
    </span>
  )
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A game against one bot: the player's side at the bottom, take back, resign. */
export function BotGame({ query, set, go }: { query: string; set: SetId; go: (hash: string) => void }) {
  const q = new URLSearchParams(query)
  const bot = botById(Number(q.get('bot'))) ?? BOTS[0]
  const me: Color = q.get('color') === 'b' ? 'b' : 'w'
  const starsParam = Number(q.get('stars'))
  const mode: Mode = isMode(starsParam) ? starsParam : 1
  // a game left unfinished with this level, side and difficulty carries on, take backs used and all
  const [resume] = useState(() => {
    const g = loadStore().game
    return g && g.bot === bot.id && g.color === me && g.mode === mode ? g : null
  })
  const [sans, setSans] = useState<string[]>(resume?.sans ?? [])
  const [undos, setUndos] = useState(resume?.undos ?? 0)
  const [leaving, setLeaving] = useState<(() => void) | null>(null)
  const [at, setAt] = useState(sans.length)
  const [resigned, setResigned] = useState(false)
  const [asking, setAsking] = useState(false)
  const [failed, setFailed] = useState(false)
  // the same game opened in another tab: this one stops, so it cannot be used to try moves out
  const [taken, setTaken] = useState(false)
  const [anim, setAnim] = useState<{ from: Square; to: Square; key: number } | null>(null)
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null)
  const animKey = useRef(1)

  // the live game, and the position on show (earlier while looking back)
  const full = useMemo(() => {
    const c = new Chess()
    for (const s of sans) {
      try {
        c.move(s)
      } catch {
        break
      }
    }
    return c
  }, [sans])
  const plies = useMemo(() => full.history({ verbose: true }), [full])
  const shown = useMemo(() => {
    if (at >= plies.length) return full
    const c = new Chess()
    for (const s of sans.slice(0, at)) c.move(s)
    return c
  }, [full, plies, sans, at])

  const over = full.isGameOver() || resigned
  const live = at === plies.length
  const botTurn = !over && !taken && full.turn() !== me
  // my moves so far: take back needs at least one, and the difficulty's allowance
  const mine = me === 'w' ? Math.ceil(sans.length / 2) : Math.floor(sans.length / 2)
  const sameGame = (g?: Game): g is Game => !!g && g.bot === bot.id && g.color === me && g.mode === mode

  // remembered while it runs; a finished game is forgotten, a won one keeps its stars (the best per level).
  // A new game is first saved with its first move, so merely opening a link never wipes an unfinished one.
  useEffect(() => {
    if (taken) return
    if (!over) {
      const g = loadStore().game
      if (sans.length || sameGame(g))
        saveStore({ game: { bot: bot.id, color: me, mode, sans, undos, tab: TAB, next: sameGame(g) && g.next?.ply === sans.length ? g.next : undefined } })
      return
    }
    const s = loadStore()
    const won = !resigned && full.isCheckmate() && full.turn() !== me
    saveStore({ game: undefined, stars: won ? { ...s.stars, [bot.id]: Math.max(mode, s.stars[bot.id] ?? 0) } : s.stars })
    if (won) {
      sfx.fanfare()
      bigCelebration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, sans, undos, resigned, full, bot.id, me, mode, taken])

  // another tab saving this game (opening it there saves it at once) takes it over
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return
      const g = loadStore().game
      if (sameGame(g) && g.tab && g.tab !== TAB) {
        stopEngine()
        setTaken(true)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  })

  // a game under way (I have moved) asks before it is left, by the back button in the header or the browser's
  const begun = mine > 0 && !over && !taken
  useEffect(() => {
    if (!begun) return
    setLeaveGuard({ hash: location.hash, ask: (proceed) => setLeaving(() => proceed) })
    return () => setLeaveGuard(null)
  }, [begun])

  function add(fen: string, from: Square, to: Square, promotion?: string) {
    const c = new Chess(fen)
    const m = c.move({ from: from as CSquare, to: to as CSquare, promotion })
    sfx.play({
      capture: !!m.captured,
      castle: m.flags.includes('k') || m.flags.includes('q'),
      promotion: !!m.promotion,
      check: c.inCheck(),
      mate: c.isCheckmate(),
      opponent: m.color !== me,
    })
    setSans((s) => [...s, m.san])
    // a move always brings the board back to the live game
    setAt(plies.length + 1)
    setAnim({ from, to, key: animKey.current++ })
  }

  // the bot's turn: it thinks (at least a moment, so its move can be seen coming) and plays
  useEffect(() => {
    if (!botTurn) return
    let alive = true
    const fen = full.fen()
    const t0 = Date.now()
    const ply = sans.length
    void (async () => {
      let uci = ''
      const moves = full.moves({ verbose: true })
      const kept = loadStore().game
      if (sameGame(kept) && kept.next?.ply === ply && moves.some((m) => m.from + m.to + (m.promotion ?? '') === kept.next!.uci)) uci = kept.next.uci
      else if (Math.random() < bot.random) {
        const m = moves[Math.floor(Math.random() * moves.length)]
        uci = m.from + m.to + (m.promotion ?? '')
      } else {
        try {
          uci = await engineMove(fen, bot.think)
        } catch {
          if (alive) setFailed(true)
          return
        }
      }
      if (!alive || !uci) return
      // kept at once, before the pause: reloading now brings back the same move
      const g = loadStore().game
      if (sameGame(g) && g.sans.length === ply) saveStore({ game: { ...g, next: { ply, uci } } })
      const wait = 500 + Math.random() * 400 - (Date.now() - t0)
      if (wait > 0) await sleep(wait)
      if (!alive) return
      add(fen, uci.slice(0, 2), uci.slice(2, 4), uci[4])
    })()
    return () => {
      alive = false
      stopEngine()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, full])

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

  const legalFrom = (from: Square) => full.moves({ square: from as CSquare, verbose: true }).map((m) => m.to)
  function onMove(from: Square, to: Square) {
    const piece = full.get(from as CSquare)
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) setPromo({ from, to })
    else add(full.fen(), from, to)
  }

  const undosLeft = UNDOS[mode] - undos
  const canUndo = mine > 0 && undosLeft > 0
  function takeBack() {
    if (!canUndo) return
    setUndos((n) => n + 1)
    // back to my turn, before my last move: the bot's reply goes too, unless it is still thinking
    const k = full.turn() === me ? 2 : 1
    setPromo(null)
    setAnim(null)
    setResigned(false)
    setAsking(false)
    setSans((s) => s.slice(0, Math.max(0, s.length - k)))
    setAt(Math.max(0, sans.length - k))
  }
  function newGame() {
    saveStore({ game: undefined })
    setSans([])
    setUndos(0)
    setAt(0)
    setResigned(false)
    setAsking(false)
    setAnim(null)
    setPromo(null)
  }

  const name = t('კომპიუტერი', 'The computer')
  const turn = shown.turn()
  const message = resigned
    ? t(`დანებდი. ${name} იგებს.`, `You resigned. ${name} wins.`)
    : full.isCheckmate()
      ? full.turn() === me
        ? t(`მატი. ${name} იგებს.`, `Checkmate. ${name} wins.`)
        : t('მატი! შენ მოიგე!', 'Checkmate! You win!')
      : (drawText(full) ??
        (taken
          ? t('ეს პარტია სხვა ჩანართში გაიხსნა. იქ გააგრძელე.', 'This game was opened in another tab. Carry on there.')
          : failed
          ? t('კომპიუტერი ვერ ჩაიტვირთა. განაახლე გვერდი.', 'The computer could not load. Refresh the page.')
          : botTurn
            ? t(`${name} ფიქრობს...`, `${name} is thinking...`)
            : caps(t('შენი სვლაა', 'Your move'))))
  const won = !resigned && full.isCheckmate() && full.turn() !== me

  let check: Square | null = null
  if (shown.inCheck()) for (const row of shown.board()) for (const p of row) if (p && p.type === 'k' && p.color === turn) check = p.square
  const position: Position = {}
  for (const row of shown.board()) for (const p of row) if (p) position[p.square] = { type: p.type, color: p.color }
  const last = at > 0 ? ([plies[at - 1].from, plies[at - 1].to] as [Square, Square]) : null

  return (
    <div className="play bot-play">
      <Board
        position={position}
        orientation={me}
        set={set}
        movable={live && !over && !taken && !botTurn && !promo ? me : null}
        legalFrom={legalFrom}
        onMove={onMove}
        lastMove={last}
        anim={anim}
        check={check}
        promotion={
          promo
            ? {
                to: promo.to,
                color: me,
                onPick: (p: PieceType) => {
                  setPromo(null)
                  add(full.fen(), promo.from, promo.to, p)
                },
                onCancel: () => setPromo(null),
              }
            : null
        }
      />
      <aside className="panel">
        <div className="bot-head">
          <LevelBadge bot={bot} />
          <span className="bot-text">
            <strong>{caps(levelName(bot))}</strong>
            <span className="bot-rating">≈ {bot.rating}</span>
          </span>
          <span className="bot-mode" title={modeText(mode)}>
            <Stars n={mode} of={mode} />
            <small>{modeText(mode)}</small>
          </span>
        </div>
        <div className={`message${won ? ' solved' : over ? ' failed' : ''}${botTurn ? ' thinking' : ''}`}>
          <span className={`turn-dot ${over ? me : full.turn()}`} />
          {message}
        </div>
        <MoveList sans={sans} at={at} blackFirst={false} goTo={goTo} empty={me === 'w' ? t('შენ იწყებ.', 'You go first.') : t(`${name} იწყებს.`, `${name} goes first.`)} />
        <MoveNav at={at} end={plies.length} goTo={goTo} />
        {over ? (
          <div className="ed-buttons">
            <button className="primary-btn wide" onClick={newGame}>
              {caps(t('ახალი პარტია', 'New game'))}
            </button>
            {/* after a loss or a draw a take back (if any are left) plays on from before the last move */}
            {mode !== 3 && (
              <button className="ghost-btn undo-btn" disabled={!canUndo || resigned || won} onClick={takeBack}>
                {undoLabel(undosLeft)}
              </button>
            )}
            <button className={`ghost-btn${mode === 3 ? ' wide' : ''}`} onClick={() => go('bots')}>
              {caps(t('სხვა დონე', 'Another level'))}
            </button>
          </div>
        ) : asking ? (
          <div className="ed-buttons">
            <p className="ed-tip wide">{t('ნამდვილად ნებდები?', 'Do you really resign?')}</p>
            <button
              className="ghost-btn"
              onClick={() => {
                stopEngine()
                setResigned(true)
                setAsking(false)
              }}
            >
              {caps(t('დიახ, ვნებდები', 'Yes, resign'))}
            </button>
            <button className="primary-btn" onClick={() => setAsking(false)}>
              {caps(t('ვაგრძელებ', 'Keep playing'))}
            </button>
          </div>
        ) : (
          <div className="ed-buttons">
            {mode !== 3 && (
              <button className="ghost-btn undo-btn" disabled={!canUndo || taken} onClick={takeBack}>
                {undoLabel(undosLeft)}
              </button>
            )}
            <button className={`ghost-btn${mode === 3 ? ' wide' : ''}`} disabled={mine === 0 || taken} onClick={() => setAsking(true)}>
              {caps(t('დანებება', 'Resign'))}
            </button>
          </div>
        )}
      </aside>
      {leaving && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setLeaving(null)}>
          <div className="card quit-card" onClick={(e) => e.stopPropagation()}>
            <h2>{caps(t('ნამდვილად გინდა თამაშის დატოვება?', 'Do you really want to quit?'))}</h2>
            <p>{t('პარტია დასრულდება და არ შეინახება.', 'The game will end and will not be saved.')}</p>
            <div className="row">
              <button
                className="ghost-btn"
                onClick={() => {
                  const proceed = leaving
                  stopEngine()
                  setLeaveGuard(null)
                  saveStore({ game: undefined })
                  setLeaving(null)
                  proceed()
                }}
              >
                {caps(t('დატოვება', 'Quit'))}
              </button>
              <button className="primary-btn" autoFocus onClick={() => setLeaving(null)}>
                {caps(t('გაგრძელება', 'Keep playing'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** The take back button's label: how many are left, when there is a limit. */
const undoLabel = (left: number) =>
  Number.isFinite(left) ? `${caps(t('სვლის გაუქმება', 'Take back'))} (${left})` : caps(t('სვლის გაუქმება', 'Take back'))
