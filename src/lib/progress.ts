import { STAGES } from '../data/learn'
import type { Stage } from '../data/learn'
import puzzles from '../data/puzzles.json'

const PUZZLES = puzzles.levels as Record<string, unknown[]>

export function levelCount(stage: Stage): number {
  return stage.levels ? stage.levels.length : PUZZLES[stage.puzzles!].length
}

export function solvedCount(stage: Stage, learn: Record<string, number[]>): number {
  return (learn[stage.key] ?? []).filter((n) => n > 0).length
}

export function starsOf(stage: Stage, learn: Record<string, number[]>): number {
  return (learn[stage.key] ?? []).reduce((a, b) => a + b, 0)
}

export function overall(learn: Record<string, number[]>) {
  let total = 0
  let solved = 0
  let stars = 0
  for (const s of STAGES) {
    total += levelCount(s)
    solved += solvedCount(s, learn)
    stars += starsOf(s, learn)
  }
  return { total, solved, stars, percent: total ? Math.round((solved / total) * 100) : 0 }
}

/** The first stage that still has an unsolved level: it gets the "play" ribbon. */
export function nextStage(learn: Record<string, number[]>): Stage | undefined {
  return STAGES.find((s) => solvedCount(s, learn) < levelCount(s))
}
