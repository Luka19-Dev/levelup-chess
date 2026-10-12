// Time challenge settings, shared by the challenge screen, App and storage.
export const MINUTES = [2, 5, 10] as const
export type Challenge = { level: number; minutes: (typeof MINUTES)[number] }
/** one best score per difficulty and length, e.g. "1-5" for medium, five minutes */
export const challengeKey = (c: Challenge) => `${c.level}-${c.minutes}`
