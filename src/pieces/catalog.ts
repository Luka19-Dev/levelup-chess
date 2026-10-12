// The piece sets and board colours a player can choose. Our two sets are drawn in
// sets.tsx; the rest are lichess's sets that are free to use (lichess COPYING.md),
// served as images from /pieces/<id>/. Board colours are plain pairs, so they carry
// no licence. Credits for every set are on the sources page and in LICENSES.md.
import type { Txt } from '../lib/i18n'

export type PieceSetInfo = { id: string; name: Txt; author?: string; license?: string }

export const PIECE_SETS: PieceSetInfo[] = [
  { id: 'georgian', name: { ka: 'ქართული', en: 'Georgian' } },
  { id: 'classic', name: { ka: 'კლასიკური', en: 'Classic' }, author: 'Colin M.L. Burnett', license: 'BSD' },
  // the rest in alphabetical order
  { id: 'celtic', name: { ka: 'Celtic', en: 'Celtic' }, author: 'Maurizio Monge', license: 'MIT' },
  { id: 'chessnut', name: { ka: 'Chessnut', en: 'Chessnut' }, author: 'Alexis Luengas', license: 'Apache 2.0' },
  { id: 'fantasy', name: { ka: 'Fantasy', en: 'Fantasy' }, author: 'Maurizio Monge', license: 'MIT' },
  { id: 'firi', name: { ka: 'Firi', en: 'Firi' }, author: 'James Faure', license: 'CC BY 4.0' },
  { id: 'kiwen-suwi', name: { ka: 'Kiwen-suwi', en: 'Kiwen-suwi' }, author: 'neverRare', license: 'CC BY 4.0' },
  { id: 'merida', name: { ka: 'Merida', en: 'Merida' }, author: 'Armando Hernandez Marroquin', license: 'GPLv2+' },
  { id: 'mpchess', name: { ka: 'MPChess', en: 'MPChess' }, author: 'Maxime Chupin', license: 'GPLv3+' },
  { id: 'papercut', name: { ka: 'Papercut', en: 'Papercut' }, author: 'Nikolay Anzarov', license: 'CC BY 4.0' },
  { id: 'rhosgfx', name: { ka: 'RhosGFX', en: 'RhosGFX' }, author: 'RhosGFX', license: 'CC0 1.0' },
  { id: 'shapes', name: { ka: 'Shapes', en: 'Shapes' }, author: 'flugsio', license: 'CC BY-SA 4.0' },
  { id: 'spatial', name: { ka: 'Spatial', en: 'Spatial' }, author: 'Maurizio Monge', license: 'MIT' },
  { id: 'totoy', name: { ka: 'Totoy', en: 'Totoy' }, author: 'Kosal Sen', license: 'CC BY 4.0' },
]

export type BoardTheme = { id: string; name: Txt; light: string; dark: string }

export const BOARDS: BoardTheme[] = [
  { id: 'blue', name: { ka: 'ლურჯი', en: 'Blue' }, light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'brown', name: { ka: 'ყავისფერი', en: 'Brown' }, light: '#f0d9b5', dark: '#b58863' },
  { id: 'green', name: { ka: 'მწვანე', en: 'Green' }, light: '#ffffdd', dark: '#86a666' },
  { id: 'purple', name: { ka: 'იისფერი', en: 'Purple' }, light: '#e4dcef', dark: '#9b7fb6' },
  { id: 'grey', name: { ka: 'ნაცრისფერი', en: 'Grey' }, light: '#e8e8e8', dark: '#9e9e9e' },
  { id: 'coral', name: { ka: 'მარჯანი', en: 'Coral' }, light: '#f6e3d8', dark: '#de9a82' },
  { id: 'night', name: { ka: 'ღამე', en: 'Night' }, light: '#9aa3ae', dark: '#59626e' },
]

export const DEFAULT_SET = 'georgian'
export const DEFAULT_BOARD = 'blue'

export const boardById = (id: string) => BOARDS.find((b) => b.id === id) ?? BOARDS[0]

/** Blue and brown first, the rest alphabetical in the reader's language (Georgian sorts by its own alphabet). */
export function boardsInOrder(lang: 'ka' | 'en'): BoardTheme[] {
  const lead = ['blue', 'brown']
  const rest = BOARDS.filter((b) => !lead.includes(b.id)).sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang))
  return [...lead.map((id) => boardById(id)), ...rest]
}
