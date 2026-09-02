import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Circle = Database['public']['Tables']['circles']['Row']
export type CircleMember = Database['public']['Tables']['circle_members']['Row']
export type InviteCode = Database['public']['Tables']['invite_codes']['Row']
export type DailyQuest = Database['public']['Tables']['daily_quests']['Row']
export type QuestCompletion = Database['public']['Tables']['quest_completions']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row']
export type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row']
export type ExerciseType = WorkoutExercise['exercise_type']
export type WeightMode = NonNullable<WorkoutExercise['weight_mode']>
export type CardioIntensity = NonNullable<WorkoutExercise['cardio_intensity']>
export type MealLog = Database['public']['Tables']['meal_logs']['Row']
export type StepLog = Database['public']['Tables']['step_logs']['Row']
export type XPEvent = Database['public']['Tables']['xp_events']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type GroceryPost = Database['public']['Tables']['grocery_posts']['Row']
export type SupplementPost = Database['public']['Tables']['supplement_posts']['Row']
export type MotivationalMessage = Database['public']['Tables']['motivational_messages']['Row']
export type Callout = Database['public']['Tables']['callouts']['Row']
export type CalloutParticipant = Database['public']['Tables']['callout_participants']['Row']
export type CalloutSpectator = Database['public']['Tables']['callout_spectators']['Row']

export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExercise[]
}

export interface WorkoutPlanWithSource extends WorkoutPlan {
  source_workout: Pick<Workout, 'id' | 'title'> | null
}

export interface CircleMemberWithProfile extends CircleMember {
  profile: Profile
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<Profile, 'display_name' | 'avatar_url'>
}

export interface CalloutParticipantWithProfile extends CalloutParticipant {
  profile: Pick<Profile, 'display_name' | 'avatar_url' | 'avatar_source' | 'ai_avatar_url'>
}

export interface CalloutWithDetails extends Callout {
  issuer: Pick<Profile, 'display_name' | 'avatar_url' | 'avatar_source' | 'ai_avatar_url'>
  participants: CalloutParticipantWithProfile[]
  spectator_count: number
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
  | 'sleep'
  | 'quest'
  | 'chat'
  | 'streak_bonus'
  | 'comeback'
  | 'recipe'
  | 'grocery_post'
  | 'supplement_post'

// ---- The Belt ----------------------------------------------------------
export type CircleBelt = Database['public']['Tables']['circle_belts']['Row']
export type TitleChallenge = Database['public']['Tables']['title_challenges']['Row']
export type TitleChallengeScore = Database['public']['Tables']['title_challenge_scores']['Row']
export type TitleChallengeWeek = Database['public']['Tables']['title_challenge_weeks']['Row']
export type ChampionshipRecord = Database['public']['Tables']['championship_records']['Row']
export type DefenseCycle = CircleBelt['defense_cycle']
export type EliminationReason = NonNullable<TitleChallengeScore['eliminated_reason']>

// Point weights stored as JSONB on the belt and snapshotted per challenge.
export interface CategoryWeights {
  login_streak: number
  training_volume: number
  nutrition: number
  steps: number
}

export interface BeltStanding extends TitleChallengeScore {
  display_name: string
  avatar_url: string | null
  is_champion: boolean
}

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
