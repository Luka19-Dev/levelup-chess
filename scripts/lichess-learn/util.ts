// stand-ins that record what lichess's helpers were asked to do
export const assetUrl = ''
export const roundSvg = (_: string) => null
export const pieceImg = (_: string) => null
export const arrow = (uci: string, color = 'green') => ({ arrow: uci, color })
export const circle = (key: string, color = 'green') => ({ circle: key, color })
export const readKeys = (keys: string | string[]) => (typeof keys === 'string' ? keys.split(' ') : keys)
export function toLevel(l: any, it: number) {
  const fen = l.fen.split(' ').length === 4 ? l.fen + ' 0 1' : l.fen
  return { id: it + 1, apples: [], color: fen.split(' ')[1] === 'w' ? 'white' : 'black', detectCapture: l.apples ? false : 'unprotected', ...l, fen }
}
