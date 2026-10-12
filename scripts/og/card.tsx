// The link-preview card, 1200x630. Not part of the site build: the dev server
// serves this page and scripts/og/render.mjs screenshots it in headless Chrome
// into public/og/card.png, so the card uses the site's own board, pieces and font.
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import { Piece } from '../../src/pieces/sets'
import type { Color, PieceType } from '../../src/pieces/sets'
import { boardById } from '../../src/pieces/catalog'
import { caps } from '../../src/lib/caps'

// A knight fork: the white knight on f7 attacks the king on h8 and the queen on d8.
const POSITION: Record<string, [Color, PieceType]> = {
  h8: ['b', 'k'], d8: ['b', 'q'], a8: ['b', 'r'], c8: ['b', 'b'],
  a7: ['b', 'p'], b7: ['b', 'p'], g7: ['b', 'p'], h7: ['b', 'p'], e6: ['b', 'p'],
  f7: ['w', 'n'], e1: ['w', 'r'], g1: ['w', 'k'], c2: ['w', 'q'],
  a2: ['w', 'p'], b2: ['w', 'p'], f2: ['w', 'p'], g2: ['w', 'p'], h2: ['w', 'p'],
}
const HIT = new Set(['h8', 'd8'])

function Card() {
  const b = boardById('blue')
  const squares = []
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) {
      const sq = 'abcdefgh'[f] + r
      const dark = (f + r) % 2 === 1
      const p = POSITION[sq]
      squares.push(
        <div
          key={sq}
          style={{
            background: sq === 'f7' ? '#e8c46a' : dark ? b.dark : b.light,
            boxShadow: HIT.has(sq) ? 'inset 0 0 0 6px rgba(204,51,51,0.75)' : undefined,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {p ? <span className="sqp" style={{ width: '92%', height: '92%', display: 'block' }}><Piece set="georgian" color={p[0]} type={p[1]} /></span> : null}
        </div>,
      )
    }
  }
  return (
    <div style={{ width: 1200, height: 630, background: '#edebe9', display: 'flex', alignItems: 'center', gap: 64, padding: '0 64px', boxSizing: 'border-box', color: '#262421', fontFamily: "'Noto Sans Georgian', sans-serif" }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 22, letterSpacing: 4, color: '#6e6a65', fontWeight: 600 }}>LEVELUP GEORGIA</div>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05, color: '#1d4ed8' }}>{caps('ჭადრაკი')}</div>
        <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.35 }}>უფასო გაკვეთილები და ამოცანები ქართულად</div>
        <div style={{ fontSize: 26, color: '#6e6a65' }}>Free chess lessons and puzzles in Georgian</div>
        <div style={{ marginTop: 18, fontSize: 28, fontWeight: 600, color: '#1d4ed8' }}>chess.lvlup.ge</div>
      </div>
      <div style={{ width: 500, height: 500, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(30,25,20,0.25)', flexShrink: 0 }}>
        {squares}
      </div>
    </div>
  )
}

document.body.style.margin = '0'
const css = document.createElement('style')
css.textContent = '.sqp > *, .sqp svg, .sqp img { width: 100%; height: 100%; display: block }'
document.head.append(css)
createRoot(document.getElementById('root')!).render(<Card />)
