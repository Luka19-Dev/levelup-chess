import type { SetId } from '../pieces/sets'
import type { Stage } from '../data/learn'
import { caps } from '../lib/caps'
import { StageIcon } from './StageIcon'
import { t, tr } from '../lib/i18n'
import type { Txt } from '../lib/i18n'

// both languages are kept, so switching language mid-lesson re-words the box instead of freezing it
export type GoalState = { kind: 'goal'; text: Txt } | { kind: 'success'; stars: number } | { kind: 'fail'; text: Txt }

export const PRAISE = [{ ka: '', en: '' }, { ka: 'გამოვიდა!', en: 'Done!' }, { ka: 'კარგია!', en: 'Good!' }, { ka: 'შესანიშნავია!', en: 'Excellent!' }]

/** The top of a lesson's side panel: the stage header, the current goal and the level tabs. */
export function LessonPanel(props: { stage: Stage; set: SetId; goal: GoalState; index: number; count: number; results: number[]; onPick: (i: number) => void; go?: (hash: string) => void }) {
  const { stage, set, goal, index, count, results, onPick, go } = props
  // a piece stage and its extra set: a switch between the two above the level tabs
  const main = stage.parent ?? stage
  const sets = main.extra && go ? [main, main.extra] : []
  return (
    <>
      <div className="panel-head">
        <span className="panel-icon">
          <StageIcon stage={stage} set={set} />
        </span>
        <span>
          <h2>{caps(tr(stage.title))}</h2>
          <p>{tr(stage.subtitle)}</p>
        </span>
      </div>
      <div className={`goal ${goal.kind}`} aria-live="polite">
        {goal.kind === 'success' ? (
          <>
            <strong>{tr(PRAISE[goal.stars])}</strong>
            <span className="goal-stars">
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= goal.stars ? 'on' : ''}>
                  ★
                </span>
              ))}
            </span>
          </>
        ) : (
          tr(goal.text)
        )}
      </div>
      {sets.length > 0 && (
        <div className="set-switch" role="group">
          {sets.map((s, i) => (
            <button key={s.key} className={s === stage ? 'now' : ''} aria-pressed={s === stage} onClick={() => s !== stage && go!(`learn/${s.key}`)}>
              {caps(i ? t('დამატებითი', 'Extra') : t('გაკვეთილები', 'Lessons'))}
              <span className="set-count">{s.levels!.length}</span>
            </button>
          ))}
        </div>
      )}
      {/* at most 10 a row: a 20-puzzle stage gets two rows */}
      <div className={count > 20 ? 'tabs many' : 'tabs'} role="tablist" style={{ gridTemplateColumns: `repeat(${Math.min(count, 10)}, 1fr)` }}>
        {Array.from({ length: count }, (_, i) => {
          const got = results[i] ?? 0
          return (
            <button key={i} role="tab" aria-selected={i === index} aria-label={`${t('დონე', 'Level')} ${i + 1}${got ? ` · ${got} ★` : ''}`} className={`tab${i === index ? ' now' : ''}${got ? ' done' : ''}`} onClick={() => onPick(i)}>
              {got && i !== index ? <span className="tab-stars">{'★'.repeat(got)}</span> : i + 1}
            </button>
          )
        })}
      </div>
    </>
  )
}
