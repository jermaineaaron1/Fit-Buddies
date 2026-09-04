/**
 * Turns a Supabase Functions invoke failure into something a person can act on.
 *
 * Two distinct failures produce the identical, useless string "Edge Function
 * returned a non-2xx status code":
 *
 *   - the function was never deployed (404), and
 *   - the function ran and failed for a reason it explained in its body (502) —
 *     a rejected API key, exhausted credit, a rate limit.
 *
 * The second is the dangerous one. supabase-js sets `data` to null and throws a
 * FunctionsHttpError whenever the response is non-2xx, so a caller's
 * `if (data?.error)` branch never runs for an error response and the body that
 * says WHY is dropped on the floor. This reads the body back off the Response
 * hanging on `error.context` so the real reason survives.
 *
 * Status-specific wording still wins where it is more actionable than whatever
 * the server said — a 404 has no body worth showing.
 */
export async function describeInvokeError(error: unknown, featureName: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  const status = typeof (context as { status?: unknown })?.status === 'number'
    ? (context as { status: number }).status
    : undefined
  const message = error instanceof Error ? error.message : String(error)

  if (status === 404) {
    return `${featureName} is not switched on yet — the server function has not been deployed. Nothing is wrong with your photo.`
  }
  if (status === 503) {
    return `${featureName} is not configured on the server yet (missing API key).`
  }
  if (status === 401 || status === 403) {
    return `${featureName} could not verify your session. Try signing out and back in.`
  }

  // The function ran and reported a reason. Every function in this project
  // answers with { error: string }, so prefer that over the generic wrapper.
  const fromBody = await readErrorBody(context)
  if (fromBody) return `${featureName} failed: ${fromBody}`

  if ((error as { name?: string } | null)?.name === 'FunctionsFetchError') {
    return `Could not reach the server for ${featureName.toLowerCase()}. Check your connection and try again.`
  }
  return message
}

/**
 * `context` is the raw Response for an HTTP error and something else entirely
 * for a network error, so every step here is allowed to fail. Cloning avoids
 * consuming a body a caller might still want.
 */
async function readErrorBody(context: unknown): Promise<string | null> {
  const response = context as { clone?: () => Response; text?: () => Promise<string> } | null
  if (!response || typeof response.text !== 'function') return null

  try {
    const source = typeof response.clone === 'function' ? response.clone() : (response as Response)
    const raw = (await source.text()).trim()
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw)
      const reason = parsed?.error ?? parsed?.message
      if (typeof reason === 'string' && reason.trim()) return truncate(reason.trim())
    } catch {
      // Not JSON — a plain-text body or an HTML error page.
    }
    // An HTML page is a gateway talking, not our function; it tells the user nothing.
    if (raw.startsWith('<')) return null
    return truncate(raw)
  } catch {
    return null
  }
}

function truncate(text: string): string {
  return text.length > 300 ? `${text.slice(0, 300)}…` : text
}
