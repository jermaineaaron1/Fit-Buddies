/**
 * Turns a Supabase Functions invoke failure into something a person can act on.
 *
 * An undeployed function comes back as a bare "Edge Function returned a
 * non-2xx status code", which reads like a bug in the app rather than a
 * feature that was never switched on. The distinction matters: one is worth
 * reporting, the other is worth waiting for.
 */
export function describeInvokeError(error: unknown, featureName: string): string {
  const status = (error as { context?: { status?: number } } | null)?.context?.status
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
  return message
}
