// Rebuilds src/data/lichess-learn.json from lichess's learn lessons (lichess-org/lila,
// ui/learn/src/stage, AGPLv3+). Their lesson files are downloaded into ./stage and
// loaded with the stand-in helpers in util.ts and assert.ts, which record each rule
// ("castled king-side", "check within 2 moves") as plain data for src/lib/lesson.ts.
// usage: npx tsx scripts/lichess-learn/convert.mts
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const KEYS = ['rook', 'bishop', 'queen', 'king', 'knight', 'pawn', 'capture', 'protection', 'combat', 'check1', 'outOfCheck', 'checkmate1', 'setup', 'castling', 'enpassant', 'stalemate', 'value', 'check2']
const KEEP = ['fen', 'color', 'apples', 'nbMoves', 'success', 'failure', 'scenario', 'shapes', 'captures', 'pointsForCapture', 'showPieceValues', 'offerIllegalMove', 'emptyApples', 'autoCastle', 'showFailureFollowUp']

const stageDir = join(here, 'stage')
mkdirSync(stageDir, { recursive: true })
copyFileSync(join(here, 'list-stub.ts'), join(stageDir, 'list.ts'))
for (const k of KEYS) {
  const res = await fetch(`https://raw.githubusercontent.com/lichess-org/lila/master/ui/learn/src/stage/${k}.ts`)
  if (!res.ok) throw new Error(`${k}: ${res.status}`)
  writeFileSync(join(stageDir, `${k}.ts`), await res.text())
}

// lichess reads its texts from a global i18n object; record the key instead
;(globalThis as Record<string, unknown>).i18n = { learn: new Proxy({}, { get: (_, k) => ({ i18n: String(k) }) }) }

const out = []
for (const k of KEYS) {
  const stage = (await import(pathToFileURL(join(stageDir, `${k}.ts`)).href)).default
  out.push({
    key: stage.key,
    levels: stage.levels.map((l: Record<string, unknown>) => {
      const x: Record<string, unknown> = { goal: (l.goal as { i18n: string }).i18n, detectCapture: l.detectCapture ?? false }
      for (const f of KEEP) if (l[f] !== undefined && l[f] !== false && !(Array.isArray(l[f]) && !(l[f] as unknown[]).length)) x[f] = l[f]
      if (typeof x.apples === 'string') x.apples = (x.apples as string).split(' ')
      return x
    }),
  })
}
writeFileSync(join(here, '../../src/data/lichess-learn.json'), JSON.stringify(out))
console.log(out.map((s) => `${s.key}:${s.levels.length}`).join(' '))
