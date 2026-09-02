import { supabase } from './supabase'

export async function completeQuestByType(
  questType: string,
  userId: string,
  circleId: string,
  earn: (action: any, refId?: string, desc?: string) => Promise<number>
) {
  const today = new Date().toISOString().split('T')[0]

  // Find the active quest matching this type
  const { data: quest } = await supabase
    .from('daily_quests')
    .select('id, xp_reward, title')
    .eq('quest_type', questType)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!quest) return

  // Check if already completed today
  const { data: existing } = await supabase
    .from('quest_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('quest_id', quest.id)
    .eq('completed_date', today)
    .maybeSingle()

  if (existing) return // already done

  // The read above races with itself when two logs land together, so the
  // unique(user_id, quest_id, completed_date) constraint is the real guard.
  // Only pay out the quest bonus when this insert is the one that won —
  // otherwise a double-tap would award the same quest twice.
  const { error: completionError } = await supabase.from('quest_completions').insert({
    user_id: userId,
    quest_id: quest.id,
    circle_id: circleId,
    completed_date: today,
    xp_earned: quest.xp_reward,
  })
  if (completionError) return

  await earn('quest', quest.id, quest.title)
}
