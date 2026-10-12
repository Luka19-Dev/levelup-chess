# Third-party material

This project is licensed under the AGPLv3 or later (see `LICENSE`). It includes:

- **Learn lessons**: the boards and rules of lichess.org's learn stages (lichess-org/lila, `ui/learn`, AGPLv3+),
  converted to data by `scripts/lichess-learn/convert.mts` into `src/data/lichess-learn.json`. The texts are our own
  (`src/data/learnText.ts`). Credited on the site's sources page.
- **Puzzles**: lichess.org puzzle database (database.lichess.org), released under CC0. Selected by `scripts/build-puzzles.mjs`.
- **Piece sets in `public/pieces/`**: lichess.org's sets that are free to use (lichess COPYING.md), unmodified:
  Merida (Armando Hernandez Marroquin, GPLv2+), Chessnut (Alexis Luengas, Apache 2.0), Fantasy, Spatial and Celtic
  (Maurizio Monge, MIT), RhosGFX (CC0 1.0), Papercut (Nikolay Anzarov, CC BY 4.0), Totoy (Kosal Sen, CC BY 4.0),
  Firi (James Faure, CC BY 4.0), Kiwen-suwi (neverRare, CC BY 4.0), Shapes (flugsio, CC BY-SA 4.0), MPChess
  (Maxime Chupin, GPLv3+). Non-commercial and unclear-licence lichess sets are deliberately left out.
  Credited on the sources page. Board colours are our own.
- **Classic piece shapes**: based on the chess set by Colin M.L. Burnett, used under the BSD licence.
- **Font**: Noto Sans Georgian, SIL Open Font License 1.1 (`public/fonts/OFL.txt`).
- **Libraries**: chess.js (BSD-2-Clause), canvas-confetti (ISC), React (MIT).

The Georgian piece set is original to this project.

## Sounds
- `public/sound/sfx/`: lichess.org's free "SFX" sound set by Enigmahack, **AGPLv3+** (lichess COPYING.md),
  unmodified, saved under the names of the moments they play for. Lichess's "Standard", "Pentatonic" and other
  non-free sounds are not used.

## Lesson symbols
- `src/pieces/symbols.ts`: icons from [game-icons.net](https://game-icons.net) under **CC BY 3.0**, the same
  ones lichess's learn page shows. Lesson icons by Lorc, except "guards" (out of check) by Delapouite.
  Section symbols: chess-knight by Skoll, stairs-goal by Delapouite, open-book, laurel-crown and light-bulb by Lorc.
  Tactics icons: lichess's puzzle-theme icons, also game-icons.net CC BY 3.0 (per lichess COPYING.md).
  Credit must stay visible on the published site.
