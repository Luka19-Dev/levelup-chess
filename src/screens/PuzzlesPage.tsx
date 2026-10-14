import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PIECE_NAME, Piece } from '../pieces/sets'
import type { PieceType, SetId } from '../pieces/sets'
import { GameIcon } from '../components/StageIcon'
import { DIFFICULTY, RATING_MAX, RATING_MIN, THEME_NAMES, count, difficulty, loadIndex, toQuery } from '../lib/bank'
import type { Filter } from '../lib/bank'
import { caps } from '../lib/caps'
import { t, tr } from '../lib/i18n'
import type { Txt } from '../lib/i18n'

export type Index = Awaited<ReturnType<typeof loadIndex>>
type Props = { filter: Filter; set: SetId; onChange: (f: Filter) => void; go: (hash: string) => void }

const SIDES: { v: Filter['side']; name: Txt }[] = [
  { v: 'any', name: { ka: 'ორივე', en: 'Both' } },
  { v: 'w', name: { ka: 'თეთრები', en: 'White' } },
  { v: 'b', name: { ka: 'შავები', en: 'Black' } },
]
const STAGES: { v: Filter['stage']; icon: string; name: Txt }[] = [
  { v: 'any', icon: 'stage:mix', name: { ka: 'ყველა', en: 'All' } },
  { v: '0', icon: 'stage:opening', name: { ka: 'დებიუტი', en: 'Opening' } },
  { v: '1', icon: 'stage:middlegame', name: { ka: 'შუა თამაში', en: 'Middlegame' } },
  { v: '2', icon: 'stage:endgame', name: { ka: 'ენდშპილი', en: 'Endgame' } },
]
const PIECES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k']
const fmt = (n: number) => n.toLocaleString('en-US')
/** the slider handle's width in px; must match .range input thumbs in index.css */
const THUMB = 22

