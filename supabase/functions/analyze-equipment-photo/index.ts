// Suggests what a piece of gym equipment is, from a photo.
//
// This returns SUGGESTIONS, never an identification. Two machines can look
// nearly identical and still have different movement paths, cam profiles and
// resistance curves — which means the number on the stack is not comparable
// between them. The app makes the user confirm or correct every suggestion
// before it touches a workout, because a wrong match silently corrupts the
// exercise history it feeds.
//
// It also deliberately returns a name from the app's own exercise vocabulary
// where one fits. Exercise history is matched by name, so a suggestion of
// "Seated Cable Row" continues an existing history while "Cable Row (Seated)"
// starts a new and empty one.
//
// Deploy:
//   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   npx supabase functions deploy analyze-equipment-photo --project-ref <ref>

import Anthropic from 'npm:@anthropic-ai/sdk'
import { z } from 'npm:zod@3'
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODEL = 'claude-opus-5'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MEASUREMENT_TYPES = [
  'strength', 'bodyweight', 'isometric', 'isometric_force',
  'distance_cardio', 'intervals', 'mobility',
] as const

const SuggestionSchema = z.object({
  equipment: z.string().describe('The machine or implement itself — "Plate-loaded chest press", "Adjustable dumbbell", "Concept2 rower", "Cable crossover". Write "Not identified" if you genuinely cannot tell; that is a valid and useful answer.'),
  exerciseName: z.string().describe('The exercise most commonly performed on it. If it matches one of the known exercises listed in the system prompt, copy that name EXACTLY so the app can continue the existing history for it.'),
  matched_known_exercise: z.boolean().describe('True only if exerciseName is copied exactly from the known-exercises list.'),
  measurementType: z.enum(MEASUREMENT_TYPES).describe('How this exercise is measured. strength = external load for reps. bodyweight = own bodyweight, possibly assisted or weighted. isometric = static hold for time. isometric_force = only for a dynamometer or force plate that reads out newtons. distance_cardio = treadmill, bike, rower, elliptical. intervals = timer-driven work/rest circuits. mobility = stretching and joint work.'),
  confidence: z.enum(['high', 'medium', 'low'])
    .describe('high only when the machine is unmistakable AND you can see enough of it to be sure of the movement. medium when the category is clear but the specific machine is not. low when the frame is partial, dark, or the equipment is ambiguous.'),
  caveat: z.string().describe('One short sentence on what could make this wrong — obscured pulley path, could be one of several similar machines, label not readable. Empty string if nothing notable.'),
})

const AnalysisSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('Between one and three candidates, most likely first. Offer more than one whenever the equipment is genuinely ambiguous — a ranked shortlist is more useful than a confident single guess that is wrong.'),
  notes: z.string().describe('One short sentence on anything limiting the read — partial frame, poor light, multiple machines in shot. Empty string if nothing notable.'),
})

