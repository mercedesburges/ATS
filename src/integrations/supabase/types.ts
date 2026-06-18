export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      candidate_comments: {
        Row: {
          author_id: string
          candidate_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
        }
        Insert: {
          author_id: string
          candidate_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Update: {
          author_id?: string
          candidate_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "candidate_comments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_experiences: {
        Row: {
          candidate_id: string
          company: string | null
          description: string | null
          id: string
          period: string | null
          position: number
          role: string
        }
        Insert: {
          candidate_id: string
          company?: string | null
          description?: string | null
          id?: string
          period?: string | null
          position?: number
          role: string
        }
        Update: {
          candidate_id?: string
          company?: string | null
          description?: string | null
          id?: string
          period?: string | null
          position?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_experiences_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          candidate_id: string
          id: string
          is_critical: boolean
          position: number
          skill_name: string
          years: number | null
        }
        Insert: {
          candidate_id: string
          id?: string
          is_critical?: boolean
          position?: number
          skill_name: string
          years?: number | null
        }
        Update: {
          candidate_id?: string
          id?: string
          is_critical?: boolean
          position?: number
          skill_name?: string
          years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_status_history: {
        Row: {
          candidate_id: string
          changed_by: string | null
          created_at: string
          feedback: string | null
          from_stage_id: string | null
          id: string
          to_stage_id: string | null
        }
        Insert: {
          candidate_id: string
          changed_by?: string | null
          created_at?: string
          feedback?: string | null
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string | null
        }
        Update: {
          candidate_id?: string
          changed_by?: string | null
          created_at?: string
          feedback?: string | null
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_status_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_status_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_status_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          current_stage_id: string | null
          cv_url: string | null
          email: string | null
          full_name: string
          headline: string | null
          id: string
          job_id: string
          linkedin_url: string | null
          phone: string | null
          photo_url: string | null
          summary: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["candidate_visibility"]
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          current_stage_id?: string | null
          cv_url?: string | null
          email?: string | null
          full_name: string
          headline?: string | null
          id?: string
          job_id: string
          linkedin_url?: string | null
          phone?: string | null
          photo_url?: string | null
          summary?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["candidate_visibility"]
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          current_stage_id?: string | null
          cv_url?: string | null
          email?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          job_id?: string
          linkedin_url?: string | null
          phone?: string | null
          photo_url?: string | null
          summary?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["candidate_visibility"]
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          contact_area: string | null
          contact_position: string | null
          contact_type: Database["public"]["Enums"]["contact_type"] | null
          created_at: string
          first_name: string | null
          id: string
          invited_email: string | null
          last_name: string | null
          user_id: string | null
        }
        Insert: {
          client_id: string
          contact_area?: string | null
          contact_position?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          first_name?: string | null
          id?: string
          invited_email?: string | null
          last_name?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string
          contact_area?: string | null
          contact_position?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"] | null
          created_at?: string
          first_name?: string | null
          id?: string
          invited_email?: string | null
          last_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metric_defaults: {
        Row: {
          client_id: string
          created_at: string
          hiring_team_alert_days: number
          hiring_team_warn_days: number
          id: string
          recruiter_alert_days: number
          recruiter_warn_days: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          hiring_team_alert_days?: number
          hiring_team_warn_days?: number
          id?: string
          recruiter_alert_days?: number
          recruiter_warn_days?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          hiring_team_alert_days?: number
          hiring_team_warn_days?: number
          id?: string
          recruiter_alert_days?: number
          recruiter_warn_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_metric_defaults_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_stage_defaults: {
        Row: {
          category: string
          client_id: string
          color: string | null
          created_at: string
          id: string
          is_rejected: boolean
          is_terminal: boolean
          name: string
          position: number
          triggers_availability_email: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          client_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_rejected?: boolean
          is_terminal?: boolean
          name: string
          position: number
          triggers_availability_email?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_rejected?: boolean
          is_terminal?: boolean
          name?: string
          position?: number
          triggers_availability_email?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_stage_defaults_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      email_automations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean
          name: string
          prompt: string
          subject: string
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          prompt: string
          subject?: string
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          prompt?: string
          subject?: string
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: []
      }
      interview_videos: {
        Row: {
          ai_analysis: Json | null
          candidate_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          questions: Json | null
          thumbnail_url: string | null
          video_url: string
        }
        Insert: {
          ai_analysis?: Json | null
          candidate_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          questions?: Json | null
          thumbnail_url?: string | null
          video_url: string
        }
        Update: {
          ai_analysis?: Json | null
          candidate_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          questions?: Json | null
          thumbnail_url?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_videos_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_metrics: {
        Row: {
          created_at: string
          hiring_team_alert_days: number
          hiring_team_warn_days: number
          job_id: string
          recruiter_alert_days: number
          recruiter_warn_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hiring_team_alert_days?: number
          hiring_team_warn_days?: number
          job_id: string
          recruiter_alert_days?: number
          recruiter_warn_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hiring_team_alert_days?: number
          hiring_team_warn_days?: number
          job_id?: string
          recruiter_alert_days?: number
          recruiter_warn_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          category: string
          color: string | null
          created_at: string
          id: string
          is_enabled: boolean
          is_rejected: boolean
          is_terminal: boolean
          job_id: string
          name: string
          position: number
          triggers_availability_email: boolean
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_rejected?: boolean
          is_terminal?: boolean
          job_id: string
          name: string
          position: number
          triggers_availability_email?: boolean
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_rejected?: boolean
          is_terminal?: boolean
          job_id?: string
          name?: string
          position?: number
          triggers_availability_email?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          area: string | null
          bot_name: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          interview_deadline_hours: number | null
          is_active: boolean
          language: string | null
          title: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          bot_name?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          interview_deadline_hours?: number | null
          is_active?: boolean
          language?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          bot_name?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          interview_deadline_hours?: number | null
          is_active?: boolean
          language?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_defaults: {
        Row: {
          created_at: string
          hiring_team_alert_days: number
          hiring_team_warn_days: number
          recruiter_alert_days: number
          recruiter_warn_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hiring_team_alert_days?: number
          hiring_team_warn_days?: number
          recruiter_alert_days?: number
          recruiter_warn_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hiring_team_alert_days?: number
          hiring_team_warn_days?: number
          recruiter_alert_days?: number
          recruiter_warn_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stage_defaults: {
        Row: {
          category: string
          color: string | null
          created_at: string
          id: string
          is_rejected: boolean
          is_terminal: boolean
          name: string
          position: number
          triggers_availability_email: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_rejected?: boolean
          is_terminal?: boolean
          name: string
          position: number
          triggers_availability_email?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_rejected?: boolean
          is_terminal?: boolean
          name?: string
          position?: number
          triggers_availability_email?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      user_belongs_to_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      automation_trigger:
        | "cv_uploaded"
        | "stage_changed"
        | "candidate_rejected"
        | "offer_sent"
      candidate_visibility: "draft" | "published"
      contact_type: "hr" | "hiring_manager" | "team_member" | "recruiter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      automation_trigger: [
        "cv_uploaded",
        "stage_changed",
        "candidate_rejected",
        "offer_sent",
      ],
      candidate_visibility: ["draft", "published"],
      contact_type: ["hr", "hiring_manager", "team_member", "recruiter"],
    },
  },
} as const
