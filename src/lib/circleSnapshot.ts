import { supabase } from './supabase'
import { getLeaderboardBadges } from './badges'
import type { LeaderboardBadge } from '../types/app'

export interface MemberStat {
  user_id: string
  display_name: string
  level: number
  weekly_xp: number
  total_xp: number
  current_streak: number
  rank: number
  badge: LeaderboardBadge | null
  /** Null while a baseline is still being established. */
  improvement_pct: number | null
  avatar_url: string | null
  workout_done: boolean
  meal_count: number
  steps: number | null
  sleep_hours: number | null
}

export interface WeekSummary {
  points: number
  workouts: number
  meals: number
  /** Null when nothing was logged, which is different from an average of zero. */
  avgSteps: number | null
  avgSleepHours: number | null
  /** Signed fraction against this member's own baseline. */
  improvement: number | null
}

export interface UpcomingMatch {
  id: string
  format: string
  startTime: string
  activityType: string
  stakes: string | null
  issuerName: string
  opponentNames: string[]
}

export interface ActivityItem {
  id: string
  actorName: string
  avatarUrl: string | null
  actionType: string
  description: string | null
  createdAt: string
}

export interface CircleSnapshot {
  stats: MemberStat[]
  /** The belt holder. Distinct from the weekly leader, and shown separately. */
  championId: string | null
  myWeek: WeekSummary | null
  upcomingMatch: UpcomingMatch | null
  activity: ActivityItem[]
  inviteCode: string | null
}

/**
 * The circle's ranking rule, in one place.
 *
 * Members with an established baseline rank by improvement against their own
 * starting point; members still establishing one sort after them by raw weekly
 * points. This is the fairness position of the whole product, so every screen
 * that ranks people has to use exactly this — Versus previously sorted by raw
 * weekly XP to decide which title format you qualified for, which rewarded
 * whoever logged most in absolute terms and contradicted every other board.
 */
export function compareContenders(
  a: { improvement_pct: number | null; weekly_xp: number },
  b: { improvement_pct: number | null; weekly_xp: number },
): number {
  if (a.improvement_pct !== null && b.improvement_pct !== null) return b.improvement_pct - a.improvement_pct
  if (a.improvement_pct !== null) return -1
  if (b.improvement_pct !== null) return 1
  return b.weekly_xp - a.weekly_xp
}

/**
 * Just the ranks, in one query, for screens that need a standing but not the
 * whole board. Baseline establishment is deliberately left to the Main Event:
 * writing it from here would fire on a screen the member may never open.
 */
export async function loadContenderRanks(
  circleId: string,
): Promise<{ ranks: Map<string, number>; total: number }> {
  const { data } = await supabase
    .from('circle_members')
    .select('user_id, profiles(weekly_xp, baseline_weekly_xp)')
    .eq('circle_id', circleId)

  const rows = ((data as any[]) ?? []).map((member) => {
    const weeklyXp = member.profiles?.weekly_xp ?? 0
    const baseline = member.profiles?.baseline_weekly_xp
    return {
      user_id: member.user_id as string,
      weekly_xp: weeklyXp,
      // Mirrors the guard in the full snapshot: a percentage change from a
      // zero baseline is undefined, not enormous.
      improvement_pct: baseline == null || baseline <= 0 ? null : (weeklyXp - baseline) / baseline,
    }
  })

  rows.sort(compareContenders)
  return {
    ranks: new Map(rows.map((row, index) => [row.user_id, index + 1])),
    total: rows.length,
  }
}

const BASELINE_ELIGIBLE_MS = 7 * 86400000

export const EMPTY_SNAPSHOT: CircleSnapshot = {
  stats: [], championId: null, myWeek: null, upcomingMatch: null, activity: [], inviteCode: null,
}

function avatarFor(profile: any): string | null {
  return profile?.avatar_source === 'ai'
    ? profile?.ai_avatar_url ?? profile?.avatar_url ?? null
    : profile?.avatar_url ?? null
}

/**
 * Everything the Main Event needs, in one place.
 *
 * The ranking and baseline rules here are unchanged from the original screen:
 * members with a baseline rank by improvement against their own starting
 * point, and members still establishing one sort after them by raw weekly
 * points. That ordering is the fairness position of the whole product — the
 * board must never reward whoever is simply biggest or fittest already.
 */
