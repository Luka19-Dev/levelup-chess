import { useEffect, useState } from 'react'
import { AutoNextSwitch, PuzzleRunner } from '../components/PuzzleRunner'
import type { Puzzle } from '../components/PuzzleRunner'
import { GameIcon, SkipIcon } from '../components/StageIcon'
import { PRAISE } from '../components/LessonPanel'
import type { GoalState } from '../components/LessonPanel'
import { PIECE_NAME } from '../pieces/sets'
import type { SetId } from '../pieces/sets'
import { THEME_NAMES, select, toQuery } from '../lib/bank'
import type { Filter } from '../lib/bank'
import { burst } from '../lib/celebrate'
import { track } from '../lib/stats'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'
import { SIDES, STAGES } from './PuzzlesPage'

/** how an earlier puzzle went, for the list beside the board */
type Result = 'clean' | 'helped' | 'skipped'

type Props = { filter: Filter; set: SetId; autoNext: boolean; onAutoNext: (on: boolean) => void; go: (hash: string) => void }

/** Plays the puzzles a filter selects, one after another. */
export function PuzzlePlay({ filter, set, autoNext, onAutoNext, go }: Props) {
  const [list, setList] = useState<Puzzle[] | null>(null)
  const [failed, setFailed] = useState(false)
  // `at` is the next new puzzle; `open` an earlier one reopened from the list
  const [at, setAt] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const [goal, setGoal] = useState<GoalState>({ kind: 'goal', text: { ka: '', en: '' } })
  // by position in the list: how each puzzle played so far went
  const [log, setLog] = useState<Record<number, Result>>({})

  // keyed on the filter's text, not the object: App builds a fresh object on every render
  // (opening the settings, switching theme), and a fresh shuffle would swap the puzzle mid-solve
  const query = toQuery(filter)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setFailed(false)
    select(filter).then(
      (l) => live && setList(l),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, attempt])

  const shown = open ?? at
  /** Next or Skip: a reopened puzzle goes back to where the run had got to. */
  function next() {
    setLog((l) => (l[shown] ? l : { ...l, [shown]: 'skipped' }))
    setGoal({ kind: 'goal', text: { ka: '', en: '' } })
    if (open !== null) setOpen(null)
    else setAt((i) => i + 1)
  }
  function reopen(i: number) {
    // the puzzle on the board already: keep it as it is (a solved one keeps its Next)
    if (i === shown) return
    setGoal({ kind: 'goal', text: { ka: '', en: '' } })
    setOpen(i === at ? null : i)
  }
  // with the switch on, a solved puzzle moves on after a moment (also when switched on after solving)
  const solved = goal.kind === 'success'
  useEffect(() => {
    if (!solved || !autoNext) return
    const timer = setTimeout(next, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, autoNext, shown])

  if (failed)
    return (
      <div className="sprint-card level">
        <p>{t('ამოცანები ვერ ჩაიტვირთა. შეამოწმე ინტერნეტი.', 'The puzzles could not load. Check the connection.')}</p>
        <button className="primary-btn" onClick={() => setAttempt((n) => n + 1)}>
          {caps(t('ხელახლა', 'Try again'))}
        </button>
      </div>
    )
  if (!list) return <p className="muted center">{t('იტვირთება…', 'Loading…')}</p>
  if (!list.length || (open === null && at >= list.length))
    return (
      <div className="sprint-card level">
        <h2>{caps(list.length ? t('ყველა ამოცანა ამოხსნილია!', 'All puzzles solved!') : t('ამოცანები ვერ მოიძებნა', 'No puzzles found'))}</h2>
        <button className="primary-btn" onClick={() => go('puzzles')}>
          {caps(t('ფილტრები', 'Filters'))}
        </button>
      </div>
    )

  const puzzle = list[shown]
  const results = Object.values(log)
  const clean = results.filter((r) => r === 'clean').length
  const helped = results.filter((r) => r === 'helped').length
  const title = filter.theme ? tr(THEME_NAMES[filter.theme]) : t('ამოცანები', 'Puzzles')
  const tallyText = (
    <>
      <span>
        {t('უშეცდომოდ', 'Clean')}: {clean}
      </span>
      <span>
        {t('დახმარებით', 'With help')}: {helped}
      </span>
    </>
  )
  const panel = (
    <>
      {/* on a phone the title box and the tally share one row above the board */}
      <div className="head-row">
      <div className="panel-head">
        <span className="panel-icon">
          <GameIcon name={filter.theme ? `theme:${filter.theme}` : 'group:tactics'} />
        </span>
        <span>
          <h2>{caps(title)}</h2>
          <p>
            {t('რეიტინგი', 'Rating')}: {puzzle.rating} · {shown + 1} / {list.length}
          </p>
        </span>
      </div>
      <p className="head-tally muted">{tallyText}</p>
      </div>
      {goal.kind === 'success' && (
        <div className="goal success under" aria-live="polite">
          <strong>{tr(PRAISE[goal.stars])}</strong>
        </div>
      )}
    </>
  )

  // the cards beside the board are laid out like the class battle's
  return (
    <div className="stage-page">
      <div className="battle-main">
        <div className="level">
          <PuzzleRunner
            key={puzzle.id}
            puzzle={puzzle}
            set={set}
            mode="learn"
            top={panel}
            onSolved={({ mistakes, hints }) => {
              const slips = mistakes + hints
              const stars = slips === 0 ? 3 : slips === 1 ? 2 : 1
              burst()
              track('puzzles')
              setGoal({ kind: 'success', stars })
              // a reopened puzzle keeps its best result
              setLog((l) => ({ ...l, [shown]: l[shown] === 'clean' || !slips ? 'clean' : 'helped' }))
            }}
            bottom={<span className="muted tally">{tallyText}</span>}
            actions={
              // a solved puzzle stays on the board until the class moves on (the teacher's ask)
              <button className={`${goal.kind === 'success' ? 'primary-btn next-btn' : 'ghost-btn'} icon-label`} onClick={next}>
                <SkipIcon />
                {caps(goal.kind === 'success' ? t('შემდეგი', 'Next') : t('გამოტოვება', 'Skip'))}
              </button>
            }
            footer={<AutoNextSwitch on={autoNext} onChange={onAutoNext} />}
          />
        </div>
      </div>
      <nav className="battle-side" aria-label={t('ამოცანები', 'Puzzles')}>
        <FilterCard filter={filter} onChange={() => go(`puzzles?${query}`)} />
        <section className="side-card live-card">
          <h3 className="side-title">
            <span aria-hidden="true">🕘</span>
            {caps(t('ისტორია', 'History'))}
          </h3>
          {/* newest first, the one being played included */}
          <ol className="side-list history-list">
            {Array.from({ length: Math.min(at + 1, list.length) }, (_, i) => i)
              .reverse()
              .map((i) => (
                <li key={list[i].id} className={i === shown ? 'now' : undefined} aria-current={i === shown ? 'true' : undefined}>
                  <button onClick={() => reopen(i)}>
                    <Mark result={log[i]} />
                    <span className="player-name">
                      {t('ამოცანა', 'Puzzle')} {i + 1}
                    </span>
                    <small>{list[i].rating}</small>
                  </button>
                </li>
              ))}
          </ol>
        </section>
      </nav>
    </div>
  )
}

