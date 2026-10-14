import { useCallback, useEffect, useState } from 'react'
import { stageByKey } from './data/learn'
import type { Stage } from './data/learn'
import { load, save } from './lib/storage'
import type { Saved } from './lib/storage'
import { setSound } from './lib/sound'
import { overall } from './lib/progress'
import { Piece } from './pieces/sets'
import { GameIcon } from './components/StageIcon'
import { Picker } from './components/Picker'
import { PIECE_SETS, boardById, boardsInOrder } from './pieces/catalog'
import type { PieceType } from './pieces/sets'
import { LearnMap } from './screens/LearnMap'
import { StageScreen } from './screens/StageScreen'
import { Sprint } from './screens/Sprint'
import { challengeKey } from './lib/challenge'
import type { Challenge } from './lib/challenge'
import { PuzzlesPage } from './screens/PuzzlesPage'
import { PuzzlePlay } from './screens/PuzzlePlay'
import { fromQuery, toQuery } from './lib/bank'
import { caps } from './lib/caps'
import { setLang, t, tr } from './lib/i18n'

type Route =
  | { name: 'home' }
  | { name: 'learn' }
  | { name: 'stage'; stage: Stage; level?: number }
  | { name: 'sprint' }
  | { name: 'credits' }
  | { name: 'puzzles'; query: string }
  | { name: 'puzzlePlay'; query: string }

function readRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  if (h === 'sprint') return { name: 'sprint' }
  if (h === 'learn') return { name: 'learn' }
  if (h === 'credits') return { name: 'credits' }
  const pz = h.match(/^puzzles(\/play)?(?:\?(.*))?$/)
  if (pz) return { name: pz[1] ? 'puzzlePlay' : 'puzzles', query: pz[2] ?? '' }
  const m = h.match(/^learn\/(\w+)(?:\/(\d+))?$/)
  const stage = m && stageByKey(m[1])
  if (stage) return { name: 'stage', stage, level: m[2] ? Number(m[2]) - 1 : undefined }
  return { name: 'home' }
}

const go = (hash: string) => {
  location.hash = hash
}

