# LevelUp Chess · ჭადრაკი

A free chess-teaching site in Georgian and English, made by [LevelUp Georgia](https://lvlup.ge) as a social
project for school chess classes. Live at **https://chess.lvlup.ge**.

- **Learn**: lichess.org's learn lessons (piece moves, fundamentals, castling, en passant, mate...) with our own
  Georgian and English texts, plus tactics stages built from real-game puzzles.
- **Puzzles**: about 51,000 lichess puzzles, filtered by rating, side, game stage and winning piece, or by theme.
  The filters live in the link, so a teacher can send a class a ready-made set.
- **Time challenge**: as many puzzles as possible in 2, 5 or 10 minutes, at three difficulties.
- Progress stays in the browser: no accounts, no tracking.

Static site: Vite + React + TypeScript + chess.js.

## Develop

- `npm install`, then `npm run dev` / `npm run build`
- `npx tsx scripts/lichess-learn/convert.mts` rebuilds `src/data/lichess-learn.json` from lichess's learn stages
- `npx tsx scripts/check-lessons.ts [stage,...]` checks every lesson level is solvable within its target (slow on `setup`)
- `python scripts/build_puzzle_bank.py` (needs `pip install zstandard chess`) rebuilds `public/puzzles/`
- `node scripts/build-puzzles.mjs <candidates.json>` regenerates `src/data/puzzles.json` (tactics stages)
- Deploy: `npx wrangler pages deploy dist --project-name=kai-chess --branch=main`

## Licence

GNU Affero General Public License v3.0 or later (see `LICENSE`), because the lessons and sounds come from
lichess.org, which is AGPL. Third-party material and its licences are listed in `LICENSES.md`.
