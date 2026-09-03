// Reads a body-composition printout (InBody, Tanita, Seca, a smart-scale app
// screenshot) and returns the figures as structured data.
//
// This is transcription, not estimation — every number is already printed on
// the sheet. So the rules are the opposite of the meal scanner: never infer,
// never compute, never convert. A field that can't be read clearly comes back
// null and the person types it in. A confidently wrong body-fat number is far
// worse than a blank one, because it silently corrupts a trend line.
//
// Deploy: npx supabase functions deploy analyze-body-scan --project-ref <ref>

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

const ScanSchema = z.object({
  measured_on: z.string().describe('Test date exactly as printed, normalised to YYYY-MM-DD. Empty string if no date is visible. Watch for DD.MM.YYYY vs MM/DD/YYYY — if the order is genuinely ambiguous, return an empty string rather than guessing.'),
  weight_kg: z.number().nullable().describe('Body weight in kilograms. If the sheet is in pounds, still report the printed number and set units_were_pounds true — do not convert.'),
  units_were_pounds: z.boolean().describe('True when weight and mass figures are printed in lb rather than kg.'),
  body_fat_percentage: z.number().nullable().describe('Percent Body Fat / PBF / Body Fat %. Not body fat MASS in kg — that is a different row.'),
  body_fat_mass_kg: z.number().nullable().describe('Body Fat Mass, if printed separately.'),
  skeletal_muscle_mass_kg: z.number().nullable().describe('Skeletal Muscle Mass / SMM. Do NOT substitute Soft Lean Mass or Fat Free Mass — those are larger figures and are not the same measure.'),
  visceral_fat_level: z.number().nullable().describe('Visceral Fat Level or Area, if printed.'),
  bmi: z.number().nullable().describe('BMI, if printed.'),
  device: z.string().describe('Machine or brand if identifiable — "InBody 770", "Tanita", "smart scale app". Empty string if unclear.'),
  unreadable_fields: z.array(z.string()).describe('Any field you could not read confidently — glare, crop, blur, low resolution. Being explicit here is more useful than a guess.'),
  notes: z.string().describe('One short sentence on anything the person should double-check. Empty string if the sheet read cleanly.'),
})

const SYSTEM_PROMPT = `You transcribe body-composition test results from a photograph of a printout or app screen.

This is TRANSCRIPTION, not estimation. Every value you return is already
printed somewhere in the image.

Rules:
- Read only what is printed. Never calculate a missing field from the others,
  never infer, never convert units.
- If a value is blurred, cropped, glared over, or you are not certain you have
  read the digits correctly, return null for it and name it in
  unreadable_fields. A null the person fills in beats a wrong number that
  silently corrupts their trend.
- Watch the decimal point carefully. 18.5 and 185 are very different, and
  these sheets often print small.
- Distinguish measures that look similar:
  * Percent Body Fat (PBF, a %) vs Body Fat Mass (kg)
  * Skeletal Muscle Mass (SMM) vs Soft Lean Mass vs Fat Free Mass — only SMM
    goes in skeletal_muscle_mass_kg
- Ignore the target/normal ranges, bar graphs, and score bands printed
  alongside the values. Read the person's actual measured figures only.
- If the image is not a body-composition result at all, return nulls
  throughout and say so in notes.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Scanning is not configured (ANTHROPIC_API_KEY is unset).' }, 503)

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

  let scanPath: string
  try {
    const body = await req.json()
    scanPath = String(body?.scanPath ?? '')
  } catch {
    return json({ error: 'Malformed request body.' }, 400)
  }
  if (!scanPath) return json({ error: 'scanPath required.' }, 400)
  if (!scanPath.startsWith(`${userId}/`)) {
    return json({ error: 'That scan does not belong to you.' }, 403)
  }

  const { data: file, error: downloadError } = await admin.storage
    .from('body-scans').download(scanPath)
  if (downloadError || !file) {
    return json({ error: `Could not read the scan: ${downloadError?.message ?? 'not found'}` }, 404)
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
    const response = await client.messages.parse({
      model: MODEL,
      // Opus 5 runs adaptive thinking by default and those tokens count
      // against max_tokens. At 2-4k a vision request that reasons about
      // portions can truncate mid-response, leaving parsed_output null — which
      // surfaces to the user as "could not read that photo" rather than as the
      // cap it actually is. 16k is the documented non-streaming default.
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Transcribe the measured values from this body composition result.' },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ScanSchema) },
    })

    const parsed = response.parsed_output
    if (!parsed) return json({ error: 'Could not read any values from that image.' }, 502)

    return json({
      ...parsed,
      usage: {
        input_tokens: response.usage?.input_tokens ?? null,
        output_tokens: response.usage?.output_tokens ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json({ error: `Scan failed: ${message}` }, 502)
  }
})
