import { supabase } from './supabase'

export type PushEvent = 'callout_issued' | 'callout_accepted' | 'belt_changed'

interface NotifyInput {
  event: PushEvent
  calloutId?: string
  circleId?: string
}

/**
 * Announce something that just happened to the people who should hear about it.
 *
 * Deliberately fire-and-forget: the caller has already saved real data by this
 * point, and a push failure (offline, function redeploying, nobody has a device
 * registered) must never surface as a save error. Failures are logged and
 * swallowed.
 *
 * Note the client only names the EVENT — recipients and wording are decided
 * server-side, so this cannot be used to message arbitrary people.
 */
export async function notifyCircle(input: NotifyInput): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', { body: input })
    if (error) console.warn('[notifyCircle] failed:', error.message)
    else if (data?.reason) console.info('[notifyCircle]', data.reason)
  } catch (error) {
    console.warn('[notifyCircle] threw:', error)
  }
}
