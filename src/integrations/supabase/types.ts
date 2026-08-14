export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      channels: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          min_age: number | null
          min_level: number | null
          name: string
          position: number | null
          server_id: string
          topic: string | null
          topic_updated_at: string | null
          type: Database["public"]["Enums"]["channel_type"]
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          min_age?: number | null
          min_level?: number | null
          name: string
          position?: number | null
          server_id: string
          topic?: string | null
          topic_updated_at?: string | null
          type?: Database["public"]["Enums"]["channel_type"]
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          min_age?: number | null
          min_level?: number | null
          name?: string
          position?: number | null
          server_id?: string
          topic?: string | null
          topic_updated_at?: string | null
          type?: Database["public"]["Enums"]["channel_type"]
        }
        Relationships: [
          {
            foreignKeyName: "channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number | null
          server_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number | null
          server_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number | null
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_categories_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          author_id: string
          channel_id: string
          content: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean | null
          pinned_at: string | null
          pinned_by: string | null
          reply_to: string | null
          thread_root: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          author_id: string
          channel_id: string
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to?: string | null
          thread_root?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          author_id?: string
          channel_id?: string
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to?: string | null
          thread_root?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_root_fkey"
            columns: ["thread_root"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          exif: Json | null
          height: number | null
          id: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          url: string
          width: number | null
        }
        Insert: {
          exif?: Json | null
          height?: number | null
          id?: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          url: string
          width?: number | null
        }
        Update: {
          exif?: Json | null
          height?: number | null
          id?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_verified: boolean | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          bio_rich: Json | null
          birthdate: string | null
          created_at: string
          current_plan: Database["public"]["Enums"]["subscription_plan"]
          display_name: string | null
          external_links: Json | null
          id: string
          message_style: Json | null
          name_color: string | null
          name_colors: Json | null
          name_effect: string | null
          social_links: Json | null
          status: string | null
          status_emoji: string | null
          status_text: string | null
          updated_at: string
          username: string
        }
        Insert: {
          age_verified?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          bio_rich?: Json | null
          birthdate?: string | null
          created_at?: string
          current_plan?: Database["public"]["Enums"]["subscription_plan"]
          display_name?: string | null
          external_links?: Json | null
          id: string
          message_style?: Json | null
          name_color?: string | null
          name_colors?: Json | null
          name_effect?: string | null
          social_links?: Json | null
          status?: string | null
          status_emoji?: string | null
          status_text?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          age_verified?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          bio_rich?: Json | null
          birthdate?: string | null
          created_at?: string
          current_plan?: Database["public"]["Enums"]["subscription_plan"]
          display_name?: string | null
          external_links?: Json | null
          id?: string
          message_style?: Json | null
          name_color?: string | null
          name_colors?: Json | null
          name_effect?: string | null
          social_links?: Json | null
          status?: string | null
          status_emoji?: string | null
          status_text?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      dm_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
        }
        Relationships: []
      }
      dm_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          author_id: string
          content: string | null
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          reply_to: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          author_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          reply_to?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          author_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          reply_to?: string | null
        }
        Relationships: []
      }
      server_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: []
      }
      server_mutes: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          muted_by: string
          reason: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          muted_by: string
          reason?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          muted_by?: string
          reason?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          server_id: string
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          server_id: string
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          server_id?: string
          use_count?: number
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          action: string
          created_at: string
          duration_hours: number | null
          id: string
          mod_user_id: string | null
          reason: string | null
          server_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_hours?: number | null
          id?: string
          mod_user_id?: string | null
          reason?: string | null
          server_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_hours?: number | null
          id?: string
          mod_user_id?: string | null
          reason?: string | null
          server_id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      moderation_reports: {
        Row: {
          channel_id: string | null
          created_at: string
          id: string
          message_id: string | null
          reason: string
          reported_by: string
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          reason: string
          reported_by: string
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          reason?: string
          reported_by?: string
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      server_events: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          server_id: string
          starts_at: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          server_id: string
          starts_at: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          server_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_events_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_member_roles: {
        Row: {
          member_id: string
          role_id: string
        }
        Insert: {
          member_id: string
          role_id: string
        }
        Update: {
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "server_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "server_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      server_members: {
        Row: {
          id: string
          joined_at: string
          level: number
          nickname: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          level?: number
          nickname?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          level?: number
          nickname?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_roles: {
        Row: {
          color: string | null
          created_at: string
          gif_tag_url: string | null
          id: string
          level: number
          name: string
          permissions: Json
          server_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          gif_tag_url?: string | null
          id?: string
          level: number
          name: string
          permissions?: Json
          server_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          gif_tag_url?: string | null
          id?: string
          level?: number
          name?: string
          permissions?: Json
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_roles_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          focus_tags: string[] | null
          icon_url: string | null
          id: string
          member_count: number
          min_age: number | null
          name: string
          owner_id: string
          privacy: Database["public"]["Enums"]["server_privacy"]
          slug: string | null
          template: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          focus_tags?: string[] | null
          icon_url?: string | null
          id?: string
          member_count?: number
          min_age?: number | null
          name: string
          owner_id: string
          privacy?: Database["public"]["Enums"]["server_privacy"]
          slug?: string | null
          template?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          focus_tags?: string[] | null
          icon_url?: string | null
          id?: string
          member_count?: number
          min_age?: number | null
          name?: string
          owner_id?: string
          privacy?: Database["public"]["Enums"]["server_privacy"]
          slug?: string | null
          template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sticker_packs: {
        Row: {
          created_at: string
          id: string
          is_pro_only: boolean | null
          name: string
          owner_id: string | null
          server_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_pro_only?: boolean | null
          name: string
          owner_id?: string | null
          server_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_pro_only?: boolean | null
          name?: string
          owner_id?: string | null
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sticker_packs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      stickers: {
        Row: {
          id: string
          name: string
          pack_id: string
          url: string
        }
        Insert: {
          id?: string
          name: string
          pack_id: string
          url: string
        }
        Update: {
          id?: string
          name?: string
          pack_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_cents: number | null
          contact_method: string | null
          contact_value: string | null
          created_at: string
          ends_at: string | null
          id: string
          notes: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          reviewed_at: string | null
          reviewed_by: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
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
      accept_invite: {
        Args: { invite_code: string }
        Returns: string
      }
      current_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_server_member: {
        Args: { _server: string; _user: string }
        Returns: boolean
      }
      server_member_level: {
        Args: { _server: string; _user: string }
        Returns: number
      }
      slugify: { Args: { _input: string }; Returns: string }
    }
    Enums: {
      app_role: "user" | "admin" | "coo" | "ceo"
      channel_type: "text" | "voice" | "announcement" | "rules" | "forum"
      server_privacy: "public" | "private" | "invite_only"
      subscription_plan: "free" | "pro"
      subscription_status: "pending" | "active" | "canceled" | "rejected"
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
      app_role: ["user", "admin", "coo", "ceo"],
      channel_type: ["text", "voice", "announcement", "rules", "forum"],
      server_privacy: ["public", "private", "invite_only"],
      subscription_plan: ["free", "pro"],
      subscription_status: ["pending", "active", "canceled", "rejected"],
    },
  },
} as const
