// Game sounds: lichess's free SFX set (Enigmahack, AGPLv3+), saved under the names of the
// moments they play for, so the mapping stays the one the site was designed with.
// Recorded or permitted sounds can replace these files later without touching the code.
let ctx: AudioContext | null = null
let enabled = true
const buffers = new Map<string, AudioBuffer>()

type Cue = [file: string, at?: number][]

const FILES = ['move-self', 'move-opponent', 'move-check', 'capture', 'castle', 'promote', 'puzzle-correct-2', 'illegal', 'lesson-pass', 'tenseconds', 'game-start']

export function setSound(on: boolean) {
  enabled = on
  if (on) preload()
}

function context(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    return ctx
  } catch {
    return null
  }
}

function preload() {
  const c = context()
  if (!c) return
  for (const f of FILES) {
    if (buffers.has(f)) continue
    fetch(`/sound/sfx/${f}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => c.decodeAudioData(b))
      .then((buf) => buffers.set(f, buf))
      .catch(() => {})
  }
}

/** Plays a cue. Before the files finish loading it stays silent rather than guess. */
function play(cue: Cue) {
  if (!enabled) return
  const c = context()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  for (const [f, at = 0] of cue) {
    const buf = buffers.get(f)
    if (!buf) continue
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(c.currentTime + at)
  }
}

export type MoveKind = { capture?: boolean; check?: boolean; mate?: boolean; castle?: boolean; promotion?: boolean; opponent?: boolean }

export const sfx = {
  /** The sound of one chess move, chosen from what the move did. */
  play(m: MoveKind = {}) {
    if (m.check || m.mate) play([['move-check']])
    else if (m.castle) play([['castle']])
    else if (m.promotion) play([['promote']])
    else if (m.capture) play([['capture']])
    else play([[m.opponent ? 'move-opponent' : 'move-self']])
  },
  move() {
    sfx.play()
  },
  capture() {
    sfx.play({ capture: true })
  },
  /** Collecting a star sounds like taking a piece. */
  star() {
    sfx.capture()
  },
  right() {
    play([['puzzle-correct-2']])
  },
  /**
   * A right move in a puzzle that is not over yet: a soft rising two-note chime, drawn here
   * rather than taken from a sound set, so it is our own.
   */
  keepGoing() {
    if (!enabled) return
    const c = context()
    if (!c) return
    if (c.state === 'suspended') void c.resume()
    const notes: [hz: number, at: number][] = [
      [784, 0.06],
      [1175, 0.15],
    ]
    for (const [hz, at] of notes) {
      const t = c.currentTime + at
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
      osc.connect(gain).connect(c.destination)
      osc.start(t)
      osc.stop(t + 0.34)
    }
  },
  wrong() {
    play([['illegal']])
  },
  /** `left` is the seconds remaining in a time challenge; the warning plays once, at ten. */
  tick(left: number) {
    if (left === 10) play([['tenseconds']])
  },
  start() {
    play([['game-start']])
  },
  fanfare() {
    play([['lesson-pass']])
  },
}
