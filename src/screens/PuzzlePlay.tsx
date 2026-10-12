import { useEffect, useRef, useState } from 'react'
import { PuzzleRunner } from '../components/PuzzleRunner'
import type { Puzzle } from '../components/PuzzleRunner'
import { GameIcon } from '../components/StageIcon'
import { PRAISE } from '../components/LessonPanel'
import type { GoalState } from '../components/LessonPanel'
import type { SetId } from '../pieces/sets'
import { THEME_NAMES, select, toQuery } from '../lib/bank'
import type { Filter } from '../lib/bank'
import { burst } from '../lib/celebrate'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'


/** Plays the puzzles a filter selects, one after another. */
export function PuzzlePlay({ filter, set, go }: { filter: Filter; set: SetId; go: (hash: string) => void }) {
  const [list, setList] = useState<Puzzle[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [at, setAt] = useState(0)
  const [goal, setGoal] = useState<GoalState>({ kind: 'goal', text: '' })
  const [tally, setTally] = useState({ clean: 0, helped: 0 })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
      clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, attempt])

  function next() {
    clearTimeout(timer.current)
    setGoal({ kind: 'goal', text: '' })
    setAt((i) => i + 1)
  }

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
  if (!list.length || at >= list.length)
    return (
      <div className="sprint-card level">
        <h2>{caps(list.length ? t('ყველა ამოცანა ამოხსნილია!', 'All puzzles solved!') : t('ამოცანები ვერ მოიძებნა', 'No puzzles found'))}</h2>
        <button className="primary-btn" onClick={() => go('puzzles')}>
          {caps(t('ფილტრები', 'Filters'))}
        </button>
      </div>
    )

  const puzzle = list[at]
  const title = filter.theme ? tr(THEME_NAMES[filter.theme]) : t('ამოცანები', 'Puzzles')
  const panel = (
    <>
      <div className="panel-head">
        <span className="panel-icon">
          <GameIcon name={filter.theme ? `theme:${filter.theme}` : 'group:tactics'} />
        </span>
        <span>
          <h2>{caps(title)}</h2>
          <p>
            {t('რეიტინგი', 'Rating')}: {puzzle.rating} · {at + 1} / {list.length}
          </p>
        </span>
      </div>
      {goal.kind === 'success' && (
        <div className="goal success" aria-live="polite">
          <strong>{tr(PRAISE[goal.stars])}</strong>
        </div>
      )}
    </>
  )

  return (
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
          setGoal({ kind: 'success', stars })
          setTally((x) => (slips ? { ...x, helped: x.helped + 1 } : { ...x, clean: x.clean + 1 }))
          timer.current = setTimeout(next, 1500)
        }}
        bottom={
          <div className="controls">
            <span className="muted">
              {t('უშეცდომოდ', 'Clean')}: {tally.clean} · {t('დახმარებით', 'With help')}: {tally.helped}
            </span>
            <button className="ghost-btn" onClick={next}>
              {caps(goal.kind === 'success' ? t('შემდეგი', 'Next') : t('გამოტოვება', 'Skip'))} →
            </button>
          </div>
        }
      />
    </div>
  )
}
