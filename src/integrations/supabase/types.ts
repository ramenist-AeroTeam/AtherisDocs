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
      achievement_grants: {
        Row: {
          achievement_id: string
          granted_at: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          granted_at?: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_grants_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          created_at: string
          created_by: string
          description: string
          emoji: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          emoji?: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          emoji?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      aero_requests: {
        Row: {
          aero_username: string
          created_at: string
          id: string
          notes: string
          pets_text: string
          processed_at: string | null
          processed_by: string | null
          role_request: string
          status: string
          user_id: string
        }
        Insert: {
          aero_username?: string
          created_at?: string
          id?: string
          notes?: string
          pets_text?: string
          processed_at?: string | null
          processed_by?: string | null
          role_request?: string
          status?: string
          user_id: string
        }
        Update: {
          aero_username?: string
          created_at?: string
          id?: string
          notes?: string
          pets_text?: string
          processed_at?: string | null
          processed_by?: string | null
          role_request?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      arena_matches: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          max_players: number
          mode: string
          round_deadline: string | null
          round_no: number
          special_window_end: string | null
          started_at: string | null
          status: string
          winner_team: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          max_players: number
          mode: string
          round_deadline?: string | null
          round_no?: number
          special_window_end?: string | null
          started_at?: string | null
          status?: string
          winner_team?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          mode?: string
          round_deadline?: string | null
          round_no?: number
          special_window_end?: string | null
          started_at?: string | null
          status?: string
          winner_team?: number | null
        }
        Relationships: []
      }
      arena_players: {
        Row: {
          current_move: string | null
          hp: number
          id: string
          joined_at: string
          last_seen: string
          locked_move: string | null
          match_id: string
          ready: boolean
          slot: number
          team: number
          user_id: string
        }
        Insert: {
          current_move?: string | null
          hp?: number
          id?: string
          joined_at?: string
          last_seen?: string
          locked_move?: string | null
          match_id: string
          ready?: boolean
          slot: number
          team: number
          user_id: string
        }
        Update: {
          current_move?: string | null
          hp?: number
          id?: string
          joined_at?: string
          last_seen?: string
          locked_move?: string | null
          match_id?: string
          ready?: boolean
          slot?: number
          team?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "arena_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_rounds: {
        Row: {
          id: string
          match_id: string
          payload: Json
          resolved_at: string
          round_no: number
        }
        Insert: {
          id?: string
          match_id: string
          payload?: Json
          resolved_at?: string
          round_no: number
        }
        Update: {
          id?: string
          match_id?: string
          payload?: Json
          resolved_at?: string
          round_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "arena_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      garden_plants: {
        Row: {
          block_id: string
          created_at: string
          emoji: string
          food: number
          happiness: number
          id: string
          is_equipped: boolean
          level: number
          name: string
          noodles_per_hour: number
          plant_type: string
          position: number
          user_id: string
          water: number
        }
        Insert: {
          block_id: string
          created_at?: string
          emoji?: string
          food?: number
          happiness?: number
          id?: string
          is_equipped?: boolean
          level?: number
          name?: string
          noodles_per_hour?: number
          plant_type?: string
          position?: number
          user_id: string
          water?: number
        }
        Update: {
          block_id?: string
          created_at?: string
          emoji?: string
          food?: number
          happiness?: number
          id?: string
          is_equipped?: boolean
          level?: number
          name?: string
          noodles_per_hour?: number
          plant_type?: string
          position?: number
          user_id?: string
          water?: number
        }
        Relationships: [
          {
            foreignKeyName: "garden_plants_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "tab_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          block_id: string
          category: string
          created_at: string
          emoji: string
          id: string
          name: string
          position: number
          quantity: number
          user_id: string
        }
        Insert: {
          block_id: string
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          name: string
          position?: number
          quantity?: number
          user_id: string
        }
        Update: {
          block_id?: string
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          position?: number
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "tab_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_emoji: string
          avatar_url: string | null
          created_at: string
          dev_build: boolean
          display_name: string
          email: string | null
          font_pref: string
          id: string
          level: number
          lumina: number
          noodles: number
          tutorial_seen: boolean
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          avatar_emoji?: string
          avatar_url?: string | null
          created_at?: string
          dev_build?: boolean
          display_name?: string
          email?: string | null
          font_pref?: string
          id?: string
          level?: number
          lumina?: number
          noodles?: number
          tutorial_seen?: boolean
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          avatar_emoji?: string
          avatar_url?: string | null
          created_at?: string
          dev_build?: boolean
          display_name?: string
          email?: string | null
          font_pref?: string
          id?: string
          level?: number
          lumina?: number
          noodles?: number
          tutorial_seen?: boolean
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      tab_blocks: {
        Row: {
          block_type: string
          created_at: string
          data: Json
          gradient_from: string
          gradient_mode: string
          gradient_to: string
          id: string
          position: number
          tab_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_type?: string
          created_at?: string
          data?: Json
          gradient_from?: string
          gradient_mode?: string
          gradient_to?: string
          id?: string
          position?: number
          tab_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_type?: string
          created_at?: string
          data?: Json
          gradient_from?: string
          gradient_mode?: string
          gradient_to?: string
          id?: string
          position?: number
          tab_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tab_blocks_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "user_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      tab_buttons: {
        Row: {
          action_payload: string
          action_type: string
          block_id: string | null
          color: string
          cost_amount: number
          cost_currency: string
          created_at: string
          id: string
          label: string
          position: number
          reward_item: string
          tab_id: string
          user_id: string
        }
        Insert: {
          action_payload?: string
          action_type?: string
          block_id?: string | null
          color?: string
          cost_amount?: number
          cost_currency?: string
          created_at?: string
          id?: string
          label: string
          position?: number
          reward_item?: string
          tab_id: string
          user_id: string
        }
        Update: {
          action_payload?: string
          action_type?: string
          block_id?: string | null
          color?: string
          cost_amount?: number
          cost_currency?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          reward_item?: string
          tab_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tab_buttons_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "tab_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_buttons_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "user_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          custom_label: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          custom_label?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          custom_label?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tabs: {
        Row: {
          content: string
          created_at: string
          document: Json
          editor_theme: Json
          emoji: string
          id: string
          is_public: boolean
          kind: string
          last_saved_at: string
          level_lock: number
          name: string
          position: number
          startup_sound: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          document?: Json
          editor_theme?: Json
          emoji?: string
          id?: string
          is_public?: boolean
          kind?: string
          last_saved_at?: string
          level_lock?: number
          name?: string
          position?: number
          startup_sound?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document?: Json
          editor_theme?: Json
          emoji?: string
          id?: string
          is_public?: boolean
          kind?: string
          last_saved_at?: string
          level_lock?: number
          name?: string
          position?: number
          startup_sound?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_auto_property: {
        Args: { _display_name?: string; _user_id: string }
        Returns: string
      }
      grant_currency: {
        Args: { _lumina?: number; _noodles?: number }
        Returns: undefined
      }
      grant_inventory_item: {
        Args: {
          _category?: string
          _emoji?: string
          _name: string
          _qty?: number
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "co_owner" | "dev" | "member" | "custom"
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
      app_role: ["owner", "co_owner", "dev", "member", "custom"],
    },
  },
} as const