/** green tick = clean, orange tick = with help, grey arrows = skipped, ▶ = not played yet */
function Mark({ result }: { result?: Result }) {
  const label =
    result === 'clean' ? t('უშეცდომოდ', 'Clean') : result === 'helped' ? t('დახმარებით', 'With help') : result === 'skipped' ? t('გამოტოვებული', 'Skipped') : t('ახლა', 'Now')
  return (
    <span className={`place mark ${result ?? 'open'}`} role="img" aria-label={label} title={label}>
      {result === 'skipped' ? '»' : result ? '✓' : '▶'}
    </span>
  )
}

/** What the puzzles on the board were picked by, with a way back to change it. */
function FilterCard({ filter, onChange }: { filter: Filter; onChange: () => void }) {
  const rows: [string, string][] = [[t('რეიტინგი', 'Rating'), `${filter.min}–${filter.max}`]]
  if (filter.theme) rows.push([t('თემა', 'Theme'), tr(THEME_NAMES[filter.theme])])
  else
    rows.push(
      [t('ფერი', 'Side'), tr(SIDES.find((s) => s.v === filter.side)!.name)],
      [t('ეტაპი', 'Stage'), tr(STAGES.find((s) => s.v === filter.stage)!.name)],
      [t('ფიგურა', 'Piece'), filter.piece === 'any' ? t('ყველა', 'All') : tr(PIECE_NAME[filter.piece])],
    )
  return (
    <section className="side-card">
      <h3 className="side-title">
        <span aria-hidden="true">⚙️</span>
        {caps(t('ფილტრები', 'Filters'))}
      </h3>
      <dl className="filter-rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="side-foot">
        <button className="ghost-btn" onClick={onChange}>
          {caps(t('შეცვლა', 'Change'))}
        </button>
      </div>
    </section>
  )
}
