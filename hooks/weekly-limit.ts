import type { Register, SessionRateLimit } from 'claude-code'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const KEY = 'weeklyHistory'

// One reading of the weekly window; `week` identifies the window (its reset, rounded to the hour).
export type Reading = { t: number; used: number; week: number }

export function weekOf(r: SessionRateLimit, now: number): Reading | undefined {
  if (r.kind !== 'seven_day') return undefined
  const reset = r.resetsAt === undefined ? NaN : Date.parse(r.resetsAt)

  return { t: now, used: r.percentUsed, week: Number.isNaN(reset) ? 0 : Math.round(reset / HOUR_MS) }
}

// Adds `r` when the figure moved or 10 min passed; keeps 48 h so a reading from 24 h ago survives.
export function record(history: Reading[], r: Reading): Reading[] {
  const last = history.at(-1)
  const kept = history.filter(h => h.t > r.t - 2 * DAY_MS)

  if (last !== undefined && last.used === r.used && last.week === r.week && r.t - last.t < 10 * 60_000) return kept

  return [...kept, r]
}

// % of the weekly limit used in the last 24 h: now minus the latest reading at or before 24 h ago
// (the oldest one when history is shorter). Across a weekly reset it counts only since the reset.
export function used24h(history: Reading[], r: Reading): number {
  const same = history.filter(h => h.week === r.week)
  const before = same.filter(h => h.t <= r.t - DAY_MS).at(-1)
  const base = before ?? same[0]
  const sinceReset = same.length < history.length && before === undefined

  return Math.max(0, sinceReset || base === undefined ? r.used : r.used - base.used)
}

export function weeklyLine(r: Reading, used24: number): string {
  const left = Math.max(0, 100 - r.used)
  const days = r.week === 0 ? NaN : (r.week * HOUR_MS - r.t) / DAY_MS
  const tail = `usado 24h: ${used24.toFixed(1)}%`

  if (!(days > 0)) return `Restante: ${left.toFixed(1)}% · ${tail}`

  const perDay = `Queda un promedio de ${(left / days).toFixed(1)}%/día · ${tail}`

  return days <= 1 ? `Restante: ${left.toFixed(1)}% · ${perDay}` : perDay
}

export const registerWeekly: Register = on => {
  // Serialises store writes so two measures in a row don't overwrite each other.
  let queue: Promise<void> = Promise.resolve()

  on('session.measure', ($, e, next) => {
    const r = e.rateLimits.map(l => weekOf(l, Date.now())).find(x => x !== undefined)

    if (r !== undefined) {
      queue = queue
        .then(async () => {
          const stored = await $.store.get(KEY)
          const history = record(Array.isArray(stored) ? (stored as Reading[]) : [], r)
          await $.store.set(KEY, history)
          $.ui.status(weeklyLine(r, used24h(history, r)))
        })
        .catch(err => {
          $.ui.toast(`weekly: ${String(err)}`)
        })
    }

    return next(e)
  })
}
