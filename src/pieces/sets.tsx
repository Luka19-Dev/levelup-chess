// Two piece sets on one 45x45 grid. The classic shapes follow Colin M.L. Burnett's
// set (BSD licence, see LICENSES.md). The Georgian set keeps the same silhouettes
// so a piece reads instantly, then dresses them: a Svan tower for the rook, Queen
// Tamar's crown, a Bolnisi cross on the king, gold on ivory and wine.
import type { JSX } from 'react'

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type Color = 'w' | 'b'
/** one of the ids in catalog.ts PIECE_SETS */
export type SetId = string

type Palette = { body: string; line: string; detail: string; accent: string; eye: string }

const CLASSIC: Record<Color, Palette> = {
  w: { body: '#ffffff', line: '#1b1b1b', detail: '#1b1b1b', accent: '#1b1b1b', eye: '#1b1b1b' },
  b: { body: '#1f1f1f', line: '#000000', detail: '#ececec', accent: '#ececec', eye: '#ececec' },
}

const GEORGIAN: Record<Color, Palette> = {
  w: { body: '#f6ead0', line: '#4a3216', detail: '#9a6d1e', accent: '#c4952f', eye: '#4a3216' },
  b: { body: '#6e1a2b', line: '#2a070f', detail: '#e2b65a', accent: '#e9c06a', eye: '#e2b65a' },
}

function Svg({ children }: { children: JSX.Element | JSX.Element[] }) {
  return (
    <svg viewBox="0 0 45 45" width="45" height="45" className="piece-svg" aria-hidden="true">
      {children}
    </svg>
  )
}

/* ---------- classic ---------- */

