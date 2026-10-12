// Renders scripts/og/card.html into public/og/card.png with headless Chrome.
// Needs the dev server running (npm run dev, port 5181):  node scripts/og/render.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL('../../public/og/card.png', import.meta.url))
mkdirSync(fileURLToPath(new URL('../../public/og/', import.meta.url)), { recursive: true })
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
execFileSync(chrome, [
  '--headless=new',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  '--virtual-time-budget=8000',
  `--screenshot=${out}`,
  'http://localhost:5181/scripts/og/card.html',
], { stdio: 'inherit' })
console.log('wrote', out)
