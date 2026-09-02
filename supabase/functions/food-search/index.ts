// Food search proxy.
//
// Open Food Facts cannot be called from a browser: the modern
// search-a-licious host sends no Access-Control-Allow-Origin at all, and the
// legacy cgi/search.pl host sends it only inconsistently (same URL succeeds on
// one request and is blocked on the next). Native builds don't care — there is
// no CORS on iOS/Android — but the web build could never search reliably.
//
// This runs server-side where CORS doesn't apply, normalises the two very
// different response shapes into one, and returns a small payload instead of
// the multi-megabyte raw product objects the legacy endpoint hands back.
//
// Deploy:  npx supabase functions deploy food-search --project-ref <ref>

const SEARCH_URL = 'https://search.openfoodfacts.org/search'
const LEGACY_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PAGE_SIZE = 25

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FoodResult {
  code: string
  name: string
  brand: string | null
  imageUrl: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  fibrePer100g: number | null
  servingGrams: number | null
  source: 'open-food-facts'
}

// Both endpoints nest nutrition under the same `nutriments` keys; only the
// envelope and the type of `brands` differ.
function mapProduct(raw: Record<string, any>): FoodResult {
  return {
    code: String(raw.code ?? raw.id ?? raw.product_name),
    name: raw.product_name,
    brand: Array.isArray(raw.brands) ? raw.brands[0] ?? null : raw.brands ?? null,
    imageUrl: raw.image_thumb_url ?? raw.image_small_url ?? null,
    caloriesPer100g: raw.nutriments?.['energy-kcal_100g'] ?? null,
    proteinPer100g: raw.nutriments?.proteins_100g ?? null,
    carbsPer100g: raw.nutriments?.carbohydrates_100g ?? null,
    fatPer100g: raw.nutriments?.fat_100g ?? null,
    fibrePer100g: raw.nutriments?.fiber_100g ?? null,
    servingGrams: null,
    source: 'open-food-facts',
  }
}

async function searchModern(q: string): Promise<FoodResult[]> {
  const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(q)}&page_size=${PAGE_SIZE}`)
  if (!res.ok) throw new Error(`search-a-licious ${res.status}`)
  const data = await res.json()
  return (data.hits ?? []).filter((h: any) => h.product_name).map(mapProduct)
}

async function searchLegacy(q: string): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(PAGE_SIZE),
  })
  const res = await fetch(`${LEGACY_SEARCH_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`cgi/search.pl ${res.status}`)
  const data = await res.json()
  return (data.products ?? []).filter((p: any) => p.product_name).map(mapProduct)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  let q = ''
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      q = String(body?.q ?? '').trim()
    } else {
      q = (new URL(req.url).searchParams.get('q') ?? '').trim()
    }
  } catch {
    return json({ error: 'Malformed request.' }, 400)
  }

  if (q.length < 2) return json({ results: [] })

  // Modern endpoint first — richer index. Legacy is the backstop for when
  // search-a-licious is down, which it has been before.
  try {
    return json({ results: await searchModern(q) })
  } catch (modernError) {
    try {
      return json({ results: await searchLegacy(q) })
    } catch (legacyError) {
      // The client keeps its own local food list, so a failure here is a
      // degraded result rather than a broken screen. Say so plainly.
      return json({
        results: [],
        error: `Upstream unavailable (${String(modernError)} / ${String(legacyError)})`,
      })
    }
  }
})
