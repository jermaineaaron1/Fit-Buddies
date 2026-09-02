// Estimates what's on a plate from a photo.
//
// Deliberately returns ESTIMATES for the user to confirm, never a silent log.
// Portion size from a photo is genuinely hard, and quietly recording a wrong
// number is worse than asking. The app shows every field as editable.
//
// Note what this does NOT do: it doesn't try to be the source of truth for
// macros. The model is strong at identifying a dish and judging portion size,
// and much weaker at recalling exact nutrition values. So it returns a food
// NAME and an estimated weight, and the app substitutes real per-100g values
// from the bundled Malaysian food table whenever the name matches. The macros
// here are the fallback for foods that table doesn't know.
//
// Deploy:
//   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   npx supabase functions deploy analyze-meal-photo --project-ref <ref>

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

const MealItemSchema = z.object({
  name: z.string().describe('The dish or drink. If it matches one of the known foods listed in the system prompt, use that EXACT name so the app can look up verified nutrition data. Otherwise use the common local name.'),
  matched_known_food: z.boolean().describe('True only if `name` is copied exactly from the known-foods list.'),
  size_reference: z.string().describe('What you judged the portion against — "10-inch dinner plate", "standard rice bowl", "hand for scale", "355ml can". Write "none visible" if there is nothing to scale against; this is the single biggest source of error.'),
  portion_description: z.string().describe('How much of it, in plain words a person would use — "1 plate", "half a bowl", "a 500ml bottle".'),
  estimated_grams: z.number().describe('Best estimate of the edible weight in grams. For drinks, use millilitres as grams. Exclude bones, shells, and packaging.'),
  grams_min: z.number().describe('Low end of a plausible range for this portion.'),
  grams_max: z.number().describe('High end of a plausible range. A wide range is the honest answer when there is no size reference.'),
  cooking_method: z.string().describe('Fried, grilled, steamed, boiled, raw, etc. — this changes calories substantially. "unclear" if you cannot tell.'),
  calories: z.number().describe('Estimated kcal for the portion shown, not per 100g.'),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.enum(['high', 'medium', 'low'])
    .describe('high only when the dish is unmistakable AND a size reference is visible. low when either is missing.'),
})

const AnalysisSchema = z.object({
  items: z.array(MealItemSchema).describe('One entry per distinct food or drink. Split a mixed plate into its components where they are separately identifiable.'),
  notes: z.string().describe('One short sentence on anything that limits the estimate — no size reference, obscured food, unclear cooking method. Empty string if nothing notable.'),
})

const SYSTEM_PROMPT = `You estimate nutrition from photographs of meals for a fitness tracking app used mainly in Malaysia.

The people using this are logging what they actually ate. They will not weigh
their food or know the recipe. Your job is to give them a sensible starting
estimate they can correct in a few taps.

IDENTIFY
- Name every distinct food and drink. Split a mixed plate into its components
  when they are separately identifiable — rice, chicken, sambal, egg, peanuts —
  rather than reporting one blended "mixed meal". Component-level entries are
  far more correctable than a single lump sum.
- Include drinks, sauces, and condiments visible in the frame. Sweet drinks and
  fried condiments carry real calories that people routinely forget.
- Do not invent food that is out of frame or that you cannot actually see.

PORTION — this is where most of the error lives
- Anchor to a physical reference and name it in size_reference: a dinner plate
  is typically 25-28cm, a rice bowl 11-13cm and about 200ml, a soup spoon 15ml,
  a soda can 330ml, an adult palm roughly 100g of meat.
- With no reference visible, say "none visible", widen grams_min..grams_max,
  and drop confidence to low. A wide honest range beats a precise wrong number.
- Estimate the portion actually shown, not a standard restaurant serving.
- Judge edible weight only: exclude bones, shells, skewers, and packaging.

COOKING METHOD
- Deep-fried, stir-fried in oil, grilled, steamed and boiled differ enormously
  in fat. State which you see. Visible oil sheen, browning, and batter are the
  cues. Say "unclear" rather than assuming the leanest option.

NAMING
- A list of known foods with verified nutrition data follows. If a dish is one
  of them, copy that name EXACTLY and set matched_known_food true — the app
  then uses real nutrition data instead of your estimate, which is more
  accurate. Match on the dish, not the words: "coconut rice with anchovies and
  sambal" is Nasi lemak.
- Only set matched_known_food true for an exact copy from that list.

CONFIDENCE
- high: unmistakable dish AND a clear size reference.
- medium: confident on identity, uncertain on amount.
- low: ambiguous dish, obscured food, or no way to judge size.
Do not inflate confidence — the app shows it to the user, and a low rating
prompts them to check rather than trusting a bad number.

If the image contains no food, return an empty items array and say so in notes.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'Photo analysis is not configured (ANTHROPIC_API_KEY is unset).' }, 503)
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
  let knownFoods: string[] = []
  let recentFoods: string[] = []
  try {
    const body = await req.json()
    photoPath = String(body?.photoPath ?? '')
    // Sent by the client so the bundled food table stays the single source of
    // truth rather than being duplicated here and drifting.
    knownFoods = Array.isArray(body?.knownFoods) ? body.knownFoods.map(String).slice(0, 400) : []
    recentFoods = Array.isArray(body?.recentFoods) ? body.recentFoods.map(String).slice(0, 40) : []
  } catch {
    return json({ error: 'Malformed request body.' }, 400)
  }
  if (!photoPath) return json({ error: 'photoPath required.' }, 400)

  // Photos live under <user_id>/…; refuse to read anyone else's even though the
  // service role technically could.
  if (!photoPath.startsWith(`${userId}/`)) {
    return json({ error: 'That photo does not belong to you.' }, 403)
  }

  const { data: file, error: downloadError } = await admin.storage
    .from('meal-photos').download(photoPath)
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
    // The known-foods list is identical on every request, so it sits in a
    // cached system block — the cache breakpoint goes on the last stable block,
    // and the per-user history (which varies) comes after it.
    const systemBlocks: Anthropic.TextBlockParam[] = [{ type: 'text', text: SYSTEM_PROMPT }]
    if (knownFoods.length) {
      systemBlocks.push({
        type: 'text',
        text: `KNOWN FOODS (verified nutrition data available — copy these names exactly when they match):\n${knownFoods.join('\n')}`,
        cache_control: { type: 'ephemeral' },
      })
    }
    if (recentFoods.length) {
      systemBlocks.push({
        type: 'text',
        text: `This person has recently logged the following. People eat the same things repeatedly, so treat these as likely candidates — but only if the photo actually supports it:\n${recentFoods.join('\n')}`,
      })
    }

    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: systemBlocks,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: 'Estimate what is in this meal. Work through the visible size references before committing to a weight.',
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(AnalysisSchema) },
    })

    const parsed = response.parsed_output
    if (!parsed) return json({ error: 'Could not read an estimate from that photo.' }, 502)

    // Recorded so a bad estimate is diagnosable later, and so we can compare
    // what was suggested against what the user corrected.
    await admin.from('meal_photo_analyses').insert({
      user_id: userId,
      photo_path: photoPath,
      model: MODEL,
      items: parsed.items,
      input_tokens: response.usage?.input_tokens ?? null,
      output_tokens: response.usage?.output_tokens ?? null,
    })

    return json({
      items: parsed.items,
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
