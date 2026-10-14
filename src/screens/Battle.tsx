import { useEffect, useState } from 'react'
import { PuzzleRunner } from '../components/PuzzleRunner'
import { GameIcon, SkipIcon } from '../components/StageIcon'
import type { SetId } from '../pieces/sets'
import { THEME_NAMES, count, loadIndex, select } from '../lib/bank'
import type { Filter } from '../lib/bank'
import { MAX_PER, MAX_PLAYERS, SOLUTION_AFTER, fmtScore, loadBattle, points, saveBattle, standings, total } from '../lib/battle'
import type { Game, Lobby } from '../lib/battle'
import { bigCelebration, burst } from '../lib/celebrate'
import { sfx } from '../lib/sound'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'
import { Chip, Choice, FilterFields } from './PuzzlesPage'
import type { Index } from './PuzzlesPage'

/** Class battle: a lobby of names, then each player in turn solves their puzzles on this one device. */
export function Battle({ set }: { set: SetId }) {
  const [stored, setStored] = useState(loadBattle)
  useEffect(() => saveBattle(stored), [stored])
  const { lobby, game } = stored
  const setGame = (g: Game | null) => setStored((s) => ({ ...s, game: g }))

  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  async function start(l: Lobby) {
    setLoading(true)
    setFailed(false)
    try {
      const list = await select(l.filter)
      // the count came from the index; if the puzzle files disagree, say so instead of starting a broken game
      if (list.length < l.players.length * l.per) throw new Error('too few puzzles')
      const puzzles = l.players.map((_, i) => list.slice(i * l.per, (i + 1) * l.per))
      setStored({ lobby: l, game: { ...l, puzzles, scores: l.players.map(() => []), turn: 0, at: 0, phase: 'handoff' } })
      window.scrollTo(0, 0)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  if (!game) return <LobbyForm lobby={lobby} set={set} loading={loading} failed={failed} onChange={(l) => setStored((s) => ({ ...s, lobby: l }))} onStart={start} />
  // ended before anyone played: there is nothing to rank, so straight back to the lobby
  const end = () => setGame(standings(game).length ? { ...game, phase: 'done' } : null)
  if (game.phase === 'done') return <Results game={game} loading={loading} failed={failed} onAgain={() => start(lobby)} onNew={() => setGame(null)} />
  // the players' list stands beside the board, as lichess's practice list does (below it on a narrow screen)
  return (
    <div className="stage-page battle-page">
      <div className="battle-main">
        {game.phase === 'handoff' ? (
          <Handoff game={game} onGo={() => setGame({ ...game, phase: 'play' })} onEnd={end} />
        ) : (
          <Turn key={`${game.turn}-${game.at}`} game={game} set={set} onChange={setGame} />
        )}
      </div>
      <BattleSide game={game} />
    </div>
  )
}

/**
 * Two lists: on top the players whose turn is over, best first (re-sorted as each one finishes);
 * below, the queue: the player at the board highlighted first, then everyone still to come, in order.
 */
function BattleSide({ game }: { game: Game }) {
  const done = standings(game, game.turn)
  // the player who just finished flashes in the table while the next one gets ready
  // by position, not name: two players may share a name
  const fresh = game.phase === 'handoff' && game.turn > 0 ? game.turn - 1 : null
  const queue = game.players.map((name, i) => ({ name, i })).slice(game.turn)
  return (
    <nav className="battle-side" aria-label={t('მოთამაშეები', 'Players')}>
      {/* two separate cards built alike, the table above the queue */}
      <section className="side-card">
        <h3 className="side-title">
          <span aria-hidden="true">🏆</span>
          {caps(t('ცხრილი', 'Standings'))}
        </h3>
        {done.length ? (
          <ol className="side-list table-list">
            {done.map((r) => (
              <li key={r.i} className={r.i === fresh ? 'fresh' : undefined}>
                <span className="place">{r.place <= 3 ? MEDALS[r.place - 1] : r.place}</span>
                <span className="player-name">{r.name}</span>
                <strong>{fmtScore(r.score)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="side-empty">{t('ჯერ არავის დაუმთავრებია', 'Nobody has finished yet')}</p>
        )}
      </section>
      <section className="side-card">
        <h3 className="side-title">
          <span aria-hidden="true">⏳</span>
          {caps(t('რიგი', 'Queue'))}
        </h3>
        <ol className="side-list queue-list">
          {queue.map(({ name, i }) => (
            <li key={i} className={i === game.turn ? 'now' : undefined} aria-current={i === game.turn ? 'true' : undefined}>
              <span className="place">{i === game.turn ? '▶' : i + 1}</span>
              <span className="player-name">{name}</span>
              {i === game.turn && game.phase === 'play' && (
                <small>
                  {Math.min(game.at + 1, game.per)}/{game.per} · {fmtScore(total(game.scores[i]))}
                </small>
              )}
            </li>
          ))}
        </ol>
      </section>
    </nav>
  )
}

function LobbyForm(props: { lobby: Lobby; set: SetId; loading: boolean; failed: boolean; onChange: (l: Lobby) => void; onStart: (l: Lobby) => void }) {
  const { lobby, set, loading, failed, onChange, onStart } = props
  const [name, setName] = useState('')
  const [index, setIndex] = useState<Index | null>(null)
  useEffect(() => {
    loadIndex().then(setIndex, () => setIndex(null))
  }, [])

  const { players, per, filter } = lobby
  const full = players.length >= MAX_PLAYERS
  const add = () => {
    const n = name.trim()
    if (!n || full) return
    onChange({ ...lobby, players: [...players, n] })
    setName('')
  }
  const need = players.length * per
  const have = index ? count(index, filter) : null
  const enough = have !== null && have >= need
  // picking a side, stage or piece leaves the theme; the rating range is kept either way
  const setFilter = (f: Filter) =>
    onChange({ ...lobby, filter: f.side !== filter.side || f.stage !== filter.stage || f.piece !== filter.piece ? { ...f, theme: undefined } : f })

  return (
    <div className="battle-lobby">
      <section className="filter-card">
        <div className="choice">
          <span className="label">
            {caps(t('მოთამაშეები რიგითობით', 'Players, in order'))} · {players.length} / {MAX_PLAYERS}
          </span>
          <form
            className="name-row"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <input
              value={name}
              maxLength={24}
              disabled={full}
              placeholder={full ? t('მაქსიმუმ 30 მოთამაშე', 'At most 30 players') : t('მოთამაშის სახელი', "Player's name")}
              aria-label={t('მოთამაშის სახელი', "Player's name")}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="primary-btn" type="submit" disabled={!name.trim() || full}>
              {caps(t('დამატება', 'Add'))}
            </button>
          </form>
          {players.length > 0 && (
            <ol className="player-list">
              {players.map((p, i) => (
                <li key={i}>
                  <span className="player-no">{i + 1}</span>
                  <span className="player-name">{p}</span>
                  <button
                    className="icon-btn"
                    aria-label={t(`წაშალე ${p}`, `Remove ${p}`)}
                    onClick={() => onChange({ ...lobby, players: players.filter((_, j) => j !== i) })}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="choice">
          <span className="label">{caps(t('ამოცანა თითოეულისთვის', 'Puzzles each'))}</span>
          <div className="stepper">
            <button className="icon-btn" aria-label={t('ნაკლები', 'Fewer')} disabled={per <= 1} onClick={() => onChange({ ...lobby, per: per - 1 })}>
              −
            </button>
            <strong>{per}</strong>
            <button className="icon-btn" aria-label={t('მეტი', 'More')} disabled={per >= MAX_PER} onClick={() => onChange({ ...lobby, per: per + 1 })}>
              +
            </button>
          </div>
        </div>

        <div className={filter.theme ? 'themed' : undefined}>
          <FilterFields filter={filter} set={set} index={index} onChange={setFilter} />
        </div>
        <Choice label={t('თემა', 'Theme')}>
          <Chip on={!filter.theme} onClick={() => onChange({ ...lobby, filter: { ...filter, theme: undefined } })}>
            <GameIcon name="stage:mix" className="chip-symbol" />
            {caps(t('ნებისმიერი', 'Any'))}
          </Chip>
          {Object.entries(THEME_NAMES).map(([key, n]) => (
            <Chip
              key={key}
              on={filter.theme === key}
              disabled={index !== null && count(index, { ...filter, theme: key }) < Math.max(need, 1)}
              onClick={() => onChange({ ...lobby, filter: { ...filter, theme: key } })}
            >
              <GameIcon name={`theme:${key}`} className="chip-symbol" />
              {caps(tr(n))}
            </Chip>
          ))}
        </Choice>

        <div className="start-row">
          <span className={`match${have !== null && !enough ? ' bad-text' : ''}`}>
            {players.length < 2
              ? t('დაამატე მინიმუმ 2 მოთამაშე', 'Add at least 2 players')
              : have === null
                ? '…'
                : enough
                  ? t(`სულ ${need} ამოცანა`, `${need} puzzles in all`)
                  : t('ამ ფილტრებით საკმარისი ამოცანა არ არის', 'Not enough puzzles with these filters')}
          </span>
          <button className="primary-btn" disabled={players.length < 2 || !enough || loading} onClick={() => onStart(lobby)}>
            {caps(t('დაწყება', 'Start'))}
          </button>
        </div>
        {failed && <p className="bad-text">{t('ამოცანები ვერ ჩაიტვირთა. შეამოწმე ინტერნეტი.', 'The puzzles could not load. Check the connection.')}</p>}
      </section>
    </div>
  )
}

/** Between turns: whose turn it is, and the table so far. */
function Handoff({ game, onGo, onEnd }: { game: Game; onGo: () => void; onEnd: () => void }) {
  // ending is for good, so it takes a second tap
  const [sure, setSure] = useState(false)
  return (
    <div className="sprint-card level battle-card">
      <p className="muted">
        {t('მოთამაშე', 'Player')} {game.turn + 1} / {game.players.length}
      </p>
      <h2>{caps(t('ახლა თამაშობს', 'Now playing'))}</h2>
      <p className="battle-name">{game.players[game.turn]}</p>
      <p className="muted">{t(`${game.per} ამოცანა`, `${game.per} ${game.per === 1 ? 'puzzle' : 'puzzles'}`)}</p>
      <button className="primary-btn wide" onClick={onGo}>
        {caps(t('დაწყება', 'Start'))}
      </button>
      {sure ? (
        <div className="confirm-row">
          <span className="bad-text">{t('დავასრულოთ შეჯიბრი?', 'End the battle now?')}</span>
          <button className="ghost-btn" onClick={() => setSure(false)}>
            {caps(t('არა', 'No'))}
          </button>
          <button className="ghost-btn danger" onClick={onEnd}>
            {caps(t('დიახ, დასრულება', 'Yes, end it'))}
          </button>
        </div>
      ) : (
        <button className="ghost-btn" onClick={() => setSure(true)}>
          {caps(t('შეჯიბრის დასრულება', 'End the battle'))}
        </button>
      )}
    </div>
  )
}

/** One puzzle of the current player's turn. */
function Turn({ game, set, onChange }: { game: Game; set: SetId; onChange: (g: Game) => void }) {
  const name = game.players[game.turn]
  const mine = game.scores[game.turn]
  const slips = game.slips ?? { mistakes: 0, hints: 0 }
  const [earned, setEarned] = useState<number | null>(null)
  const [hinted, setHinted] = useState(slips.hints > 0)
  const lastOfTurn = game.at + 1 >= game.per
  const lastPlayer = game.turn + 1 >= game.players.length

  function record(p: number) {
    setEarned(p)
    const scores = game.scores.map((s, i) => (i === game.turn ? [...s.slice(0, game.at), p] : s))
    onChange({ ...game, scores })
  }
  function next() {
    const moved = { ...game, slips: undefined }
    if (!lastOfTurn) onChange({ ...moved, at: game.at + 1 })
    else if (!lastPlayer) onChange({ ...moved, turn: game.turn + 1, at: 0, phase: 'handoff' })
    else onChange({ ...moved, phase: 'done' })
  }
  // a reload after a puzzle was scored must not open it again for a second try: move on
  useEffect(() => {
    if (mine[game.at] !== undefined) next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="level">
      <PuzzleRunner
        puzzle={game.puzzles[game.turn][game.at]}
        set={set}
        mode="learn"
        solutionAfter={SOLUTION_AFTER}
        // wrong moves and hints are saved as they happen, so a reload carries them over
        start={slips}
        onMistake={() => onChange({ ...game, slips: { ...slips, mistakes: slips.mistakes + 1 } })}
        onSolved={(r) => {
          const p = points(r)
          if (p > 0) burst()
          record(p)
        }}
        onRevealed={() => record(0)}
        onHint={() => {
          setHinted(true)
          onChange({ ...game, slips: { ...slips, hints: slips.hints + 1 } })
        }}
        top={
          <>
            <div className="panel-head">
              <span className="panel-icon battle-icon" aria-hidden="true">
                🏆
              </span>
              <span>
                <h2>{name}</h2>
                <p>
                  {t('ამოცანა', 'Puzzle')}: {game.at + 1} / {game.per}
                </p>
                <p>
                  {t('ქულა', 'Points')}: {fmtScore(total(mine))}
                </p>
                {hinted && earned === null && (
                  <p className="hint-used">
                    <HintBulb />
                    {t('მინიშნება გამოყენებულია', 'Hint used')}
                  </p>
                )}
              </span>
            </div>
            {earned !== null && (
              <div className={`goal under ${earned > 0 ? 'success' : 'fail'}`} aria-live="polite">
                <strong>+{fmtScore(earned)}</strong> {t('ქულა', earned === 1 ? 'point' : 'points')}
              </div>
            )}
          </>
        }
        bottom={
          <span className="muted">
            {t('მოთამაშე', 'Player')} {game.turn + 1} / {game.players.length}
          </span>
        }
        actions={
          earned !== null && (
            <button className="primary-btn icon-label" onClick={next}>
              <SkipIcon />
              {caps(!lastOfTurn ? t('შემდეგი', 'Next') : lastPlayer ? t('შედეგები', 'Results') : t('შემდეგი მოთამაშე', 'Next player'))}
            </button>
          )
        }
      />
    </div>
  )
}

function Results({ game, loading, failed, onAgain, onNew }: { game: Game; loading: boolean; failed: boolean; onAgain: () => void; onNew: () => void }) {
  const table = standings(game)
  useEffect(() => {
    bigCelebration()
    sfx.fanfare()
  }, [])
  return (
    <div className="sprint-card level battle-card">
      <h2>{caps(t('შედეგები', 'Results'))}</h2>
      <Table rows={table} medals />
      <button className="primary-btn wide" disabled={loading} onClick={onAgain}>
        {caps(t('ისევ ითამაშეთ', 'Play again'))}
      </button>
      {failed && <p className="bad-text">{t('ამოცანები ვერ ჩაიტვირთა. შეამოწმე ინტერნეტი.', 'The puzzles could not load. Check the connection.')}</p>}
      <button className="ghost-btn" onClick={onNew}>
        {caps(t('ახალი შეჯიბრი', 'New battle'))}
      </button>
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

/** The lit bulb of the hint button, small. */
function HintBulb() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 6.5a4.5 4.5 0 0 0-2.7 8.1c.5.4.8 1 .8 1.6v.8h3.8v-.8c0-.6.3-1.2.8-1.6A4.5 4.5 0 0 0 12 6.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.4 20.2h3.2M12 1.8v2.2M5.4 4.4l1.5 1.5M18.6 4.4l-1.5 1.5M2.8 11h2.1M19.1 11h2.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function Table({ rows, medals = false }: { rows: ReturnType<typeof standings>; medals?: boolean }) {
  return (
    <ol className="standings">
      {rows.map((r, i) => (
        <li key={i} className={medals && r.place <= 3 ? 'podium' : undefined}>
          <span className="place">{medals && r.place <= 3 ? MEDALS[r.place - 1] : r.place}</span>
          <span className="player-name">{r.name}</span>
          <strong>{fmtScore(r.score)}</strong>
        </li>
      ))}
    </ol>
  )
}
