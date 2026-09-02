// Exercise library backed by wger's public API (https://wger.de/api/v2/) — free,
// no auth required. There is no working text-search endpoint on this API (confirmed
// live: `exercise/search/` 404s, and `?search=`/`?name__icontains=` are silently
// ignored elsewhere), so the whole index is bulk-fetched once and cached in memory,
// then filtered client-side.

const API_BASE = 'https://wger.de/api/v2'

export interface ExerciseSummary {
  id: number
  name: string
  categoryId: number
  imageUrl: string | null
}

export interface ExerciseDetail {
  id: number
  name: string
  categoryName: string
  imageUrl: string | null
  videoUrl: string | null
}

// What a picker hands back to whichever screen opened it.
export interface PickedExercise {
  exerciseId: number
  name: string
  imageUrl: string | null
}

export const EXERCISE_CATEGORIES = [
  { id: 10, name: 'Abs' },
  { id: 8, name: 'Arms' },
  { id: 12, name: 'Back' },
  { id: 14, name: 'Calves' },
  { id: 15, name: 'Cardio' },
  { id: 11, name: 'Chest' },
  { id: 9, name: 'Legs' },
  { id: 13, name: 'Shoulders' },
]

const ENGLISH = 2

async function fetchJson(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`wger request failed (${res.status})`)
  return res.json()
}

let indexPromise: Promise<ExerciseSummary[]> | null = null

async function buildIndex(): Promise<ExerciseSummary[]> {
  const [exercises, translations, images] = await Promise.all([
    fetchJson('/exercise/?limit=900&format=json'),
    fetchJson(`/exercise-translation/?limit=3300&language=${ENGLISH}&format=json`),
    fetchJson('/exerciseimage/?limit=1000&format=json'),
  ])

  // The API silently ignores query-string filters on this endpoint (confirmed
  // live — `?language=` included in the request above does not actually limit
  // the response), so language must still be filtered client-side.
  const nameByExerciseId = new Map<number, string>()
  for (const t of translations.results as any[]) {
    if (t.name && t.language === ENGLISH && !nameByExerciseId.has(t.exercise)) nameByExerciseId.set(t.exercise, t.name)
  }

  const imageByExerciseId = new Map<number, string>()
  for (const img of images.results as any[]) {
    if (img.is_main && img.thumbnails?.small) imageByExerciseId.set(img.exercise, img.thumbnails.small)
  }
  for (const img of images.results as any[]) {
    if (img.thumbnails?.small && !imageByExerciseId.has(img.exercise)) {
      imageByExerciseId.set(img.exercise, img.thumbnails.small)
    }
  }

  const summaries: ExerciseSummary[] = []
  for (const ex of exercises.results as any[]) {
    const name = nameByExerciseId.get(ex.id)
    if (!name) continue
    summaries.push({ id: ex.id, name, categoryId: ex.category, imageUrl: imageByExerciseId.get(ex.id) ?? null })
  }
  return summaries
}

// Fetched once per app session; every picker open reuses the same in-flight/resolved promise.
export function getExerciseIndex(): Promise<ExerciseSummary[]> {
  if (!indexPromise) indexPromise = buildIndex()
  return indexPromise
}

export function searchExercises(index: ExerciseSummary[], query: string, categoryId: number | null): ExerciseSummary[] {
  const q = query.trim().toLowerCase()
  return index
    .filter((e) => (categoryId === null || e.categoryId === categoryId) && (q === '' || e.name.toLowerCase().includes(q)))
    .slice(0, 60)
}

// Autosuggest ranking: names STARTING with the query come first, so typing
// "push" surfaces "Push Up" ahead of "Incline Push". Substring matches fill any
// remaining slots rather than being dropped entirely.
export function suggestExercises(index: ExerciseSummary[], query: string, limit = 6): ExerciseSummary[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const prefix: ExerciseSummary[] = []
  const contains: ExerciseSummary[] = []
  for (const exercise of index) {
    const name = exercise.name.toLowerCase()
    if (name.startsWith(q)) {
      prefix.push(exercise)
      if (prefix.length >= limit) break
    } else if (name.includes(q) && contains.length < limit) {
      contains.push(exercise)
    }
  }
  return [...prefix, ...contains].slice(0, limit)
}

export async function getExerciseDetail(id: number): Promise<ExerciseDetail> {
  const data = await fetchJson(`/exerciseinfo/${id}/?format=json`)
  const translation = (data.translations as any[]).find((t: any) => t.language === ENGLISH) ?? data.translations?.[0]
  const video = (data.videos as any[])?.[0]
  const image = (data.images as any[])?.[0]
  return {
    id: data.id,
    name: translation?.name ?? 'Exercise',
    categoryName: data.category?.name ?? '',
    imageUrl: image?.thumbnails?.medium ?? image?.image ?? null,
    videoUrl: video?.video ?? null,
  }
}
