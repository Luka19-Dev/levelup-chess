import { useState } from 'react'
import { SECTIONS } from '../data/learn'
import { Piece } from '../pieces/sets'
import type { SetId } from '../pieces/sets'
import { levelCount, nextStage, overall, solvedCount } from '../lib/progress'
import { caps } from '../lib/caps'
import { StageIcon, GameIcon } from '../components/StageIcon'
import { t, tr } from '../lib/i18n'

type Props = { set: SetId; learn: Record<string, number[]>; onReset: () => void; go: (hash: string) => void }

/** The learn overview, laid out like lichess's: a progress card beside the lesson cards. */
export function LearnMap({ set, learn, onReset, go }: Props) {
  const [confirm, setConfirm] = useState(false)
  const all = overall(learn)
  const next = nextStage(learn)
  return (
    <div className="learn-map">
      <aside className="learn-side">
        <div className="learn-emblem">
          <Piece set={set} color="w" type="k" />
        </div>
        <h1>{caps(t('ისწავლე ჭადრაკი', 'Learn chess'))}</h1>
        <p className="muted">{t('თამაშით, ეტაპობრივად', 'By playing, step by step')}</p>
        <div className="progress" role="progressbar" aria-valuenow={all.percent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${all.percent}%` }} />
          <b>
            {t('პროგრესი', 'Progress')}: {all.percent}%
          </b>
        </div>
        <p className="muted small">★ {all.stars}</p>
        {all.solved > 0 &&
          (confirm ? (
            <p className="small">
              {t('ნამდვილად წავშალოთ?', 'Are you sure?')}{' '}
              <button className="link-btn" onClick={() => (onReset(), setConfirm(false))}>
                {caps(t('დიახ', 'Yes'))}
              </button>{' '}
              <button className="link-btn" onClick={() => setConfirm(false)}>
                {caps(t('არა', 'No'))}
              </button>
            </p>
          ) : (
            <button className="link-btn small" onClick={() => setConfirm(true)}>
              {caps(t('პროგრესის წაშლა', 'Reset progress'))}
            </button>
          ))}
      </aside>
      <div className="learn-main">
        {SECTIONS.map((section) => (
          <section key={section.symbol} className="categ">
            <h2>
              <GameIcon name={section.symbol} className="group-symbol" />
              {caps(tr(section.title))}
            </h2>
            <div className="stage-grid">
              {section.stages.map((s) => {
                const solved = solvedCount(s, learn)
                const count = levelCount(s)
                const status = solved >= count ? 'done' : solved ? 'ongoing' : 'future'
                const ribbon = s === next ? (solved ? `${solved}/${count}` : caps(t('ითამაშე!', 'Play!'))) : status === 'ongoing' ? `${solved}/${count}` : null
                return (
                  <button key={s.key} className={`stage-card ${status}${s === next ? ' next' : ''}`} onClick={() => go(`learn/${s.key}`)}>
                    {ribbon && <span className="ribbon">{ribbon}</span>}
                    <span className="stage-icon">
                      <StageIcon stage={s} set={set} />
                    </span>
                    <span className="stage-text">
                      <span className="stage-title">{caps(tr(s.title))}</span>
                      <span className="stage-sub">{tr(s.subtitle)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