/** Choose puzzles: one rating range for everything, then stackable filters or a single theme. */
export function PuzzlesPage({ filter, set, onChange, go }: Props) {
  const [index, setIndex] = useState<Index | null>(null)
  useEffect(() => {
    loadIndex().then(setIndex, () => setIndex(null))
  }, [])

  const mixed: Filter = { ...filter, theme: undefined }
  const n = index ? count(index, mixed) : null
  const puzzles = (k: number) => `${fmt(k)} ${t('ამოცანა', k === 1 ? 'puzzle' : 'puzzles')}`

  return (
    <div className="puzzles-page">
      <section className="filter-card">
        <FilterFields filter={filter} set={set} index={index} onChange={onChange} />
        <div className="start-row">
          <span className="match">{n === null ? '…' : puzzles(n)}</span>
          <button className="primary-btn" disabled={!n} onClick={() => go(`puzzles/play?${toQuery(mixed)}`)}>
            {caps(t('დაწყება', 'Start'))}
          </button>
        </div>
      </section>

      <section className="categ">
        <h2>
          <GameIcon name="group:tactics" className="group-symbol" />
          {caps(t('თემები', 'Themes'))}
        </h2>
        <div className="stage-grid">
          {Object.entries(THEME_NAMES).map(([key, name]) => {
            const c = index ? count(index, { ...filter, theme: key }) : 0
            return (
              <button key={key} className="stage-card" disabled={!c} onClick={() => go(`puzzles/play?${toQuery({ ...filter, theme: key })}`)}>
                <span className="stage-icon">
                  <GameIcon name={`theme:${key}`} />
                </span>
                <span className="stage-text">
                  <span className="stage-title">{caps(tr(name))}</span>
                  <span className="stage-sub">{puzzles(c)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/** The rating slider and the side, game stage and winning piece choices; shared with the class battle lobby. */
export function FilterFields({ filter, set, index, onChange }: { filter: Filter; set: SetId; index: Index | null; onChange: (f: Filter) => void }) {
  const mixed: Filter = { ...filter, theme: undefined }
  const empty = (patch: Partial<Filter>) => index !== null && count(index, { ...mixed, ...patch }) === 0
  return (
    <>
      <RatingRange filter={filter} onChange={onChange} />
      <Choice label={t('ფერი', 'Side')}>
        {SIDES.map(({ v, name }) => (
          <Chip key={v} on={filter.side === v} disabled={empty({ side: v })} onClick={() => onChange({ ...filter, side: v })}>
            <span className="chip-pieces">
              {v !== 'b' && <Piece set={set} color="w" type="k" />}
              {v !== 'w' && <Piece set={set} color="b" type="k" />}
            </span>
            {caps(tr(name))}
          </Chip>
        ))}
      </Choice>
      <Choice label={t('პარტიის ეტაპი', 'Game stage')}>
        {STAGES.map(({ v, icon, name }) => (
          <Chip key={v} on={filter.stage === v} disabled={empty({ stage: v })} onClick={() => onChange({ ...filter, stage: v })}>
            <GameIcon name={icon} className="chip-symbol" />
            {caps(tr(name))}
          </Chip>
        ))}
      </Choice>
      <Choice label={t('ფიგურა, რომელიც იგებს', 'The piece that wins')}>
        <Chip on={filter.piece === 'any'} onClick={() => onChange({ ...filter, piece: 'any' })}>
          <GameIcon name="stage:mix" className="chip-symbol" />
          {caps(t('ყველა', 'All'))}
        </Chip>
        {PIECES.map((p) => (
          <Chip key={p} on={filter.piece === p} disabled={empty({ piece: p })} onClick={() => onChange({ ...filter, piece: p })}>
            <span className="chip-pieces">
              <Piece set={set} color="w" type={p} />
            </span>
            {caps(tr(PIECE_NAME[p]))}
          </Chip>
        ))}
      </Choice>
    </>
  )
}

/** A two-handled slider over ratings, in steps of 100, with dots where easy, medium and hard begin. */
function RatingRange({ filter, onChange }: { filter: Filter; onChange: (f: Filter) => void }) {
  // A native slider stops each handle half a handle short of the track's ends, so the
  // fill, dots and labels use the same inset to line up with where the handles really sit.
  const at = (v: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${(v - RATING_MIN) / (RATING_MAX - RATING_MIN)})`
  const fromRight = (v: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${(RATING_MAX - v) / (RATING_MAX - RATING_MIN)})`
  return (
    <div className="rating">
      <div className="rating-head">
        <span className="label">{caps(t('რეიტინგი', 'Rating'))}</span>
        <strong>
          {filter.min} – {filter.max}
        </strong>
        <span className="muted">{tr(difficulty(filter))}</span>
      </div>
      <div className="range">
        <span className="range-fill" style={{ left: at(filter.min), right: fromRight(filter.max) }} />
        {DIFFICULTY.map((d) => (
          <span key={d.from} className={`range-dot${d.from >= filter.min && d.from <= filter.max ? ' in' : ''}`} style={{ left: at(d.from) }} />
        ))}
        <input
          type="range"
          // once the low handle is in the upper half it goes on top: pushed against the high
          // handle at the right end, it must still be the one a finger catches
          style={{ zIndex: filter.min > (RATING_MIN + RATING_MAX) / 2 ? 3 : 1 }}
          aria-label={t('მინიმალური რეიტინგი', 'Lowest rating')}
          min={RATING_MIN}
          max={RATING_MAX}
          step={100}
          value={filter.min}
          onChange={(e) => onChange({ ...filter, min: Math.min(Number(e.target.value), filter.max - 100) })}
        />
        <input
          type="range"
          style={{ zIndex: 2 }}
          aria-label={t('მაქსიმალური რეიტინგი', 'Highest rating')}
          min={RATING_MIN}
          max={RATING_MAX}
          step={100}
          value={filter.max}
          onChange={(e) => onChange({ ...filter, max: Math.max(Number(e.target.value), filter.min + 100) })}
        />
      </div>
      <div className="range-labels">
        {DIFFICULTY.map((d) => (
          <span key={d.from} style={{ left: at(d.from) }}>
            {tr(d.name)} <small>{d.from}</small>
          </span>
        ))}
      </div>
    </div>
  )
}

export function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="choice">
      <span className="label">{caps(label)}</span>
      <div className="chips">{children}</div>
    </div>
  )
}

export function Chip(props: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={`chip${props.on ? ' on' : ''}`} aria-pressed={props.on} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  )
}