function classic(type: PieceType, c: Palette): JSX.Element {
  const s = { fill: c.body, stroke: c.line, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const d = { fill: 'none', stroke: c.detail, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (type) {
    case 'p':
      return (
        <Svg>
          <path
            {...s}
            d="M22.5 9a4 4 0 0 0-3.2 6.4A6 6 0 0 0 17 20.5c0 2 .9 3.7 2.3 4.8C16 26.6 12 30.5 12 37.5h21c0-7-4-10.9-7.3-12.2a6 6 0 0 0 2.3-4.8 6 6 0 0 0-2.3-5.1A4 4 0 0 0 22.5 9z"
          />
        </Svg>
      )
    case 'r':
      return (
        <Svg>
          <path {...s} d="M9 39h27v-3H9zM12.5 32l1.5-2.5h17l1.5 2.5zM12 36v-4h21v4zM14 29.5v-13h17v13zM14 16.5 11 14h23l-3 2.5zM11 14V9h4v2h5V9h5v2h5V9h4v5z" />
          <path {...d} d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" stroke={c.detail === c.line ? 'none' : c.detail} strokeWidth={1} />
        </Svg>
      )
    case 'b':
      return (
        <Svg>
          <path
            {...s}
            d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-1.9 3-2 3-2z"
          />
          <path
            {...s}
            d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
          />
          <circle {...s} cx="22.5" cy="8" r="2.5" />
          <path {...d} d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" />
        </Svg>
      )
    case 'n':
      return (
        <Svg>
          <path {...s} d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path
            {...s}
            d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3"
          />
          <circle cx="9" cy="25.5" r="0.9" fill={c.detail} />
          <ellipse cx="14.5" cy="15.5" rx="0.6" ry="1.5" transform="rotate(30 14.5 15.5)" fill={c.detail} />
          {c.detail !== c.line ? (
            <path
              d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z"
              fill={c.detail}
            />
          ) : (
            <></>
          )}
        </Svg>
      )
    case 'q':
      return (
        <Svg>
          <g {...s}>
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
          <path {...s} d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5z" />
          <path
            {...s}
            d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
          />
          <path {...d} d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" />
        </Svg>
      )
    case 'k':
      return (
        <Svg>
          <path {...d} stroke={c.line} d="M22.5 11.6V6M20 8h5" />
          <path {...s} d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
          <path {...s} d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z" />
          <path {...d} d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" />
          {c.detail !== c.line ? (
            <path
              d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5v2.1V24.5C20 18 10.85 14 6.97 19.85 4.5 25.5 13 29.5 13 29.5"
              fill="none"
              stroke={c.detail}
              strokeWidth={1.2}
            />
          ) : (
            <></>
          )}
        </Svg>
      )
  }
}

/* ---------- georgian ---------- */

function georgian(type: PieceType, c: Palette): JSX.Element {
  const s = { fill: c.body, stroke: c.line, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const gold = { fill: c.accent, stroke: c.line, strokeWidth: 0.8, strokeLinejoin: 'round' as const }
  const trim = { fill: 'none', stroke: c.detail, strokeWidth: 1.4, strokeLinecap: 'round' as const }
  // shared pedestal: a stepped base with a gold band
  const base = (y = 36) => (
    <>
      <path {...s} d={`M10 ${y + 3.5}h25v-2.2c0-1-1-1.3-2-1.3H12c-1 0-2 .3-2 1.3z`} />
      <path {...trim} d={`M12.5 ${y + 1.6}h20`} />
    </>
  )
  switch (type) {
    case 'p':
      // a young warrior in a pointed Georgian helmet
      return (
        <Svg>
          <path
            {...s}
            d="M22.5 11a4 4 0 0 0-3.2 6.4A6 6 0 0 0 17 22.5c0 2 .9 3.7 2.3 4.8C16 28.6 13 31.5 13 36h19c0-4.5-3-7.4-6.3-8.7a6 6 0 0 0 2.3-4.8 6 6 0 0 0-2.3-5.1A4 4 0 0 0 22.5 11z"
          />
          <path {...gold} d="M18.2 15.6a4.3 4.3 0 0 1 8.6 0z" />
          <path {...trim} d="M18.6 26.4h7.8" strokeWidth={1.2} />
          {base()}
        </Svg>
      )
    case 'r':
      // ეტლი as a Svan defence tower: tapering shaft and an overhanging crown
      return (
        <Svg>
          <path {...s} d="M14.6 36 16.4 15.5h12.2L30.4 36z" />
          <path {...s} d="M14.2 15.5h16.6l-.8-4H15z" />
          <path {...trim} d="M17.2 15.5v-4M20.2 15.5v-4M24.8 15.5v-4M27.8 15.5v-4" strokeWidth={1} />
          <rect {...gold} x="21.1" y="19" width="2.8" height="4.4" rx="1.4" />
          <rect {...gold} x="21.1" y="27" width="2.8" height="4.4" rx="1.4" />
          <path {...trim} d="M15.9 24.9h13.2" strokeWidth={1} />
          {base()}
        </Svg>
      )
    case 'b':
      return (
        <Svg>
          <path {...s} d="M15.5 36c-.5-2.5 1-4.5 3-5.5-5-2.5-5.5-12 4-17.5 9.5 5.5 9 15 4 17.5 2 1 3.5 3 3 5.5z" />
          <path {...gold} d="M17.4 25.6l9.6-9.1 1 1.7-9.3 9.1z" />
          <path {...trim} d="M18.5 30.5h8" />
          <circle {...gold} cx="22.5" cy="9.8" r="2.4" />
          {base()}
        </Svg>
      )
    case 'n':
      return (
        <Svg>
          {/* the horse stands exactly where the classic knight does */}
          <g>
            <path {...s} d="M22 10c10.5 1 15.5 8 15 26H15.5c0-9 9.5-5.5 7.5-18" />
            <path
              {...s}
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3"
            />
            {/* gold bridle and an ornamented mane */}
            <path {...trim} d="M10.6 20.2l7.2 2.6M17.8 22.8l1.4-6.6" strokeWidth={1.2} />
            <path {...trim} d="M25.6 12.4c3 1.4 5.4 3.6 6.8 7.2M27.8 11.6l-.4 2.8M30.6 13.8l-1.2 2.4M32.8 17l-1.8 1.6" strokeWidth={1.2} />
            <circle cx="9" cy="25.5" r="0.9" fill={c.eye} />
            <ellipse cx="14.5" cy="15.5" rx="0.6" ry="1.5" transform="rotate(30 14.5 15.5)" fill={c.eye} />
          </g>
          {/* the plate moves under the horse's body instead */}
          <g transform="translate(3.5 0)">{base()}</g>
        </Svg>
      )
    case 'q':
      // Queen Tamar: a tall crown of three arches, jewels on a gold band
      return (
        <Svg>
          <path {...s} d="M14 36c0-4 1.5-7 3.5-9.5h10c2 2.5 3.5 5.5 3.5 9.5z" />
          <path {...s} d="M12.2 26.5 10.4 13l6 5.2 2.6-9 3.5 7.4 3.5-7.4 2.6 9 6-5.2-1.8 13.5z" />
          <path {...gold} d="M12.4 23.2h20.2l-.5 3.3H12.9z" />
          <g {...gold}>
            <circle cx="10.4" cy="12" r="1.7" />
            <circle cx="19" cy="8.2" r="1.7" />
            <circle cx="26" cy="8.2" r="1.7" />
            <circle cx="34.6" cy="12" r="1.7" />
          </g>
          <circle cx="17" cy="24.85" r="0.75" fill={c.line} />
          <circle cx="22.5" cy="24.85" r="0.75" fill={c.line} />
          <circle cx="28" cy="24.85" r="0.75" fill={c.line} />
          <path {...trim} d="M16.5 31.5h12" />
          {base()}
        </Svg>
      )
    case 'k':
      // the king: a broad crown under a Bolnisi cross
      return (
        <Svg>
          <path {...s} d="M13.5 36c0-4.5 1.6-7.6 3.8-10h10.4c2.2 2.4 3.8 5.5 3.8 10z" />
          <path
            {...s}
            d="M11.8 26c-1.6-3.2-2.4-6.8-2-10.4 3 1.4 5.4 1.8 7.4 1.6.4-2 2.6-3.6 5.3-3.6s4.9 1.6 5.3 3.6c2 .2 4.4-.2 7.4-1.6.4 3.6-.4 7.2-2 10.4z"
          />
          <path {...gold} d="M11.6 22.6h21.8l-.8 3.4H12.4z" />
          <circle cx="16.6" cy="24.3" r="0.8" fill={c.line} />
          <circle cx="22.5" cy="24.3" r="0.8" fill={c.line} />
          <circle cx="28.4" cy="24.3" r="0.8" fill={c.line} />
          {/* Bolnisi cross: four equal arms flaring out */}
          <path {...gold} strokeWidth={0.9} d="M21.6 3.2h1.8l-.3 3.3 3.3-.3v1.8l-3.3-.3.3 3.3h-1.8l.3-3.3-3.3.3V6.2l3.3.3z" />
          <path {...trim} d="M16.8 31.5h11.4" />
          {base()}
        </Svg>
      )
  }
}

export function Piece({ set, color, type }: { set: SetId; color: Color; type: PieceType }) {
  if (set === 'georgian') return georgian(type, GEORGIAN[color])
  if (set === 'classic' || !set) return classic(type, CLASSIC[color])
  // a lichess set, served as an image; an <img> never runs anything inside the SVG
  return <img className="piece-svg" src={`/pieces/${set}/${color}${type.toUpperCase()}.svg`} alt="" width={45} height={45} draggable={false} />
}

export const PIECE_NAME: Record<PieceType, { ka: string; en: string }> = {
  k: { ka: 'მეფე', en: 'King' },
  q: { ka: 'ლაზიერი', en: 'Queen' },
  r: { ka: 'ეტლი', en: 'Rook' },
  b: { ka: 'კუ', en: 'Bishop' },
  n: { ka: 'მხედარი', en: 'Knight' },
  p: { ka: 'პაიკი', en: 'Pawn' },
}
