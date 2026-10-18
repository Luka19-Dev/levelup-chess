import { useEffect, useRef, useState } from 'react'
import { PuzzleRunner } from '../components/PuzzleRunner'
import type { Puzzle } from '../components/PuzzleRunner'
import type { SetId } from '../pieces/sets'
import { burst, bigCelebration } from '../lib/celebrate'
import { sfx } from '../lib/sound'
import { track } from '../lib/stats'
import { DIFFICULTY, RATING_MAX, select } from '../lib/bank'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'
import { MINUTES, challengeKey } from '../lib/challenge'
import type { Challenge } from '../lib/challenge'

const LIVES = 3
const POOL = 400

/** The rating band of a difficulty: from where it begins up to where the next begins. */
const band = (level: number) => ({ min: DIFFICULTY[level].from, max: DIFFICULTY[level + 1]?.from ?? RATING_MAX })

/** A shuffled draw from the band, then sorted by rating, so the run gets harder as it goes. */
async function pool(level: number): Promise<Puzzle[]> {
  const all = await select({ ...band(level), side: 'any', stage: 'any', piece: 'any' })
  return all.slice(0, POOL).sort((a, b) => a.rating - b.rating)
}

type Props = {
  set: SetId
  choice: Challenge
  bests: Record<string, number>
  onChoose: (c: Challenge) => void
  onFinish: (c: Challenge, score: number) => void
}

