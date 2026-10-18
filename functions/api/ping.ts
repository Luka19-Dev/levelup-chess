// Counts one event into today's row of the stats database. The site sends only the
// event's name: nothing about the person, and the address is never stored.
type Env = { STATS: D1Database }

const EVENTS = ['new_users', 'active_users', 'lessons', 'puzzles', 'battles', 'challenges'] as const

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const event = (await request.text()).trim()
  if (!(EVENTS as readonly string[]).includes(event)) return new Response(null, { status: 400 })
  // the day in Georgia (UTC+4, no summer time)
  const day = new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10)
  // the column name comes from the list above, never from the request as such
  try {
    await env.STATS.prepare(`INSERT INTO days (day, ${event}) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET ${event} = ${event} + 1`)
      .bind(day)
      .run()
  } catch {
    // a missed count is not worth an error: the site never waits for this
    return new Response(null, { status: 503 })
  }
  return new Response(null, { status: 204 })
}
