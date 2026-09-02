import { supabase } from './supabase'
import type {
  BeltStanding, CategoryWeights, ChampionshipRecord, CircleBelt, DefenseCycle, TitleChallenge,
} from '../types/app'

// Mirrors the default in circle_belts.category_weights. Phase 1 scores three
// categories; steps stays at 0 until device integration lands.
export const DEFAULT_WEIGHTS: CategoryWeights = {
  login_streak: 100, training_volume: 200, nutrition: 100, steps: 0,
}

export const CYCLE_LABEL: Record<DefenseCycle, string> = {
  weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly',
}

// weights_snapshot is JSONB, so it arrives as unknown. Falling back per-key
// rather than wholesale keeps a partially-populated snapshot usable.
export function parseWeights(raw: unknown): CategoryWeights {
  if (!raw || typeof raw !== 'object') return DEFAULT_WEIGHTS
  const w = raw as Partial<Record<keyof CategoryWeights, unknown>>
  return {
    login_streak: Number(w.login_streak ?? DEFAULT_WEIGHTS.login_streak),
    training_volume: Number(w.training_volume ?? DEFAULT_WEIGHTS.training_volume),
    nutrition: Number(w.nutrition ?? DEFAULT_WEIGHTS.nutrition),
    steps: Number(w.steps ?? DEFAULT_WEIGHTS.steps),
  }
}

export function totalWeight(w: CategoryWeights): number {
  return w.login_streak + w.training_volume + w.nutrition + w.steps
}

export function reignLength(since: string | null): string {
  if (!since) return 'Vacant'
  const days = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86400000))
  if (days === 0) return 'Crowned today'
  if (days === 1) return '1 day as champion'
  if (days < 30) return `${days} days as champion`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month as champion' : `${months} months as champion`
}

export function daysRemaining(endsAt: string): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000))
}

export interface ChampionSummary {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface BeltHistoryEntry {
  id: string
  endedAt: string
  winnerName: string | null
  /** Cycle the challenge ran on, for context on how hard it was to hold. */
  cycle: DefenseCycle | null
}

export interface BeltSnapshot {
  belt: CircleBelt | null
  champion: ChampionSummary | null
  championRecord: ChampionshipRecord | null
  challenge: TitleChallenge | null
  standings: BeltStanding[]
  /** Resolved challenges, most recent first. Empty before the first cycle ends. */
  history: BeltHistoryEntry[]
  // Surfaced rather than swallowed: an empty standings list means something
  // very different when the query failed than when there are genuinely no
  // scores yet, and the UI can't tell those apart without this.
  error: string | null
}

const EMPTY: BeltSnapshot = {
  belt: null, champion: null, championRecord: null, challenge: null, standings: [], history: [], error: null,
}

/**
 * Resolved title challenges, newest first. Winner names are resolved in one
 * follow-up query rather than an embed, because the winner is not always still
 * a circle member and a join would silently drop those rows.
 */
async function loadHistory(circleId: string, cycle: DefenseCycle | null): Promise<BeltHistoryEntry[]> {
  const { data } = await supabase
    .from('title_challenges')
    .select('id, resolved_at, ends_at, winner_user_id')
    .eq('circle_id', circleId).eq('status', 'resolved')
    .order('resolved_at', { ascending: false }).limit(8)

  const rows = (data as any[]) ?? []
  if (!rows.length) return []

  const winnerIds = [...new Set(rows.map((row) => row.winner_user_id).filter(Boolean))] as string[]
  const nameById = new Map<string, string>()
  if (winnerIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', winnerIds)
    for (const profile of (profiles as any[]) ?? []) nameById.set(profile.id, profile.display_name)
  }

  return rows.map((row) => ({
    id: row.id,
    endedAt: row.resolved_at ?? row.ends_at,
    winnerName: row.winner_user_id ? nameById.get(row.winner_user_id) ?? 'Contender' : null,
    // Challenges do not record the cycle they ran on, so this reports the
    // belt's current setting. Accurate unless the circle changed cycle
    // mid-history, which is why it is presented as context rather than a fact
    // about that particular match.
    cycle,
  }))
}

export async function loadBeltSnapshot(circleId: string): Promise<BeltSnapshot> {
  const { data: belt } = await supabase
    .from('circle_belts').select('*').eq('circle_id', circleId).maybeSingle()

  // Prefer the live scoring period; fall back to the most recent resolved one
  // so a circle between cycles still shows its last result rather than nothing.
  let challenge: TitleChallenge | null = null
  const { data: live } = await supabase
    .from('title_challenges').select('*')
    .eq('circle_id', circleId).in('status', ['active', 'extended'])
    .maybeSingle()
  challenge = (live as TitleChallenge | null) ?? null

  if (!challenge) {
    const { data: last } = await supabase
      .from('title_challenges').select('*')
      .eq('circle_id', circleId).eq('status', 'resolved')
      .order('resolved_at', { ascending: false }).limit(1).maybeSingle()
    challenge = (last as TitleChallenge | null) ?? null
  }

  if (!belt && !challenge) return EMPTY

  let champion: ChampionSummary | null = null
  let championRecord: ChampionshipRecord | null = null
  if (belt?.current_champion_id) {
    const [{ data: profile }, { data: record }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url')
        .eq('id', belt.current_champion_id).maybeSingle(),
      supabase.from('championship_records').select('*')
        .eq('user_id', belt.current_champion_id).maybeSingle(),
    ])
    champion = (profile as ChampionSummary | null) ?? null
    championRecord = (record as ChampionshipRecord | null) ?? null
  }

  let standings: BeltStanding[] = []
  let error: string | null = null
  if (challenge) {
    const { data: scores, error: scoresError } = await supabase
      .from('title_challenge_scores')
      .select('*, profiles(display_name, avatar_url)')
      .eq('challenge_id', challenge.id)
      .order('total_points', { ascending: false })

    if (scoresError) error = scoresError.message

    standings = ((scores as any[]) ?? []).map((row) => ({
      ...row,
      display_name: row.profiles?.display_name ?? 'Contender',
      avatar_url: row.profiles?.avatar_url ?? null,
      is_champion: row.user_id === belt?.current_champion_id,
    }))
  }

  const history = await loadHistory(circleId, (belt as CircleBelt | null)?.defense_cycle ?? null)

  return { belt: (belt as CircleBelt | null) ?? null, champion, championRecord, challenge, standings, history, error }
}

export async function startTitleChallenge(circleId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('start_title_challenge', { p_circle_id: circleId })
  return { error: error?.message ?? null }
}