/** Time challenge: as many puzzles as you can before the clock runs out, three mistakes allowed. */
export function Sprint({ set, choice, bests, onChoose, onFinish }: Props) {
  const [phase, setPhase] = useState<'ready' | 'loading' | 'run' | 'over'>('ready')
  const [left, setLeft] = useState(choice.minutes * 60)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [at, setAt] = useState(0)
  // this run's puzzles so far: true solved, false missed
  const [marks, setMarks] = useState<boolean[]>([])
  const list = useRef<Puzzle[]>([])
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [ended, setEnded] = useState<'time' | 'lives' | 'out'>('time')
  const [lastRun, setLastRun] = useState<{ key: string; score: number } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => () => clearTimeout(advance.current), [])
  const best = bests[challengeKey(choice)] ?? 0

  useEffect(() => {
    if (phase !== 'run') return
    const timer = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [phase])

  // the ten-second warning
  useEffect(() => {
    if (phase === 'run' && left > 0 && left <= 10) sfx.tick(left)
  }, [left, phase])

  useEffect(() => {
    if (phase === 'run' && (left <= 0 || lives <= 0 || at >= list.current.length)) {
      clearTimeout(advance.current)
      setEnded(lives <= 0 ? 'lives' : at >= list.current.length ? 'out' : 'time')
      setLastRun({ key: challengeKey(choice), score })
      setPhase('over')
      track('challenges')
      onFinish(choice, score)
      if (score > best && score > 0) {
        bigCelebration()
        sfx.fanfare()
      }
    }
  }, [left, lives, at, phase, score, best, choice, onFinish])

  async function start() {
    clearTimeout(advance.current)
    setPhase('loading')
    setLoadFailed(false)
    try {
      list.current = await pool(choice.level)
    } catch {
      setLoadFailed(true)
      setPhase('ready')
      return
    }
    setScore(0)
    setLives(LIVES)
    setLeft(choice.minutes * 60)
    setAt(0)
    setMarks([])
    setPhase('run')
    sfx.start()
  }

  if (phase !== 'run') {
    const range = band(choice.level)
    return (
      <div className="level sprint-card">
        <h2>{caps(
            phase !== 'over'
              ? t('დროის გამოწვევა', 'Time challenge')
              : ended === 'lives'
                ? t('შეცდომები ამოიწურა!', 'Out of lives!')
                : ended === 'out'
                  ? t('ამოცანები ამოიწურა!', 'No puzzles left!')
                  : t('დრო ამოიწურა!', "Time's up!"),
          )}</h2>
        {phase === 'over' ? (
          <p className="big-score">
            {score} <small>{t('ამოხსნილი ამოცანა', 'puzzles solved')}</small>
          </p>
        ) : (
          <p>{t('ამოხსენი რაც შეიძლება მეტი ამოცანა, სანამ დრო ამოიწურება. სამი შეცდომა და გამოწვევა მთავრდება.', 'Solve as many puzzles as you can before time runs out. Three mistakes and the challenge is over.')}</p>
        )}
        <div className="choice center-choice">
          <span className="label">{caps(t('სირთულე', 'Difficulty'))}</span>
          <div className="chips">
            {DIFFICULTY.map((d, i) => (
              <button key={d.from} className={`chip${choice.level === i ? ' on' : ''}`} aria-pressed={choice.level === i} disabled={phase === 'loading'} onClick={() => onChoose({ ...choice, level: i })}>
                {caps(tr(d.name))}
              </button>
            ))}
          </div>
          <span className="muted small">
            {t('რეიტინგი', 'Rating')} {range.min}–{range.max}
          </span>
        </div>
        <div className="choice center-choice">
          <span className="label">{caps(t('დრო', 'Time'))}</span>
          <div className="chips">
            {MINUTES.map((m) => (
              <button key={m} className={`chip${choice.minutes === m ? ' on' : ''}`} aria-pressed={choice.minutes === m} disabled={phase === 'loading'} onClick={() => onChoose({ ...choice, minutes: m })}>
                {m} {caps(t('წუთი', 'minutes'))}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">
          {t('რეკორდი', 'Best')}: {Math.max(best, lastRun?.key === challengeKey(choice) ? lastRun.score : 0)}
        </p>
        {loadFailed && <p className="bad-text">{t('ამოცანები ვერ ჩაიტვირთა. სცადე ხელახლა.', 'The puzzles could not load. Try again.')}</p>}
        <button className="primary-btn" disabled={phase === 'loading'} onClick={start}>
          {phase === 'loading' ? t('იტვირთება…', 'Loading…') : caps(phase === 'over' ? t('კიდევ ერთხელ', 'Play again') : t('დაწყება', 'Start'))}
        </button>
      </div>
    )
  }

  const puzzle = list.current[at]
  const mm = Math.floor(Math.max(left, 0) / 60)
  const ss = String(Math.max(left, 0) % 60).padStart(2, '0')
  // the cards beside the board are laid out like the class battle's
  return (
    <div className="stage-page">
      <div className="battle-main">
        <div className="level">
          <PuzzleRunner
            key={puzzle.id}
            puzzle={puzzle}
            set={set}
            mode="sprint"
            onSolved={() => {
              burst()
              setScore((s) => s + 1)
              setMarks((m) => [...m, true])
              advance.current = setTimeout(() => setAt((i) => i + 1), 450)
            }}
            onFailed={() => {
              setLives((l) => l - 1)
              setMarks((m) => [...m, false])
              advance.current = setTimeout(() => setAt((i) => i + 1), 1100)
            }}
            top={
              <div className="sprint-bar">
                <span className={left <= 15 ? 'clock low' : 'clock'}>
                  {mm}:{ss}
                </span>
                <span className="score">{score}</span>
                <span className="lives" aria-label={`${t('დარჩენილი სიცოცხლე', 'Lives left')}: ${lives}`}>
                  {Array.from({ length: LIVES }, (_, i) => (
                    <span key={i} className={i < lives ? 'life' : 'life lost'}>
                      ♥
                    </span>
                  ))}
                </span>
              </div>
            }
          />
        </div>
      </div>
      <nav className="battle-side" aria-label={t('დროის გამოწვევა', 'Time challenge')}>
        <section className="side-card">
          <h3 className="side-title">
            <span aria-hidden="true">🏅</span>
            {caps(t('რეკორდები', 'Best scores'))}
          </h3>
          <table className="records">
            <thead>
              <tr>
                <th />
                {MINUTES.map((m) => (
                  <th key={m} scope="col">
                    {m} {t('წთ', 'min')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIFFICULTY.map((d, level) => (
                <tr key={d.from}>
                  <th scope="row">{tr(d.name)}</th>
                  {MINUTES.map((minutes) => (
                    <td key={minutes} className={level === choice.level && minutes === choice.minutes ? 'now' : undefined}>
                      {bests[challengeKey({ level, minutes })] ?? '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="side-card live-card">
          <h3 className="side-title">
            <span aria-hidden="true">⏱️</span>
            {caps(t('ეს გამოწვევა', 'This run'))}
          </h3>
          {marks.length ? (
            <ol className="run-marks">
              {marks.map((ok, i) => (
                <li key={i} className={ok ? 'ok' : 'bad'} aria-label={ok ? t('ამოხსნილი', 'Solved') : t('შეცდომა', 'Missed')}>
                  {ok ? '✓' : '✗'}
                </li>
              ))}
            </ol>
          ) : (
            <p className="side-empty">{t('ჯერ არცერთი ამოცანა', 'No puzzles yet')}</p>
          )}
        </section>
      </nav>
    </div>
  )
}
