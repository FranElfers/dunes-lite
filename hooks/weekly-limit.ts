import type { Register, SessionRateLimit } from 'claude-code'

const DAY_MS = 86_400_000
const KEY = 'weekly-history'

type Sample = { t: number; used: number }
type History = { resetAt: number; samples: Sample[] }
type Store = { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<unknown> }

// Next Monday 11:00 local time after `now`: used only when the engine gives no reset time.
export function nextWeeklyReset(now: number): number {
  const d = new Date(now)

  d.setHours(11, 0, 0, 0)
  d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7))

  if (d.getTime() <= now) d.setDate(d.getDate() + 7)

  return d.getTime()
}

// Percent of the weekly limit used in the last 24 hours: against the newest sample at least a day old,
// or the oldest one kept when the history is shorter than that.
export function usedLast24h(samples: Sample[], used: number, now: number): number {
  const older = samples.filter(s => s.t <= now - DAY_MS)
  const base = older.length > 0 ? older[older.length - 1] : samples[0]

  return Math.max(0, used - (base?.used ?? used))
}

// "Restante: 12.0% · 18.1%/día · usado 24h: 3.5%" in the last day before the reset; without the remaining otherwise.
export function weeklyLine(week: SessionRateLimit, resetAt: number, used24: number, now: number): string {
  const left = Math.max(0, 100 - week.percentUsed)
  const days = (resetAt - now) / DAY_MS
  const used = `usado 24h: ${used24.toFixed(1)}%`

  if (!(days > 0)) return `Restante: ${left.toFixed(1)}% · reinicia ahora · ${used}`

  const perDay = `${(left / days).toFixed(1)}%/día`

  return days <= 1 ? `Restante: ${left.toFixed(1)}% · ${perDay} · ${used}` : `${perDay} · ${used}`
}

// Reads the weekly window, records a sample in the store (history restarts when the window resets), and returns the line.
export async function weeklyLineFor(store: Store, rateLimits: SessionRateLimit[], now: number): Promise<string | undefined> {
  const week = rateLimits.find(r => r.kind === 'seven_day')

  if (week === undefined) return undefined

  const parsed = week.resetsAt === undefined ? NaN : Date.parse(week.resetsAt)
  const resetAt = Number.isNaN(parsed) ? nextWeeklyReset(now) : parsed
  const saved = (await store.get(KEY)) as History | undefined
  const prior = saved !== undefined && saved.resetAt === resetAt ? saved.samples : []
  const samples = [...prior.filter(s => now - s.t <= 2 * DAY_MS), { t: now, used: week.percentUsed }]

  await store.set(KEY, { resetAt, samples })

  return weeklyLine(week, resetAt, usedLast24h(samples, week.percentUsed, now), now)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const { rateLimits } = await $.session.usage()

    $.ui.status(await weeklyLineFor($.store, rateLimits, Date.now()))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    $.ui.status(await weeklyLineFor($.store, e.rateLimits, Date.now()))

    return next(e)
  })
}
