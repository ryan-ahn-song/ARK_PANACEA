export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      health_logs: {
        Row: {
          created_at: string | null
          event_date: string
          id: string
          location: string | null
          note: string | null
          severity: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_date?: string
          id?: string
          location?: string | null
          note?: string | null
          severity?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_date?: string
          id?: string
          location?: string | null
          note?: string | null
          severity?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      heatmap_reports: {
        Row: {
          disease_tag: string | null
          id: string
          intensity: number
          lat: number
          lng: number
          neighborhood: string | null
          reported_at: string | null
          trend: string | null
        }
        Insert: {
          disease_tag?: string | null
          id?: string
          intensity?: number
          lat: number
          lng: number
          neighborhood?: string | null
          reported_at?: string | null
          trend?: string | null
        }
        Update: {
          disease_tag?: string | null
          id?: string
          intensity?: number
          lat?: number
          lng?: number
          neighborhood?: string | null
          reported_at?: string | null
          trend?: string | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          tag: string | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          tag?: string | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          tag?: string | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      pathologies: {
        Row: {
          affected_zones: Json | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          symptom_clusters: Json | null
        }
        Insert: {
          affected_zones?: Json | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          symptom_clusters?: Json | null
        }
        Update: {
          affected_zones?: Json | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          symptom_clusters?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          guardian_level: number | null
          id: string
          percentile: number | null
          tier: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          guardian_level?: number | null
          id: string
          percentile?: number | null
          tier?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          guardian_level?: number | null
          id?: string
          percentile?: number | null
          tier?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      risk_events: {
        Row: {
          air_quality: string | null
          aqi: string | null
          description: string | null
          humidity_pct: number | null
          id: string
          level: string
          location: string | null
          recorded_at: string | null
          temp_celsius: number | null
        }
        Insert: {
          air_quality?: string | null
          aqi?: string | null
          description?: string | null
          humidity_pct?: number | null
          id?: string
          level?: string
          location?: string | null
          recorded_at?: string | null
          temp_celsius?: number | null
        }
        Update: {
          air_quality?: string | null
          aqi?: string | null
          description?: string | null
          humidity_pct?: number | null
          id?: string
          level?: string
          location?: string | null
          recorded_at?: string | null
          temp_celsius?: number | null
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id:          string
          user_id:     string | null
          reward_code: string
          redeemed_at: string | null
        }
        Insert: {
          id?:          string
          user_id?:     string | null
          reward_code:  string
          redeemed_at?: string | null
        }
        Update: {
          id?:          string
          user_id?:     string | null
          reward_code?: string
          redeemed_at?: string | null
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed_at: string        // DATE (YYYY-MM-DD)
          id: string
          mission_id: string | null
          streak_day: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string       // DATE (YYYY-MM-DD), defaults to CURRENT_DATE
          id?: string
          mission_id?: string | null
          streak_day?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string
          id?: string
          mission_id?: string | null
          streak_day?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_quota_log: {
        Row: {
          key:        string
          window_end: string
          count:      number
        }
        Insert: {
          key:        string
          window_end: string
          count?:     number
        }
        Update: {
          key?:        string
          window_end?: string
          count?:      number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      consume_ai_analysis_quota: {
        Args: {
          p_ip_hash: string
        }
        Returns: {
          allowed: boolean
          reason: string | null
          retry_after_seconds: number
          minute_remaining: number
          day_remaining: number
        }[]
      }
    }
  }
}

// Convenience type aliases
export type Profile       = Database["public"]["Tables"]["profiles"]["Row"];
export type HealthLog     = Database["public"]["Tables"]["health_logs"]["Row"];
export type RiskEvent     = Database["public"]["Tables"]["risk_events"]["Row"];
export type Mission       = Database["public"]["Tables"]["missions"]["Row"];
export type UserMission   = Database["public"]["Tables"]["user_missions"]["Row"];
export type Pathology     = Database["public"]["Tables"]["pathologies"]["Row"];
export type HeatmapReport       = Database["public"]["Tables"]["heatmap_reports"]["Row"];
export type RewardRedemption    = Database["public"]["Tables"]["reward_redemptions"]["Row"];