export async function loadCircleSnapshot(circleId: string, selfId: string | null): Promise<CircleSnapshot> {
  const today = new Date().toISOString().split('T')[0]

  // baseline_weekly_xp arrives with migration 005; fall back without it so the
  // board still renders on a database that has not had it run.
  let memberData: any[] | null = (
    await supabase
      .from('circle_members')
      .select('user_id, joined_at, profiles(display_name, weekly_xp, total_xp, current_streak, level, baseline_weekly_xp, avatar_url, avatar_source, ai_avatar_url)')
      .eq('circle_id', circleId)
  ).data

  if (!memberData) {
    memberData = (
      await supabase
        .from('circle_members')
        .select('user_id, joined_at, profiles(display_name, weekly_xp, total_xp, current_streak, level, avatar_url, avatar_source, ai_avatar_url)')
        .eq('circle_id', circleId)
    ).data
  }

  if (!memberData) return EMPTY_SNAPSHOT
  const userIds = memberData.map((member: any) => member.user_id)

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const weekAgoDate = weekAgo.split('T')[0]

  const [
    { data: workouts },
    { data: meals },
    { data: steps },
    { data: sleep },
    { data: weekWorkouts },
    { data: weekMeals },
    { data: weekSteps },
    { data: weekSleep },
    { data: weekChats },
    { data: comebacks },
    { data: belt },
    { data: callout },
    { data: events },
    { data: invite },
  ] = await Promise.all([
    supabase.from('workouts').select('user_id').in('user_id', userIds).gte('logged_at', today),
    supabase.from('meal_logs').select('user_id').in('user_id', userIds).gte('logged_at', today),
    supabase.from('step_logs').select('user_id, step_count').in('user_id', userIds).eq('log_date', today),
    supabase.from('sleep_logs').select('user_id, bedtime, wake_time').in('user_id', userIds).eq('log_date', today),
    supabase.from('workouts').select('user_id').in('user_id', userIds).gte('logged_at', weekAgo),
    supabase.from('meal_logs').select('user_id').in('user_id', userIds).gte('logged_at', weekAgo),
    supabase.from('step_logs').select('user_id, step_count').in('user_id', userIds).gte('log_date', weekAgoDate),
    supabase.from('sleep_logs').select('user_id, bedtime, wake_time').in('user_id', userIds).gte('log_date', weekAgoDate),
    supabase.from('chat_messages').select('sender_id').eq('circle_id', circleId).gte('created_at', weekAgo),
    supabase.from('xp_events').select('user_id').eq('circle_id', circleId).eq('action_type', 'comeback').gte('created_at', weekAgo),
    supabase.from('circle_belts').select('current_champion_id').eq('circle_id', circleId).maybeSingle(),
    supabase
      .from('callouts')
      .select('id, format, start_time, activity_type, stakes, issuer_id, participants:callout_participants(user_id)')
      .eq('circle_id', circleId).in('status', ['pending', 'active'])
      .gte('start_time', new Date(Date.now() - 3 * 3600000).toISOString())
      .order('start_time', { ascending: true }).limit(1).maybeSingle(),
    supabase
      .from('xp_events')
      .select('id, user_id, action_type, description, created_at')
      .eq('circle_id', circleId).order('created_at', { ascending: false }).limit(12),
    supabase.from('invite_codes').select('code').eq('circle_id', circleId).eq('is_active', true).limit(1).maybeSingle(),
  ])

  const workoutSet = new Set((workouts ?? []).map((row: any) => row.user_id))
  const mealMap: Record<string, number> = {}
  ;(meals ?? []).forEach((row: any) => { mealMap[row.user_id] = (mealMap[row.user_id] ?? 0) + 1 })
  const stepsMap: Record<string, number> = {}
  ;(steps ?? []).forEach((row: any) => { stepsMap[row.user_id] = row.step_count })
  const sleepMap: Record<string, number> = {}
  ;(sleep ?? []).forEach((row: any) => {
    sleepMap[row.user_id] = Math.round(((new Date(row.wake_time).getTime() - new Date(row.bedtime).getTime()) / 3600000) * 10) / 10
  })

  const weekLogCountMap: Record<string, number> = {}
  const addCount = (rows: { user_id: string }[] | null) => {
    ;(rows ?? []).forEach((row) => { weekLogCountMap[row.user_id] = (weekLogCountMap[row.user_id] ?? 0) + 1 })
  }
  addCount(weekWorkouts as any)
  addCount(weekMeals as any)
  addCount(weekSteps as any)
  addCount(weekSleep as any)

  const weekChatCountMap: Record<string, number> = {}
  ;(weekChats ?? []).forEach((row: any) => { weekChatCountMap[row.sender_id] = (weekChatCountMap[row.sender_id] ?? 0) + 1 })

  const comebackSet = new Set((comebacks ?? []).map((row: any) => row.user_id))

  const badgeMap = getLeaderboardBadges(
    memberData.map((member: any) => ({
      user_id: member.user_id,
      current_streak: member.profiles?.current_streak ?? 0,
      weekLogCount: weekLogCountMap[member.user_id] ?? 0,
      weekChatCount: weekChatCountMap[member.user_id] ?? 0,
      hasRecentComeback: comebackSet.has(member.user_id),
    })),
  )

  // Establish a baseline once you have been in the circle 7+ days without one.
  // Only ever your own row: the "update own profile" policy restricts writes to
  // id = auth.uid(), so doing this for other members matched zero rows and left
  // everyone else permanently un-baselined. Each member sets their own on their
  // next visit.
  const newlyBaselined: Record<string, number> = {}
  const self = memberData.find((member: any) => member.user_id === selfId)
  // A baseline of zero is not a baseline — it means the member happened to log
  // nothing that week. Left alone it would strand them on "building baseline"
  // forever, so it is treated as unset and captured again from a week they
  // were actually active.
  if (
    self
    && (self.profiles?.baseline_weekly_xp == null || Number(self.profiles.baseline_weekly_xp) <= 0)
    && (self.profiles?.weekly_xp ?? 0) > 0
    && Date.now() - new Date(self.joined_at).getTime() >= BASELINE_ELIGIBLE_MS
  ) {
    const baseline = self.profiles?.weekly_xp ?? 0
    const { error } = await supabase.from('profiles').update({ baseline_weekly_xp: baseline }).eq('id', self.user_id)
    if (!error) newlyBaselined[self.user_id] = baseline
  }

  const stats: MemberStat[] = memberData
    .map((member: any) => {
      const weeklyXp = member.profiles?.weekly_xp ?? 0
      const baseline = newlyBaselined[member.user_id] ?? member.profiles?.baseline_weekly_xp
      return {
        user_id: member.user_id,
        display_name: member.profiles?.display_name ?? 'Unknown',
        level: member.profiles?.level ?? 1,
        weekly_xp: weeklyXp,
        total_xp: member.profiles?.total_xp ?? 0,
        current_streak: member.profiles?.current_streak ?? 0,
        rank: 0,
        badge: badgeMap[member.user_id] ?? null,
        // A percentage change from a zero baseline is undefined, not enormous.
        // The old Math.max(baseline, 1) turned "you logged nothing during your
        // baseline week" into +18000%, which reads as broken and would have
        // parked that member at the top of the standings permanently — the
        // precise unfairness this ranking exists to avoid.
        improvement_pct: baseline == null || baseline <= 0
          ? null
          : (weeklyXp - baseline) / baseline,
        avatar_url: avatarFor(member.profiles),
        workout_done: workoutSet.has(member.user_id),
        meal_count: mealMap[member.user_id] ?? 0,
        steps: stepsMap[member.user_id] ?? null,
        sleep_hours: sleepMap[member.user_id] ?? null,
      }
    })
    .sort(compareContenders)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  const nameById = new Map(memberData.map((member: any) => [member.user_id, member.profiles?.display_name ?? 'Contender']))
  const avatarById = new Map(memberData.map((member: any) => [member.user_id, avatarFor(member.profiles)]))

  return {
    stats,
    championId: (belt as any)?.current_champion_id ?? null,
    myWeek: selfId ? buildWeekSummary(selfId, stats, weekWorkouts, weekMeals, weekSteps, weekSleep) : null,
    upcomingMatch: callout ? buildUpcomingMatch(callout, nameById) : null,
    activity: ((events as any[]) ?? []).map((event) => ({
      id: event.id,
      actorName: nameById.get(event.user_id) ?? 'Contender',
      avatarUrl: avatarById.get(event.user_id) ?? null,
      actionType: event.action_type,
      description: event.description,
      createdAt: event.created_at,
    })),
    inviteCode: (invite as any)?.code ?? null,
  }
}

