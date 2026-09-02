export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

/**
 * How one exercise is measured. Drives which fields the logger shows and, via
 * a database trigger, the coarse strength/cardio flag the scoring functions
 * read. `isometric_force` is only for real measuring devices — the app never
 * infers a force value.
 */
export type MeasurementType =
  | 'strength'
  | 'bodyweight'
  | 'isometric'
  | 'isometric_force'
  | 'distance_cardio'
  | 'intervals'
  | 'mobility'

/**
 * Units `meal_logs.quantity_unit` accepts. Mirrors the check constraint; the
 * richer domain model, including gram conversions, lives in `src/lib/units.ts`.
 */
export type QuantityUnitColumn =
  | 'g' | 'kg' | 'oz'
  | 'ml' | 'l'
  | 'tsp' | 'tbsp' | 'cup'
  | 'piece' | 'slice' | 'serving' | 'bowl' | 'plate' | 'ladle'

export type CalloutFormatColumn =
  | '1v1' | 'triple_threat' | 'fatal_4way' | 'fatal_5way' | 'elimination' | 'open'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          avatar_source: 'photo' | 'ai'
          ai_avatar_url: string | null
          total_xp: number
          weekly_xp: number
          baseline_weekly_xp: number | null
          height_cm: number | null
          gender: 'male' | 'female' | null
          weight_kg: number | null
          age: number | null
          body_fat_percentage: number | null
          muscle_mass_kg: number | null
          preferred_height_unit: 'cm' | 'ft'
          preferred_weight_unit: 'kg' | 'lb'
          fitness_goal: 'lose_fat' | 'build_muscle' | 'recomposition' | 'maintain'
          calorie_goal_mode: 'recommended' | 'custom'
          custom_calorie_goal: number | null
          level: number
          current_streak: number
          longest_streak: number
          last_active_date: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          avatar_url?: string | null
          avatar_source?: 'photo' | 'ai'
          ai_avatar_url?: string | null
          total_xp?: number
          weekly_xp?: number
          baseline_weekly_xp?: number | null
          height_cm?: number | null
          gender?: 'male' | 'female' | null
          weight_kg?: number | null
          age?: number | null
          body_fat_percentage?: number | null
          muscle_mass_kg?: number | null
          preferred_height_unit?: 'cm' | 'ft'
          preferred_weight_unit?: 'kg' | 'lb'
          fitness_goal?: 'lose_fat' | 'build_muscle' | 'recomposition' | 'maintain'
          calorie_goal_mode?: 'recommended' | 'custom'
          custom_calorie_goal?: number | null
          level?: number
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      circles: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          max_members: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          max_members?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['circles']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'circles_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['circle_members']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'circle_members_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'circle_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invite_codes: {
        Row: {
          id: string
          circle_id: string
          code: string
          created_by: string
          max_uses: number
          use_count: number
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          code: string
          created_by: string
          max_uses?: number
          use_count?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['invite_codes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'invite_codes_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invite_codes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_quests: {
        Row: {
          id: string
          title: string
          description: string | null
          xp_reward: number
          quest_type: string
          is_active: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          xp_reward: number
          quest_type: string
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['daily_quests']['Insert']>
        Relationships: []
      }
      quest_completions: {
        Row: {
          id: string
          user_id: string
          quest_id: string
          circle_id: string
          completed_date: string
          xp_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quest_id: string
          circle_id: string
          completed_date?: string
          xp_earned: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['quest_completions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'quest_completions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quest_completions_quest_id_fkey'
            columns: ['quest_id']
            isOneToOne: false
            referencedRelation: 'daily_quests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quest_completions_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          title: string
          notes: string | null
          difficulty: number | null
          duration_minutes: number | null
          xp_earned: number
          logged_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          title: string
          notes?: string | null
          difficulty?: number | null
          duration_minutes?: number | null
          xp_earned?: number
          logged_at?: string
        }
        Update: Partial<Database['public']['Tables']['workouts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workouts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string
          sets: number | null
          reps: number | null
          weight_kg: number | null
          notes: string | null
          sort_order: number
          wger_exercise_id: number | null
          exercise_image_url: string | null
          exercise_type: 'strength' | 'cardio'
          weight_mode: 'added' | 'assisted' | null
          duration_seconds: number | null
          distance_km: number | null
          avg_heart_rate_bpm: number | null
          cardio_intensity: 'low' | 'moderate' | 'high' | null
          measurement_type: MeasurementType
          equipment: string | null
          equipment_photo_path: string | null
          rest_seconds: number | null
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name: string
          sets?: number | null
          reps?: number | null
          weight_kg?: number | null
          notes?: string | null
          sort_order?: number
          wger_exercise_id?: number | null
          exercise_image_url?: string | null
          // Derived in the database from measurement_type by a trigger; sending
          // it is harmless but never authoritative.
          exercise_type?: 'strength' | 'cardio'
          weight_mode?: 'added' | 'assisted' | null
          duration_seconds?: number | null
          distance_km?: number | null
          avg_heart_rate_bpm?: number | null
          cardio_intensity?: 'low' | 'moderate' | 'high' | null
          measurement_type?: MeasurementType
          equipment?: string | null
          equipment_photo_path?: string | null
          rest_seconds?: number | null
        }
        Update: Partial<Database['public']['Tables']['workout_exercises']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey'
            columns: ['workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      workout_sets: {
        Row: {
          id: string
          workout_exercise_id: string
          set_index: number
          completed: boolean
          weight_kg: number | null
          weight_mode: 'added' | 'assisted' | null
          reps: number | null
          rir: number | null
          rpe: number | null
          position_label: string | null
          joint_angle_degrees: number | null
          hold_seconds: number | null
          peak_force_n: number | null
          avg_force_n: number | null
          force_device: string | null
          distance_km: number | null
          duration_seconds: number | null
          incline_pct: number | null
          resistance_level: number | null
          work_seconds: number | null
          recovery_seconds: number | null
          rounds: number | null
          intensity: 'low' | 'moderate' | 'high' | null
          range_rating: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_exercise_id: string
          set_index: number
          completed?: boolean
          weight_kg?: number | null
          weight_mode?: 'added' | 'assisted' | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          position_label?: string | null
          joint_angle_degrees?: number | null
          hold_seconds?: number | null
          peak_force_n?: number | null
          avg_force_n?: number | null
          force_device?: string | null
          distance_km?: number | null
          duration_seconds?: number | null
          incline_pct?: number | null
          resistance_level?: number | null
          work_seconds?: number | null
          recovery_seconds?: number | null
          rounds?: number | null
          intensity?: 'low' | 'moderate' | 'high' | null
          range_rating?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workout_sets']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workout_sets_workout_exercise_id_fkey'
            columns: ['workout_exercise_id']
            isOneToOne: false
            referencedRelation: 'workout_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      body_measurements: {
        Row: {
          id: string
          user_id: string
          measured_at: string
          weight_kg: number | null
          body_fat_percentage: number | null
          muscle_mass_kg: number | null
          visceral_fat_rating: number | null
          source: 'manual' | 'inbody' | 'scale'
          notes: string | null
          scan_path: string | null
          muscle_mass_basis: 'skeletal' | 'total' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          measured_at?: string
          weight_kg?: number | null
          body_fat_percentage?: number | null
          muscle_mass_kg?: number | null
          visceral_fat_rating?: number | null
          source?: 'manual' | 'inbody' | 'scale'
          notes?: string | null
          scan_path?: string | null
          muscle_mass_basis?: 'skeletal' | 'total' | null
        }
        Update: Partial<Database['public']['Tables']['body_measurements']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'body_measurements_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      meal_photo_analyses: {
        Row: {
          id: string
          user_id: string
          photo_path: string
          model: string
          items: Json
          input_tokens: number | null
          output_tokens: number | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      circle_belts: {
        Row: {
          id: string
          circle_id: string
          current_champion_id: string | null
          reign_started_at: string | null
          defense_cycle: 'weekly' | 'monthly' | 'quarterly'
          current_cycle_started_at: string
          category_weights: Json
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          defense_cycle?: 'weekly' | 'monthly' | 'quarterly'
          category_weights?: Json
        }
        Update: Partial<Database['public']['Tables']['circle_belts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'circle_belts_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: true
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'circle_belts_current_champion_id_fkey'
            columns: ['current_champion_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      title_challenges: {
        Row: {
          id: string
          circle_id: string
          started_at: string
          ends_at: string
          status: 'active' | 'resolved' | 'extended'
          winner_user_id: string | null
          resolved_at: string | null
          weights_snapshot: Json
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'title_challenges_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'title_challenges_winner_user_id_fkey'
            columns: ['winner_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      title_challenge_scores: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          login_streak_points: number
          training_volume_points: number
          nutrition_points: number
          steps_points: number
          total_points: number
          is_eliminated: boolean
          eliminated_at: string | null
          eliminated_reason: 'login_streak_broken' | 'missed_weekly_sessions' | null
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'title_challenge_scores_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'title_challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'title_challenge_scores_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      title_challenge_weeks: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          week_number: number
          week_start: string
          week_end: string
          valid_session_count: number
          requirement_met: boolean
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'title_challenge_weeks_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'title_challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'title_challenge_weeks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      championship_records: {
        Row: {
          id: string
          user_id: string
          total_reigns: number
          total_defenses: number
          longest_reign_cycles: number
          current_streak_as_champion: number
          first_won_at: string | null
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'championship_records_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      training_volume_anomalies: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          workout_id: string | null
          workout_exercise_id: string | null
          exercise_name: string
          previous_weight_kg: number | null
          current_weight_kg: number | null
          weight_increase_pct: number | null
          detected_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      workout_plans: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          title: string
          source_workout_id: string | null
          days_of_week: number[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          title: string
          source_workout_id?: string | null
          days_of_week: number[]
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workout_plans']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workout_plans_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_plans_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_plans_source_workout_id_fkey'
            columns: ['source_workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          food_name: string
          calories: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          notes: string | null
          xp_earned: number
          logged_at: string
          quantity: number | null
          quantity_unit: QuantityUnitColumn | null
          estimated_grams: number | null
          off_food_id: string | null
          food_image_url: string | null
          photo_path: string | null
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          food_name: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          notes?: string | null
          xp_earned?: number
          logged_at?: string
          quantity?: number | null
          quantity_unit?: QuantityUnitColumn | null
          estimated_grams?: number | null
          off_food_id?: string | null
          food_image_url?: string | null
          photo_path?: string | null
        }
        Update: Partial<Database['public']['Tables']['meal_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'meal_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_logs_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      step_logs: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          step_count: number
          step_goal: number
          goal_hit: boolean
          xp_earned: number
          log_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          step_count: number
          step_goal?: number
          goal_hit?: boolean
          xp_earned?: number
          log_date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['step_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'step_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'step_logs_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      sleep_logs: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          bedtime: string
          wake_time: string
          quality: number | null
          notes: string | null
          xp_earned: number
          log_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          bedtime: string
          wake_time: string
          quality?: number | null
          notes?: string | null
          xp_earned?: number
          log_date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sleep_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'sleep_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sleep_logs_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      xp_events: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          action_type: string
          xp_amount: number
          description: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          action_type: string
          xp_amount: number
          description?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['xp_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'xp_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'xp_events_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          circle_id: string | null
          callout_id: string | null
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          circle_id?: string | null
          callout_id?: string | null
          sender_id: string
          content: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'chat_messages_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_callout_id_fkey'
            columns: ['callout_id']
            isOneToOne: false
            referencedRelation: 'callouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      callouts: {
        Row: {
          id: string
          circle_id: string
          format: CalloutFormatColumn
          issuer_id: string
          activity_type: string
          personal_target: string | null
          stakes: string | null
          start_time: string
          status: 'pending' | 'active' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          format: CalloutFormatColumn
          issuer_id: string
          activity_type: string
          personal_target?: string | null
          stakes?: string | null
          start_time: string
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['callouts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'callouts_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'callouts_issuer_id_fkey'
            columns: ['issuer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      callout_participants: {
        Row: {
          id: string
          callout_id: string
          user_id: string
          personal_target: string | null
          status: 'invited' | 'accepted' | 'declined'
          final_score: number | null
        }
        Insert: {
          id?: string
          callout_id: string
          user_id: string
          personal_target?: string | null
          status?: 'invited' | 'accepted' | 'declined'
          final_score?: number | null
        }
        Update: Partial<Database['public']['Tables']['callout_participants']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'callout_participants_callout_id_fkey'
            columns: ['callout_id']
            isOneToOne: false
            referencedRelation: 'callouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'callout_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      callout_spectators: {
        Row: {
          callout_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          callout_id: string
          user_id: string
          viewed_at?: string
        }
        Update: Partial<Database['public']['Tables']['callout_spectators']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'callout_spectators_callout_id_fkey'
            columns: ['callout_id']
            isOneToOne: false
            referencedRelation: 'callouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'callout_spectators_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: 'ios' | 'android' | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform?: 'ios' | 'android' | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          title: string
          ingredients: string
          instructions: string
          calories_estimate: number | null
          protein_estimate: number | null
          estimated_cost: number | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          title: string
          ingredients: string
          instructions: string
          calories_estimate?: number | null
          protein_estimate?: number | null
          estimated_cost?: number | null
          image_url?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'recipes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipes_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      grocery_posts: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          item_name: string
          store: string | null
          price: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          item_name: string
          store?: string | null
          price?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['grocery_posts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'grocery_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grocery_posts_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      supplement_posts: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          supplement_name: string
          category: string | null
          price: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          supplement_name: string
          category?: string | null
          price?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['supplement_posts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'supplement_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplement_posts_circle_id_fkey'
            columns: ['circle_id']
            isOneToOne: false
            referencedRelation: 'circles'
            referencedColumns: ['id']
          },
        ]
      }
      motivational_messages: {
        Row: {
          id: string
          message_type: string
          content: string
          is_active: boolean
        }
        Insert: {
          id?: string
          message_type: string
          content: string
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['motivational_messages']['Insert']>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Opens a scoring period for a circle. Gated on membership server-side;
      // returns the new challenge id.
      start_title_challenge: {
        Args: { p_circle_id: string }
        Returns: string
      }
      // Authoritative daily calorie target. Single source of truth shared by
      // belt scoring and (eventually) the meal screen's Energy Corner.
      belt_daily_calorie_target: {
        Args: { p_user_id: string; p_date: string }
        Returns: number | null
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
