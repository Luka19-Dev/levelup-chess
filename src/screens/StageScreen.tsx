import { useEffect, useState } from 'react'
import { SECTIONS, STAGES } from '../data/learn'
import type { Stage } from '../data/learn'
import { LessonPlay } from '../components/LessonPlay'
import { LessonPanel } from '../components/LessonPanel'
import type { GoalState } from '../components/LessonPanel'
import { PuzzleRunner } from '../components/PuzzleRunner'
import type { Puzzle } from '../components/PuzzleRunner'
import type { SetId } from '../pieces/sets'
import { levelCount, solvedCount, starsOf } from '../lib/progress'
import { bigCelebration, burst } from '../lib/celebrate'
import { sfx } from '../lib/sound'
import { caps } from '../lib/caps'
import puzzles from '../data/puzzles.json'
import { StageIcon, GameIcon, SkipIcon } from '../components/StageIcon'
import { t, tr } from '../lib/i18n'

const PUZZLES = puzzles.levels as Record<string, Puzzle[]>

type Props = {
  stage: Stage
  /** 0-based level to open, or undefined to resume at the first unsolved one */
  level?: number
  set: SetId
  learn: Record<string, number[]>
  onResult: (stage: Stage, level: number, stars: number) => void
  go: (hash: string) => void
}

export function StageScreen({ stage, level, set, learn, onResult, go }: Props) {
  const results = learn[stage.key] ?? []
  const count = levelCount(stage)
  const firstOpen = Math.max(0, Array.from({ length: count }, (_, i) => i).find((i) => !results[i]) ?? 0)
  // fixed when the stage opens: a solved puzzle saves at once, and must not then hop the screen to the next unsolved one
  const [resumeAt] = useState(firstOpen)
  // clamped both ways: a hand-typed link like #learn/rook/0 must not open level -1
  const index = Math.max(0, Math.min(level ?? resumeAt, count - 1))
  // the intro card shows when a stage is opened at its start, as on lichess
  const [intro, setIntro] = useState(level === undefined && !results.some(Boolean))
  const [finished, setFinished] = useState(false)
  const [puzzleGoal, setPuzzleGoal] = useState<GoalState>({ kind: 'goal', text: stage.intro })
  // any change of level (tabs, menu, browser back) clears the last puzzle's result
  useEffect(() => {
    setPuzzleGoal({ kind: 'goal', text: stage.intro })
  }, [index, stage])

  const open = (i: number) => {
    setFinished(false)
    go(`learn/${stage.key}/${i + 1}`)
  }

  function done(stars: number) {
    onResult(stage, index, stars)
    advance()
  }

  function advance() {
    if (index + 1 < count) open(index + 1)
    else {
      setFinished(true)
      bigCelebration()
      sfx.fanfare()
    }
  }

  const panel = (goal: GoalState) => <LessonPanel stage={stage} set={set} goal={goal} index={index} count={count} results={results} onPick={open} />
  const nextStage = STAGES[STAGES.indexOf(stage) + 1]
  const total = starsOf(stage, learn)

  return (
    <div className="stage-page">
      <StageMenu current={stage} set={set} learn={learn} go={go} />
      <div className="stage-main">
        {stage.levels ? (
          <LessonPlay key={`${stage.key}-${index}`} level={stage.levels[index]} set={set} panel={panel} onDone={done} />
        ) : (
          <PuzzleRunner
            key={`${stage.key}-${index}`}
            puzzle={PUZZLES[stage.puzzles!][index]}
            set={set}
            mode="learn"
            top={panel(puzzleGoal)}
            onSolved={({ mistakes, hints }) => {
              const slips = mistakes + hints
              const stars = slips === 0 ? 3 : slips === 1 ? 2 : 1
              burst()
              // saved now, but the board stays until Next, so the whole class can see the answer
              onResult(stage, index, stars)
              setPuzzleGoal({ kind: 'success', stars })
            }}
            actions={
              puzzleGoal.kind === 'success' && (
                <button className="primary-btn icon-label" onClick={advance}>
                  <SkipIcon />
                  {caps(t('შემდეგი', 'Next'))}
                </button>
              )
            }
          />
        )}
      </div>

      {intro && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="card stage-card-modal">
            <h2>
              {caps(`${t('ეტაპი', 'Stage')} ${STAGES.indexOf(stage) + 1}: ${tr(stage.title)}`)}
            </h2>
            <div className="modal-piece">
              <StageIcon stage={stage} set={set} />
            </div>
            <p>{tr(stage.intro)}</p>
            <button className="primary-btn wide" onClick={() => setIntro(false)}>
              {caps(t('დავიწყოთ!', "Let's go!"))}
            </button>
          </div>
        </div>
      )}

      {finished && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="card stage-card-modal">
            <h2>{caps(t('ეტაპი დასრულდა!', 'Stage complete!'))}</h2>
            <div className="modal-piece">
              <StageIcon stage={stage} set={set} />
            </div>
            <p>
              {t(`შენ შეაგროვე ${total} ვარსკვლავი ${count * 3}-დან.`, `You collected ${total} of ${count * 3} stars.`)}
            </p>
            <div className="row">
              <button className="ghost-btn" onClick={() => go('learn')}>
                {caps(t('მენიუ', 'Menu'))}
              </button>
              {nextStage && (
                <button className="primary-btn" onClick={() => go(`learn/${nextStage.key}`)}>
                  {caps(t('შემდეგი ეტაპი', 'Next stage'))}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** The lesson list on the left: sections, with the current one opened up. */
function StageMenu({ current, set, learn, go }: { current: Stage; set: SetId; learn: Record<string, number[]>; go: (h: string) => void }) {
  const active = SECTIONS.find((s) => s.stages.includes(current))
  return (
    <nav className="stage-menu" aria-label={t('ეტაპები', 'Stages')}>
      <button className="menu-back" onClick={() => go('learn')}>
        ← {caps(t('მენიუ', 'Menu'))}
      </button>
      {SECTIONS.map((section) => (
        <div key={section.symbol} className={section === active ? 'menu-section open' : 'menu-section'}>
          <button className="menu-title" onClick={() => go(`learn/${section.stages[0].key}`)}>
            <GameIcon name={section.symbol} className="group-symbol" />
            {caps(tr(section.title))}
          </button>
          {section === active &&
            section.stages.map((s) => {
              const solved = solvedCount(s, learn)
              const state = s === current ? 'now' : solved >= levelCount(s) ? 'done' : solved ? 'ongoing' : 'future'
              return (
                <button key={s.key} className={`menu-stage ${state}`} onClick={() => go(`learn/${s.key}`)}>
                  <span className="menu-icon">
                    <StageIcon stage={s} set={set} />
                  </span>
                  {tr(s.title)}
                </button>
              )
            })}
        </div>
      ))}
    </nav>
  )
}
