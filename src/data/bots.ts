// The offline bots: eight levels from beginner to master, numbered like lichess's (no names: they
// could feel personal). Each plays Stockfish held back by its skill level and search depth; the weakest also play a random move now and then, as lichess's
// lowest levels do, so a new player can win. Ratings are rough guides, not measured.
import type { Think } from '../lib/engine'

export type Bot = {
  /** the level, 1 to 8 */
  id: number
  rating: number
  think: Think
  /** the chance of a random legal move instead of the engine's */
  random: number
}

export const BOTS: Bot[] = [
  {
    id: 1,
    rating: 400,
    think: { skill: 0, depth: 1, movetime: 50 },
    random: 0.5,
  },
  {
    id: 2,
    rating: 600,
    think: { skill: 0, depth: 1, movetime: 80 },
    random: 0.3,
  },
  {
    id: 3,
    rating: 800,
    think: { skill: 2, depth: 2, movetime: 120 },
    random: 0.15,
  },
  {
    id: 4,
    rating: 1000,
    think: { skill: 5, depth: 3, movetime: 200 },
    random: 0.07,
  },
  {
    id: 5,
    rating: 1200,
    think: { skill: 8, depth: 5, movetime: 300 },
    random: 0.03,
  },
  {
    id: 6,
    rating: 1500,
    think: { skill: 12, depth: 8, movetime: 500 },
    random: 0,
  },
  {
    id: 7,
    rating: 1800,
    think: { skill: 16, depth: 12, movetime: 800 },
    random: 0,
  },
  {
    id: 8,
    rating: 2200,
    think: { skill: 20, depth: 16, movetime: 1500 },
    random: 0,
  },
]

export const botById = (id: number) => BOTS.find((b) => b.id === id)
