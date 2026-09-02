// Circle push notifications.
//
// The client says WHAT HAPPENED, never who to notify or what to say. This
// function resolves recipients and composes the copy itself, using the service
// role. That means a caller can't spam arbitrary users or inject arbitrary
// text — the worst they can do is re-announce an event they were part of.
//
// Deploy: npx supabase functions deploy send-push --project-ref <ref>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
// Expo accepts at most 100 messages per request.
const BATCH_SIZE = 100

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type EventName = 'callout_issued' | 'callout_accepted' | 'belt_changed'

// Reads the `role` claim without verifying the signature — deliberately. This
// function runs with verify_jwt on, so the gateway has already authenticated
// the token before we see it; anything reaching here is genuine.
//
// We check the claim rather than string-matching SUPABASE_SERVICE_ROLE_KEY
// because Supabase is mid-migration between legacy JWT keys and the newer
// sb_secret_* format, so the env var and the caller's token can be different
// strings representing the same identity.
function jwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
      .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))?.role ?? null
  } catch {
    return null
  }
}

interface Notification {
  recipientIds: string[]
  title: string
  body: string
  data: Record<string, string>
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization.' }, 401)

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  let payload: {
    event?: EventName; calloutId?: string; circleId?: string; actorId?: string
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Malformed request body.' }, 400)
  }

  // Two callers exist. A signed-in user gets identified from their JWT and is
  // then checked for membership. Postgres (the belt scorer, running under cron)
  // has no user session, so it presents the service role key and states the
  // actor explicitly — which is only trustworthy because that key never leaves
  // the server.
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const isServiceCall = jwtRole(bearer) === 'service_role' || bearer === serviceKey

  let actorId: string | undefined
  if (isServiceCall) {
    actorId = payload.actorId
    if (!actorId) return json({ error: 'actorId required for service calls.' }, 400)
  } else {
    const asCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userError } = await asCaller.auth.getUser()
    actorId = userData?.user?.id
    if (userError || !actorId) return json({ error: 'Not signed in.' }, 401)
  }
  if (!actorId) return json({ error: 'Could not identify actor.' }, 401)

  const { data: actor } = await admin
    .from('profiles').select('display_name').eq('id', actorId).maybeSingle()
  const actorName = actor?.display_name ?? 'Someone'

  let notification: Notification | null = null

  if (payload.event === 'callout_issued' || payload.event === 'callout_accepted') {
    if (!payload.calloutId) return json({ error: 'calloutId required.' }, 400)

    const { data: callout } = await admin
      .from('callouts')
      .select('id, circle_id, issuer_id, activity_type, personal_target, stakes')
      .eq('id', payload.calloutId)
      .maybeSingle()
    if (!callout) return json({ error: 'Callout not found.' }, 404)

    const { data: participants } = await admin
      .from('callout_participants').select('user_id').eq('callout_id', callout.id)
    const participantIds = (participants ?? []).map((p: any) => p.user_id)

    // Only someone actually in the match may trigger its notifications.
    if (!participantIds.includes(actorId) && callout.issuer_id !== actorId) {
      return json({ error: 'Not part of this callout.' }, 403)
    }

    if (payload.event === 'callout_issued') {
      notification = {
        recipientIds: participantIds.filter((id: string) => id !== actorId),
        title: `${actorName} called you out`,
        body: callout.stakes
          ? `${callout.activity_type} · ${callout.personal_target} — ${callout.stakes}`
          : `${callout.activity_type} · ${callout.personal_target}`,
        data: { type: 'callout', calloutId: callout.id },
      }
    } else {
      notification = {
        recipientIds: [callout.issuer_id].filter((id: string) => id !== actorId),
        title: `${actorName} accepted your callout`,
        body: `${callout.activity_type} · the match is on.`,
        data: { type: 'callout', calloutId: callout.id },
      }
    }
  } else if (payload.event === 'belt_changed') {
    if (!payload.circleId) return json({ error: 'circleId required.' }, 400)

    const { data: members } = await admin
      .from('circle_members').select('user_id').eq('circle_id', payload.circleId)
    const memberIds = (members ?? []).map((m: any) => m.user_id)
    if (!memberIds.includes(actorId)) return json({ error: 'Not a circle member.' }, 403)

    notification = {
      recipientIds: memberIds.filter((id: string) => id !== actorId),
      title: 'The belt has changed hands',
      body: `${actorName} is the new champion.`,
      data: { type: 'belt', circleId: payload.circleId },
    }
  } else {
    return json({ error: 'Unknown event.' }, 400)
  }

  if (!notification.recipientIds.length) return json({ sent: 0, reason: 'No recipients.' })

  const { data: tokenRows } = await admin
    .from('push_tokens').select('token').in('user_id', notification.recipientIds)
  const tokens = [...new Set((tokenRows ?? []).map((t: any) => t.token))]
  if (!tokens.length) return json({ sent: 0, reason: 'No registered devices.' })

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: notification!.title,
    body: notification!.body,
    data: notification!.data,
  }))

  let sent = 0
  const invalid: string[] = []

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    })
    if (!res.ok) continue
    const result = await res.json()
    ;(result.data ?? []).forEach((ticket: any, index: number) => {
      if (ticket.status === 'ok') sent += 1
      // A token for an uninstalled or reset app stays in the table forever
      // otherwise, and every future send wastes a slot on it.
      else if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(batch[index].to)
    })
  }

  if (invalid.length) await admin.from('push_tokens').delete().in('token', invalid)

  return json({ sent, pruned: invalid.length })
})
