// The learn curriculum: lichess's learn lessons (boards and rules from lichess-org/lila,
// converted by scripts/lichess-learn/convert.mts into lichess-learn.json), with our own
// texts in learnText.ts, plus our tactics section of real-game puzzles.
import type { PieceType } from '../pieces/sets'
import type { LevelDef } from '../lib/lesson'
import type { Txt } from '../lib/i18n'
import lichess from './lichess-learn.json'
import { STAGE_TEXT } from './learnText'

export type Stage = {
  key: string
  title: Txt
  subtitle: Txt
  intro: Txt
  complete?: Txt
  icon: PieceType
  /** lesson boards, or the key of a puzzle set in puzzles.json */
  levels?: LevelDef[]
  puzzles?: string
}
export type Section = { title: Txt; symbol: string; stages: Stage[] }

const LEVELS = Object.fromEntries((lichess as { key: string; levels: LevelDef[] }[]).map((s) => [s.key, s.levels]))

function lesson(key: string, icon: PieceType): Stage {
  return { key, icon, ...STAGE_TEXT[key], levels: LEVELS[key] }
}

function tactic(key: string, puzzles: string, icon: PieceType, title: Txt, subtitle: Txt, intro: Txt): Stage {
  return { key, icon, puzzles, title, subtitle, intro }
}

export const SECTIONS: Section[] = [
  {
    title: { ka: 'ფიგურები', en: 'Chess pieces' },
    symbol: 'group:pieces',
    stages: [lesson('rook', 'r'), lesson('bishop', 'b'), lesson('queen', 'q'), lesson('king', 'k'), lesson('knight', 'n'), lesson('pawn', 'p')],
  },
  {
    title: { ka: 'საფუძვლები', en: 'Fundamentals' },
    symbol: 'group:basics',
    stages: [lesson('capture', 'n'), lesson('protection', 'b'), lesson('combat', 'r'), lesson('check1', 'k'), lesson('outOfCheck', 'k'), lesson('checkmate1', 'q')],
  },
  {
    title: { ka: 'საშუალო დონე', en: 'Intermediate' },
    symbol: 'group:intermediate',
    stages: [lesson('setup', 'r'), lesson('castling', 'k'), lesson('enpassant', 'p'), lesson('stalemate', 'k')],
  },
  {
    title: { ka: 'მაღალი დონე', en: 'Advanced' },
    symbol: 'group:advanced',
    stages: [lesson('value', 'q'), lesson('check2', 'r')],
  },
  {
    title: { ka: 'ტაქტიკა', en: 'Tactics' },
    symbol: 'group:tactics',
    stages: [
      tactic('mate1p', 'mate1', 'k', { ka: 'მატი ერთ სვლაში', en: 'Mate in one' }, { ka: 'ნამდვილი პარტიებიდან', en: 'From real games' }, { ka: 'იპოვე სვლა, რომელიც მეფეს მატს უკეთებს.', en: 'Find the move that checkmates the king.' }),
      tactic('free', 'free', 'p', { ka: 'უფასო ფიგურა', en: 'Free piece' }, { ka: 'აიყვანე დაუცველი', en: 'Take the unprotected one' }, { ka: 'მოწინააღმდეგემ ფიგურა დაუცველად დატოვა. იპოვე და აიყვანე!', en: 'The opponent left a piece unprotected. Find it and take it!' }),
      tactic('backrank', 'backrank', 'r', { ka: 'მატი ბოლო ხაზზე', en: 'Back-rank mate' }, { ka: 'მეფე საკუთარ პაიკებშია', en: 'The king is stuck behind its pawns' }, { ka: 'მეფე საკუთარ პაიკებს შორის გაიჭედა. იპოვე მატი.', en: 'The king is stuck behind its own pawns. Find the mate.' }),
      tactic('fork', 'fork', 'n', { ka: 'ჩანგალი', en: 'Fork' }, { ka: 'ორ ფიგურას ერთად', en: 'Two pieces at once' }, { ka: 'ერთი ფიგურით ორ ფიგურას ერთდროულად დაესხი თავს.', en: 'Attack two pieces at once with one of yours.' }),
      tactic('promote', 'promote', 'p', { ka: 'პაიკის გადაქცევა', en: 'Promotion' }, { ka: 'ბოლო ხაზამდე', en: 'All the way to the end' }, { ka: 'ბოლო ხაზზე მისული პაიკი ლაზიერად იქცევა. მიიყვანე იქ!', en: 'A pawn that reaches the last row becomes a queen. Get it there!' }),
      tactic('pin', 'pin', 'b', { ka: 'ბმა', en: 'Pin' }, { ka: 'ფიგურა ვერ იძვრება', en: 'The piece cannot move' }, { ka: 'ფიგურა ვერ იძვრება, რადგან მის უკან უფრო ძვირფასი ფიგურა დგას. გამოიყენე ეს.', en: 'A piece cannot move because a more valuable one stands behind it. Use that.' }),
      tactic('discover', 'discover', 'b', { ka: 'გახსნილი მუქარა', en: 'Discovered attack' }, { ka: 'გზა გაუხსენი', en: 'Open the way' }, { ka: 'გადაადგილე ერთი ფიგურა და გზა გაუხსენი მეორეს.', en: 'Move one piece to open the way for another.' }),
      tactic('mate2', 'mate2', 'q', { ka: 'მატი ორ სვლაში', en: 'Mate in two' }, { ka: 'იფიქრე წინასწარ', en: 'Think ahead' }, { ka: 'ორი სვლა და მეფე დამარცხებულია. იფიქრე წინასწარ!', en: 'Two moves and the king is beaten. Think ahead!' }),
    ],
  },
]

export const STAGES: Stage[] = SECTIONS.flatMap((s) => s.stages)
export const stageByKey = (key: string) => STAGES.find((s) => s.key === key)
