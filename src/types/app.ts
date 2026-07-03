import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Circle = Database['public']['Tables']['circles']['Row']
export type CircleMember = Database['public']['Tables']['circle_members']['Row']
export type InviteCode = Database['public']['Tables']['invite_codes']['Row']
export type DailyQuest = Database['public']['Tables']['daily_quests']['Row']
export type QuestCompletion = Database['public']['Tables']['quest_completions']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row']
export type MealLog = Database['public']['Tables']['meal_logs']['Row']
export type StepLog = Database['public']['Tables']['step_logs']['Row']
export type XPEvent = Database['public']['Tables']['xp_events']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type GroceryPost = Database['public']['Tables']['grocery_posts']['Row']
export type SupplementPost = Database['public']['Tables']['supplement_posts']['Row']
export type MotivationalMessage = Database['public']['Tables']['motivational_messages']['Row']

export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExercise[]
}

export interface CircleMemberWithProfile extends CircleMember {
  profile: Profile
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<Profile, 'display_name' | 'avatar_url'>
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  avatar_url: string | null
  weekly_xp: number
  total_xp: number
  current_streak: number
  level: number
  rank: number
  badge: LeaderboardBadge | null
}

export type LeaderboardBadge =
  | 'Most Consistent'
  | 'Comeback Kid'
  | 'Encourager'
  | 'Top Logger'
  | 'Streak Legend'

export type XPActionType =
  | 'workout'
  | 'meal'
  | 'steps'
  | 'quest'
  | 'chat'
  | 'streak_bonus'
  | 'comeback'
  | 'recipe'
  | 'grocery_post'
  | 'supplement_post'

export type NotificationType =
  | 'daily_reminder'
  | 'streak_warning'
  | 'streak_lost'
  | 'friend_activity'
  | 'chat_message'
  | 'challenge_deadline'
  | 'xp_gap'
  | 'leaderboard_overtake'
  | 'comeback_bonus'
