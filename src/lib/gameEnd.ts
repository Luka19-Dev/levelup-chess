import type { Chess } from 'chess.js'
import { t } from './i18n'

/** Why a finished game is a draw, in words; null when it is not a draw. */
export function drawText(game: Chess): string | null {
  if (game.isStalemate()) return t('პატი. ფრე.', 'Stalemate. A draw.')
  if (game.isInsufficientMaterial()) return t('ფრე: მატისთვის ფიგურები აღარ ჰყოფნით.', 'A draw: too few pieces left to mate.')
  if (game.isThreefoldRepetition()) return t('ფრე: პოზიცია სამჯერ განმეორდა.', 'A draw: the same position came up three times.')
  if (game.isDrawByFiftyMoves()) return t('ფრე: 50 სვლა აყვანისა და პაიკის სვლის გარეშე.', 'A draw: 50 moves without a capture or a pawn move.')
  return null
}
