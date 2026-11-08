// The bots' engine: Stockfish 10 (GPLv3) in a web worker, from /engine. It is fetched the first
// time a bot thinks and then stays loaded. Everything runs in the browser, no server.
//
// A watchdog guards every wait: if the engine never loads (a failed download) or never answers
// (a crashed worker), the request fails instead of leaving the bot "thinking" forever, the worker
// is thrown away and the next request starts a fresh one.

type Wait = { resolve: (uci: string) => void; reject: (e: Error) => void }

const LOAD_LIMIT = 20000
/** on top of the search's own time */
const ANSWER_GRACE = 6000

let worker: Worker | null = null
let ready: Promise<void> | null = null
let pending: Wait | null = null
// requests run one at a time; each waits for the one before it
let queue: Promise<unknown> = Promise.resolve()
// requests numbered as they come; stopEngine() drops every one asked for so far that has not started
let nextId = 0
let dropBefore = 0

function reset(reason: string) {
  worker?.terminate()
  worker = null
  ready = null
  const p = pending
  pending = null
  p?.reject(new Error(reason))
}

function start(): Promise<void> {
  if (ready) return ready
  ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reset('engine did not load')
      reject(new Error('engine did not load'))
    }, LOAD_LIMIT)
    try {
      worker = new Worker('/engine/stockfish.js')
    } catch (e) {
      clearTimeout(timer)
      ready = null
      reject(e)
      return
    }
    worker.onmessage = (e: MessageEvent) => {
      const line = String(e.data)
      if (line === 'readyok') {
        clearTimeout(timer)
        resolve()
      }
      const m = line.match(/^bestmove (\S+)/)
      if (m && pending) {
        const p = pending
        pending = null
        p.resolve(m[1])
      }
    }
    worker.onerror = () => {
      clearTimeout(timer)
      reset('engine failed')
      reject(new Error('engine failed'))
    }
    worker.postMessage('uci')
    worker.postMessage('isready')
  })
  return ready
}

export type Think = { skill: number; depth: number; movetime: number }

/** The engine's move for a position, as UCI ('e2e4', 'e7e8q'); '' when stopEngine() dropped it before it began. */
export function engineMove(fen: string, think: Think): Promise<string> {
  const id = nextId++
  const job = queue.then(async () => {
    if (id < dropBefore) return ''
    await start()
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reset('engine did not answer'), think.movetime + ANSWER_GRACE)
      pending = {
        resolve: (uci) => {
          clearTimeout(timer)
          resolve(uci)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      }
      const w = worker!
      w.postMessage('ucinewgame')
      w.postMessage(`setoption name Skill Level value ${think.skill}`)
      w.postMessage(`position fen ${fen}`)
      w.postMessage(`go depth ${think.depth} movetime ${think.movetime}`)
    })
  })
  queue = job.catch(() => {})
  return job
}

/** Cuts the current search short and drops the requests still waiting; their callers no longer want them. */
export function stopEngine() {
  dropBefore = nextId
  if (pending) worker?.postMessage('stop')
}
