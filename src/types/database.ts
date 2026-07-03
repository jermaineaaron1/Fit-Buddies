export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          total_xp: number
          weekly_xp: number
          level: number
          current_streak: number
          longest_streak: number
          last_active_date: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['circles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['circles']['Insert']>
      }
      circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['circle_members']['Row'], 'id' | 'joined_at'>
        Update: Partial<Database['public']['Tables']['circle_members']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['invite_codes']['Row'], 'id' | 'use_count' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invite_codes']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['daily_quests']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['daily_quests']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['quest_completions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['quest_completions']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['workouts']['Row'], 'id' | 'logged_at'>
        Update: Partial<Database['public']['Tables']['workouts']['Insert']>
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
        }
        Insert: Omit<Database['public']['Tables']['workout_exercises']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['workout_exercises']['Insert']>
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
        }
        Insert: Omit<Database['public']['Tables']['meal_logs']['Row'], 'id' | 'logged_at'>
        Update: Partial<Database['public']['Tables']['meal_logs']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['step_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['step_logs']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['xp_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['xp_events']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          circle_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: 'ios' | 'android' | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_tokens']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['recipes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['grocery_posts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['grocery_posts']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['supplement_posts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['supplement_posts']['Insert']>
      }
      motivational_messages: {
        Row: {
          id: string
          message_type: string
          content: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['motivational_messages']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['motivational_messages']['Insert']>
      }
    }
  }
}
