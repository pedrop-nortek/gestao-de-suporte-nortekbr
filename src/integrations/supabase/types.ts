export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          primary_email: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          primary_email?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          primary_email?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_models: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          manufacturer: string | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rma_requests: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          rma_number: string
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          rma_number: string
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          rma_number?: string
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rma_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      rma_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          functionality_notes: string | null
          id: string
          is_completed: boolean
          notes: string | null
          rma_id: string
          step_name: string
          step_order: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          functionality_notes?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          rma_id: string
          step_name: string
          step_order: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          functionality_notes?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          rma_id?: string
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rma_steps_rma_id_fkey"
            columns: ["rma_id"]
            isOneToOne: false
            referencedRelation: "rma_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          context_description: string | null
          created_by: string | null
          file_extension: string | null
          file_size_bytes: number | null
          file_type: string | null
          filename: string
          id: string
          is_nortek_data: boolean | null
          received_at: string
          storage_location: string
          ticket_id: string
        }
        Insert: {
          context_description?: string | null
          created_by?: string | null
          file_extension?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          filename: string
          id?: string
          is_nortek_data?: boolean | null
          received_at?: string
          storage_location: string
          ticket_id: string
        }
        Update: {
          context_description?: string | null
          created_by?: string | null
          file_extension?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          is_nortek_data?: boolean | null
          received_at?: string
          storage_location?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          channel: Database["public"]["Enums"]["communication_channel"]
          content: string
          created_at: string
          created_by: string | null
          external_message_id: string | null
          id: string
          is_internal: boolean
          sender_email: string | null
          sender_name: string | null
          sender_phone: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["communication_channel"]
          content: string
          created_at?: string
          created_by?: string | null
          external_message_id?: string | null
          id?: string
          is_internal?: boolean
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["communication_channel"]
          content?: string
          created_at?: string
          created_by?: string | null
          external_message_id?: string | null
          id?: string
          is_internal?: boolean
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          equipment_model: string | null
          equipment_model_id: string | null
          external_message_id: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          responsibility: Database["public"]["Enums"]["responsibility_type"]
          serial_number: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_log: string | null
          ticket_number: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_model?: string | null
          equipment_model_id?: string | null
          external_message_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          responsibility?: Database["public"]["Enums"]["responsibility_type"]
          serial_number?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_log?: string | null
          ticket_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_model?: string | null
          equipment_model_id?: string | null
          external_message_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          responsibility?: Database["public"]["Enums"]["responsibility_type"]
          serial_number?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_log?: string | null
          ticket_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tickets_equipment_model"
            columns: ["equipment_model_id"]
            isOneToOne: false
            referencedRelation: "equipment_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          push_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
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
      [_ in never]: never
    }
    Enums: {
      communication_channel: "email" | "whatsapp" | "manual" | "internal_note"
      responsibility_type:
        | "internal_support"
        | "awaiting_client"
        | "external_support"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "closed" | "paused"
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
      communication_channel: ["email", "whatsapp", "manual", "internal_note"],
      responsibility_type: [
        "internal_support",
        "awaiting_client",
        "external_support",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "closed", "paused"],
    },
  },
} as const
