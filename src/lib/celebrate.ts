import confetti from 'canvas-confetti'

const COLORS = ['#ffcf6b', '#1d4ed8', '#ffffff', '#8fb0ff', '#629924']

export function burst() {
  void confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: COLORS, disableForReducedMotion: true })
}

export function bigCelebration() {
  const end = Date.now() + 1400
  const frame = () => {
    void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS, disableForReducedMotion: true })
    void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS, disableForReducedMotion: true })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