function buildWeekSummary(
  selfId: string,
  stats: MemberStat[],
  weekWorkouts: any[] | null,
  weekMeals: any[] | null,
  weekSteps: any[] | null,
  weekSleep: any[] | null,
): WeekSummary {
  const mine = stats.find((entry) => entry.user_id === selfId)

  const mySteps = (weekSteps ?? []).filter((row: any) => row.user_id === selfId)
  const mySleep = (weekSleep ?? []).filter((row: any) => row.user_id === selfId)

  // Averaged over days actually logged, not over seven — dividing by seven
  // would punish someone for not yet having logged today.
  const avgSteps = mySteps.length
    ? Math.round(mySteps.reduce((sum: number, row: any) => sum + Number(row.step_count ?? 0), 0) / mySteps.length)
    : null

  const avgSleepHours = mySleep.length
    ? Math.round(
      (mySleep.reduce(
        (sum: number, row: any) => sum + (new Date(row.wake_time).getTime() - new Date(row.bedtime).getTime()) / 3600000,
        0,
      ) / mySleep.length) * 10,
    ) / 10
    : null

  return {
    points: mine?.weekly_xp ?? 0,
    workouts: (weekWorkouts ?? []).filter((row: any) => row.user_id === selfId).length,
    meals: (weekMeals ?? []).filter((row: any) => row.user_id === selfId).length,
    avgSteps,
    avgSleepHours,
    improvement: mine?.improvement_pct ?? null,
  }
}

function buildUpcomingMatch(callout: any, nameById: Map<string, string>): UpcomingMatch {
  const opponentIds = ((callout.participants ?? []) as any[])
    .map((participant) => participant.user_id)
    .filter((id: string) => id !== callout.issuer_id)

  return {
    id: callout.id,
    format: callout.format,
    startTime: callout.start_time,
    activityType: callout.activity_type,
    stakes: callout.stakes,
    issuerName: nameById.get(callout.issuer_id) ?? 'Contender',
    opponentNames: opponentIds.map((id: string) => nameById.get(id) ?? 'Contender'),
  }
}

/** "50m ago", "3h ago", "2d ago" — compact enough for a dense feed row. */
export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`
}