const SYSTEM_PROMPT = `You identify gym equipment from photographs for a fitness tracking app.

What you return is a SUGGESTION the user will confirm or correct. It is never
applied automatically. Behave accordingly: a ranked shortlist with honest
confidence is far more useful than one assertive answer.

WHY THIS MATTERS
Two machines that photograph almost identically can load a movement very
differently — different cam profiles, lever lengths, pulley ratios and starting
positions. The weight selected on one is not comparable to the same number on
another. The app matches exercise history by name, so a wrong suggestion that
the user accepts quietly corrupts their progression data. Prefer "Not
identified" with low confidence over a plausible-sounding guess.

IDENTIFY
- Name the equipment as specifically as the photo supports, and no further. If
  you can see it is a plate-loaded row but not which manufacturer, say
  "Plate-loaded row" rather than inventing a brand.
- Name the exercise most commonly performed on it. If several are equally
  common on that machine, return them as separate ranked suggestions.
- Read any visible label, plate marking or instruction placard — these are
  usually the strongest evidence in the frame.
- If more than one piece of equipment is in shot, describe the one most clearly
  in the foreground, and say so in notes.

MEASUREMENT TYPE
- Choose how the exercise is actually measured, not how it feels.
- Use isometric_force ONLY for a dynamometer, force plate or similar device
  that displays a force reading. Never select it because a movement happens to
  be isometric — the app will otherwise ask for newtons the user cannot supply.
- A treadmill, bike, rower or elliptical is distance_cardio, even when it is
  used for intervals; intervals is for timer-driven circuits rather than a
  specific machine.

CONFIDENCE
- high: unmistakable equipment, movement path clearly visible.
- medium: category is certain, the specific machine is not.
- low: partial frame, poor lighting, or genuinely ambiguous equipment.
Do not inflate confidence. The app shows it to the user, and a low rating is
what prompts them to check rather than accept.

If the photograph contains no gym equipment, return an empty suggestions array
and say so in notes.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'Equipment recognition is not configured (ANTHROPIC_API_KEY is unset).' }, 503)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const asCaller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: userData, error: userError } = await asCaller.auth.getUser()
  const userId = userData?.user?.id
  if (userError || !userId) return json({ error: 'Not signed in.' }, 401)

  let photoPath: string
  let knownExercises: string[] = []
  try {
    const body = await req.json()
    photoPath = String(body?.photoPath ?? '')
    // Sent by the client so the bundled exercise list stays the single source
    // of truth rather than being duplicated here and drifting out of step.
    knownExercises = Array.isArray(body?.knownExercises)
      ? body.knownExercises.map(String).slice(0, 400)
      : []
  } catch {
    return json({ error: 'Malformed request body.' }, 400)
  }
  if (!photoPath) return json({ error: 'photoPath required.' }, 400)

  // Photos live under <user_id>/…; refuse to read anyone else's even though
  // the service role technically could.
  if (!photoPath.startsWith(`${userId}/`)) {
    return json({ error: 'That photo does not belong to you.' }, 403)
  }

  const { data: file, error: downloadError } = await admin.storage
    .from('equipment-photos').download(photoPath)
  if (downloadError || !file) {
    return json({ error: `Could not read the photo: ${downloadError?.message ?? 'not found'}` }, 404)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  const mediaType = file.type === 'image/png' ? 'image/png'
    : file.type === 'image/webp' ? 'image/webp'
    : 'image/jpeg'

  const client = new Anthropic({ apiKey })

  try {
    // The exercise list is identical on every request, so it sits behind a
    // cache breakpoint on the last stable block.
    const systemBlocks: Anthropic.TextBlockParam[] = [{ type: 'text', text: SYSTEM_PROMPT }]
    if (knownExercises.length) {
      systemBlocks.push({
        type: 'text',
        text: `KNOWN EXERCISES (the app already tracks history under these names — copy one exactly when it matches):\n${knownExercises.join('\n')}`,
        cache_control: { type: 'ephemeral' },
      })
    }

    const response = await client.messages.parse({
      model: MODEL,
      // Opus 5 runs adaptive thinking by default and those tokens count
      // against max_tokens. At 2-4k a vision request that reasons about
      // portions can truncate mid-response, leaving parsed_output null — which
      // surfaces to the user as "could not read that photo" rather than as the
      // cap it actually is. 16k is the documented non-streaming default.
      max_tokens: 16000,
      system: systemBlocks,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: 'What is this piece of equipment, and what is it used for? Read any visible label before committing, and say so plainly if you cannot tell.',
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(AnalysisSchema) },
    })

    const parsed = response.parsed_output
    if (!parsed) return json({ error: 'Could not read a suggestion from that photo.' }, 502)

    return json({
      suggestions: parsed.suggestions,
      notes: parsed.notes,
      usage: {
        input_tokens: response.usage?.input_tokens ?? null,
        output_tokens: response.usage?.output_tokens ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // The photo is already uploaded and the user is waiting — a clear reason
    // beats a generic failure.
    return json({ error: `Analysis failed: ${message}` }, 502)
  }
})