export default function App() {
  const [saved, setSaved] = useState<Saved>(load)
  // Only the raw hash is state; the route is derived from it on every render, so a
  // hot-reloaded readRoute (or any new page) takes effect without a page reload.
  const [hash, setHash] = useState(location.hash)
  const route = readRoute(hash)
  const [settings, setSettings] = useState(false)
  // the language is set before anything renders, so every t() below reads it
  setLang(saved.lang)

  useEffect(() => {
    const on = () => {
      setHash(location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    save(saved)
    setSound(saved.sound)
    if (saved.theme) document.documentElement.dataset.theme = saved.theme
    else delete document.documentElement.dataset.theme
    // the board colours are two variables every square (and the piece plates) read
    const board = boardById(saved.board)
    document.documentElement.style.setProperty('--sq-light', board.light)
    document.documentElement.style.setProperty('--sq-dark', board.dark)
  }, [saved])

  const update = (patch: Partial<Saved>) => setSaved((s) => ({ ...s, ...patch }))

  const recordLevel = (stage: Stage, level: number, stars: number) =>
    setSaved((s) => {
      const list = [...(s.learn[stage.key] ?? [])]
      list[level] = Math.max(stars, list[level] ?? 0)
      return { ...s, learn: { ...s.learn, [stage.key]: list } }
    })

  const finishChallenge = useCallback((c: Challenge, score: number) => {
    setSaved((s) => {
      const key = challengeKey(c)
      return score > (s.challengeBests[key] ?? 0) ? { ...s, challengeBests: { ...s.challengeBests, [key]: score } } : s
    })
  }, [])

  // back goes one level up: a lesson to the learn overview, a puzzle run to its filters, everything else home
  const back = route.name === 'stage' ? 'learn' : route.name === 'puzzlePlay' ? `puzzles?${route.query}` : ''
  const title =
    route.name === 'learn'
      ? t('სწავლა', 'Learn')
      : route.name === 'sprint'
        ? t('დროის გამოწვევა', 'Time challenge')
        : route.name === 'stage'
          ? tr(route.stage.title)
          : route.name === 'credits'
            ? t('წყაროები', 'Sources')
            : route.name === 'puzzles' || route.name === 'puzzlePlay'
              ? t('ამოცანები', 'Puzzles')
              : ''

  return (
    <>
      {/* the header bar spans the whole window and stays pinned while the page scrolls, as on Lerno */}
      <div className="top-bar">
        <header className="top page-col">
          {route.name === 'home' ? (
            <span className="brand">{caps(t('ჭადრაკი', 'Chess'))}</span>
          ) : (
            <button className="back" onClick={() => go(back)}>
              ← {caps(back === 'learn' ? t('სწავლა', 'Learn') : back ? t('ამოცანები', 'Puzzles') : t('მთავარი', 'Home'))}
            </button>
          )}
          {title && <h1 className="level-title">{caps(title)}</h1>}
          <div className="top-actions">
            <ThemeSwitch theme={saved.theme} onChange={(theme) => update({ theme })} />
            <button
              className="ghost-switch"
              aria-label={t('ენის შეცვლა', 'Change language')}
              onClick={() => update({ lang: saved.lang === 'ka' ? 'en' : 'ka' })}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9.5" />
                <path d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z" />
              </svg>
              {saved.lang === 'ka' ? 'ქარ' : 'ENG'}
            </button>
            <button className="icon-btn" aria-label={t('პარამეტრები', 'Settings')} onClick={() => setSettings(true)}>
              ⚙
            </button>
          </div>
        </header>
      </div>

      <div className="app">
        <main>
          {route.name === 'home' && <Home saved={saved} />}
          {route.name === 'learn' && <LearnMap set={saved.set} learn={saved.learn} onReset={() => update({ learn: {} })} go={go} />}
          {route.name === 'stage' && (
            <StageScreen key={route.stage.key} stage={route.stage} level={route.level} set={saved.set} learn={saved.learn} onResult={recordLevel} go={go} />
          )}
          {route.name === 'sprint' && (
            <Sprint
              set={saved.set}
              choice={saved.challenge}
              bests={saved.challengeBests}
              onChoose={(c) => update({ challenge: c })}
              onFinish={finishChallenge}
            />
          )}
          {route.name === 'credits' && <Credits />}
          {route.name === 'puzzles' && (
            <PuzzlesPage
              filter={fromQuery(route.query, saved.puzzles)}
              set={saved.set}
              onChange={(f) => {
                // the filters live in the link; replace, so tweaking them does not fill the back history
                history.replaceState(null, '', `#puzzles?${toQuery(f)}`)
                setHash(location.hash)
                update({ puzzles: { ...f, theme: undefined } })
              }}
              go={go}
            />
          )}
          {route.name === 'puzzlePlay' && <PuzzlePlay key={route.query} filter={fromQuery(route.query, saved.puzzles)} set={saved.set} go={go} />}
        </main>

        {settings && (
          <div className="overlay" role="dialog" aria-modal="true" onClick={() => setSettings(false)}>
            <div className="card settings" onClick={(e) => e.stopPropagation()}>
              <h2>{caps(t('პარამეტრები', 'Settings'))}</h2>
              <MiniBoard set={saved.set} board={saved.board} />
              <p className="label">{caps(t('ფიგურები', 'Pieces'))}</p>
              <Picker
                label={t('ფიგურები', 'Pieces')}
                value={saved.set}
                onChange={(id) => update({ set: id })}
                options={PIECE_SETS.map((p) => ({
                  id: p.id,
                  label: tr(p.name),
                  preview: (
                    <span className="piece-strip">
                      {(['k', 'q', 'n'] as const).map((k) => (
                        <Piece key={k} set={p.id} color="w" type={k} />
                      ))}
                      <Piece set={p.id} color="b" type="r" />
                    </span>
                  ),
                }))}
              />
              <p className="label">{caps(t('დაფა', 'Board'))}</p>
              <Picker
                label={t('დაფა', 'Board')}
                value={saved.board}
                onChange={(id) => update({ board: id })}
                options={boardsInOrder(saved.lang).map((b) => ({
                  id: b.id,
                  label: tr(b.name),
                  preview: (
                    <span className="swatch" aria-hidden="true">
                      <span style={{ background: b.light }} />
                      <span style={{ background: b.dark }} />
                      <span style={{ background: b.dark }} />
                      <span style={{ background: b.light }} />
                    </span>
                  ),
                }))}
              />
              <label className="toggle">
                <input type="checkbox" checked={saved.sound} onChange={(e) => update({ sound: e.target.checked })} />
                {t('ხმა', 'Sound')}
              </label>
              <button
                className="link-btn"
                onClick={() => {
                  setSettings(false)
                  go('credits')
                }}
              >
                {caps(t('წყაროები და ლიცენზიები', 'Sources and licences'))}
              </button>
              <div className="row">
                <button className="primary-btn" onClick={() => setSettings(false)}>
                  {caps(t('დახურვა', 'Close'))}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/** Sun in dark mode, moon in light mode, as on Lerno; the first click overrides the system setting. */
function ThemeSwitch({ theme, onChange }: { theme?: 'light' | 'dark'; onChange: (t: 'light' | 'dark') => void }) {
  const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  return (
    <button className="ghost-switch" aria-label={t('ფერის რეჟიმის შეცვლა', 'Toggle dark mode')} onClick={() => onChange(dark ? 'light' : 'dark')}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
          </>
        ) : (
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        )}
      </svg>
    </button>
  )
}

/** A strip of board with both armies on it, showing the chosen pieces on the chosen colours. */
function MiniBoard({ set, board }: { set: string; board: string }) {
  const b = boardById(board)
  const rows: { color: 'w' | 'b'; pieces: PieceType[] }[] = [
    { color: 'b', pieces: ['r', 'n', 'b', 'q', 'k', 'p'] },
    { color: 'w', pieces: ['p', 'k', 'q', 'b', 'n', 'r'] },
  ]
  return (
    <div className="mini-board" aria-hidden="true">
      {rows.map((row, r) =>
        row.pieces.map((p, c) => (
          <span key={`${r}${c}`} style={{ background: (r + c) % 2 ? b.dark : b.light }}>
            <Piece set={set} color={row.color} type={p} />
          </span>
        )),
      )}
    </div>
  )
}

function Home({ saved }: { saved: Saved }) {
  const all = overall(saved.learn)
  return (
    <div className="home">
      <section className="hero">
        <h1>{caps(t('ისწავლე ჭადრაკი თამაშით', 'Learn chess by playing'))}</h1>
        <p>{t('გაიარე ეტაპები, შეაგროვე ვარსკვლავები და გახდი ჭადრაკის ოსტატი.', 'Work through the stages, collect stars and become a chess master.')}</p>
      </section>
      <section className="tiles">
        <button className="tile learn-tile" onClick={() => go('learn')}>
          <span className="tile-icon">
            <Piece set={saved.set} color="w" type="n" />
          </span>
          <span>
            <strong>{caps(t('სწავლა', 'Learn'))}</strong>
            <small>
              {caps(t('ფიგურებიდან ტაქტიკამდე.', 'From the pieces to tactics.'))} {all.percent}% · ★ {all.stars}
            </small>
          </span>
        </button>
        <button className="tile learn-tile" onClick={() => go('puzzles')}>
          <span className="tile-icon">
            <GameIcon name="group:tactics" className="piece-svg symbol tile-symbol" />
          </span>
          <span>
            <strong>{caps(t('ამოცანები', 'Puzzles'))}</strong>
            <small>{caps(t('ნამდვილი პარტიებიდან, შენი რეიტინგით.', 'From real games, at your rating.'))}</small>
          </span>
        </button>
        <button className="tile sprint-tile" onClick={() => go('sprint')}>
          <span className="tile-icon sprint-icon">⚡</span>
          <span>
            <strong>{caps(t('დროის გამოწვევა', 'Time challenge'))}</strong>
            <small>
              {caps(t('2, 5 ან 10 წუთი, ადვილიდან რთულამდე. რეკორდი:', '2, 5 or 10 minutes, easy to hard. Best:'))}{' '}
              {Math.max(0, ...Object.values(saved.challengeBests))}
            </small>
          </span>
        </button>
      </section>
      <footer className="foot">
        <p>
          {t('', 'A free social project by ')}
          <a href="https://lvlup.ge">LevelUp Georgia</a>
          {t('-ს სოციალური პროექტი. უფასოა.', '.')}
        </p>
      </footer>
    </div>
  )
}

/** Where the site's material comes from, and under which licence. Opened from the settings. */
function Credits() {
  return (
    <div className="credits">
      <ul>
        <li>
          {t('გაკვეთილები: ', 'Lessons: ')}
          <a href="https://lichess.org/learn">lichess.org</a>
          {t('-ის სასწავლო ეტაპები (AGPL), ჩვენი ტექსტებით.', ' learn stages (AGPL), with our own texts.')}
        </li>
        <li>
          {t('ამოცანები: ', 'Puzzles: ')}
          <a href="https://database.lichess.org">lichess.org</a>
          {t('-ის ღია ბაზა.', ' open puzzle database.')}
        </li>
        <li>
          {t('ხმები: lichess.org-ის თავისუფალი SFX ნაკრები (Enigmahack, AGPL).', 'Sounds: lichess.org free SFX set (Enigmahack, AGPL).')}
        </li>
        <li>
          {t('საიტის კოდი ღიაა (AGPL): ', 'The site is open source (AGPL): ')}
          <a href="https://github.com/Luka19-Dev/levelup-chess">github.com/Luka19-Dev/levelup-chess</a>
        </li>
        <li>
          {t('სიმბოლოები: ', 'Symbols: ')}
          <a href="https://game-icons.net">game-icons.net</a> (Lorc, Delapouite, Skoll), CC BY 3.0.
        </li>
        <li>
          {t('ფიგურების ნაკრებები', 'Piece sets')}:
          <ul>
            {PIECE_SETS.filter((p) => p.author).map((p) => (
              <li key={p.id}>
                {tr(p.name)}: {p.author}, {p.license}
                {p.id !== 'classic' && t(' (lichess.org-დან)', ' (via lichess.org)')}
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  )
}
