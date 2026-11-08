// A page can ask before it is left (a bot game under way). App checks this on every hash change:
// while a guard is set, leaving its page is held back and the guard is asked instead.
export type LeaveGuard = { hash: string; ask: (proceed: () => void) => void }

let guard: LeaveGuard | null = null

export function setLeaveGuard(g: LeaveGuard | null) {
  guard = g
}
export function leaveGuard() {
  return guard
}
