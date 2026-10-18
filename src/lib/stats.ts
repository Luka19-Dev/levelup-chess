// Anonymous usage totals (functions/api/ping.ts). Each browser keeps two notes for
// itself, "already counted" and "last day I said hello"; no id ever leaves the device.
const KEY = 'kai-chess:stats'

export type StatEvent = 'lessons' | 'puzzles' | 'battles' | 'challenges'

function send(event: string) {
  // only the live site counts: the dev server has no /api
  if (!import.meta.env.PROD) return
  try {
    navigator.sendBeacon('/api/ping', event)
  } catch {
    /* not counted, never broken */
  }
}

/** Once per page load: a new browser, and the first visit of the day. */
export function hello() {
  try {
    const raw = localStorage.getItem(KEY)
    const seen = raw ? (JSON.parse(raw) as { last?: string }) : null
    const d = new Date()
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (seen?.last === today) return
    localStorage.setItem(KEY, JSON.stringify({ last: today }))
    // read back: where storage does not keep anything, every visit would look new
    if (localStorage.getItem(KEY) === null) return
    // a browser that already has progress was here before counting began
    if (!seen && localStorage.getItem('kai-chess:v1') === null) send('new_users')
    send('active_users')
  } catch {
    /* blocked storage: nothing counted */
  }
}

export function track(event: StatEvent) {
  send(event)
}
