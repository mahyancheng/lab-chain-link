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
      app_settings: {
        Row: {
          id: boolean
          qa_required_approvals: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          qa_required_approvals?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          qa_required_approvals?: number
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          bucket: string
          created_at: string
          filename: string | null
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          order_id: string | null
          path: string
          sample_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          created_at?: string
          filename?: string | null
          id?: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          order_id?: string | null
          path: string
          sample_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          filename?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          order_id?: string | null
          path?: string
          sample_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "order_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      capacity_rules: {
        Row: {
          active: boolean
          created_at: string
          daily_cap: number | null
          delivery_type: Database["public"]["Enums"]["delivery_type"] | null
          id: string
          product_id: string | null
          same_day_cutoff_time: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_cap?: number | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"] | null
          id?: string
          product_id?: string | null
          same_day_cutoff_time?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_cap?: number | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"] | null
          id?: string
          product_id?: string | null
          same_day_cutoff_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacity_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_of_custody_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string
          sample_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id: string
          sample_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          sample_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_of_custody_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_of_custody_events_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "order_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      exceptions: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          raised_by: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          sample_id: string | null
          status: Database["public"]["Enums"]["exception_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          raised_by?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          sample_id?: string | null
          status?: Database["public"]["Enums"]["exception_status"]
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          raised_by?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sample_id?: string | null
          status?: Database["public"]["Enums"]["exception_status"]
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "order_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      order_samples: {
        Row: {
          batch_no: string | null
          composition: string | null
          created_at: string
          id: string
          intake_at: string | null
          intake_by: string | null
          intake_condition: string | null
          intake_disposition:
            | Database["public"]["Enums"]["intake_disposition"]
            | null
          intake_notes: string | null
          intake_weight_g: number | null
          order_id: string
          origin: string | null
          product_id: string
          qa_verified_at: string | null
          qa_verified_by: string | null
          qr_code: string
          sample_label: string
          stage: Database["public"]["Enums"]["sample_stage"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          batch_no?: string | null
          composition?: string | null
          created_at?: string
          id?: string
          intake_at?: string | null
          intake_by?: string | null
          intake_condition?: string | null
          intake_disposition?:
            | Database["public"]["Enums"]["intake_disposition"]
            | null
          intake_notes?: string | null
          intake_weight_g?: number | null
          order_id: string
          origin?: string | null
          product_id: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          qr_code?: string
          sample_label: string
          stage?: Database["public"]["Enums"]["sample_stage"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_no?: string | null
          composition?: string | null
          created_at?: string
          id?: string
          intake_at?: string | null
          intake_by?: string | null
          intake_condition?: string | null
          intake_disposition?:
            | Database["public"]["Enums"]["intake_disposition"]
            | null
          intake_notes?: string | null
          intake_weight_g?: number | null
          order_id?: string
          origin?: string | null
          product_id?: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          qr_code?: string
          sample_label?: string
          stage?: Database["public"]["Enums"]["sample_stage"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_samples_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_samples_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_samples_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_fee: number
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          notes: string | null
          order_number: string
          pickup_address: string | null
          qr_code: string
          released_at: string | null
          released_by: string | null
          stage: Database["public"]["Enums"]["order_stage"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          notes?: string | null
          order_number?: string
          pickup_address?: string | null
          qr_code?: string
          released_at?: string | null
          released_by?: string | null
          stage?: Database["public"]["Enums"]["order_stage"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          notes?: string | null
          order_number?: string
          pickup_address?: string | null
          qr_code?: string
          released_at?: string | null
          released_by?: string | null
          stage?: Database["public"]["Enums"]["order_stage"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          base_price: number
          category: string
          created_at: string
          description: string | null
          id: string
          item_code: string | null
          name: string
          packaging_instructions: string | null
          sample_liquid: string | null
          sample_solid: string | null
          tat_days: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          item_code?: string | null
          name: string
          packaging_instructions?: string | null
          sample_liquid?: string | null
          sample_solid?: string | null
          tat_days?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          item_code?: string | null
          name?: string
          packaging_instructions?: string | null
          sample_liquid?: string | null
          sample_solid?: string | null
          tat_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sample_approvals: {
        Row: {
          approver_id: string
          created_at: string
          id: string
          note: string | null
          sample_id: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          id?: string
          note?: string | null
          sample_id: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          id?: string
          note?: string | null
          sample_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_approvals_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "order_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_test_panels: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          created_at: string
          eta: string | null
          id: string
          order_id: string
          provider: string
          quote_amount: number | null
          status: string
          tracking_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          eta?: string | null
          id?: string
          order_id: string
          provider?: string
          quote_amount?: number | null
          status?: string
          tracking_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          eta?: string | null
          id?: string
          order_id?: string
          provider?: string
          quote_amount?: number | null
          status?: string
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      test_parameters: {
        Row: {
          id: string
          max_value: number | null
          min_value: number | null
          name: string
          sort_order: number
          template_id: string
          unit: string | null
        }
        Insert: {
          id?: string
          max_value?: number | null
          min_value?: number | null
          name: string
          sort_order?: number
          template_id: string
          unit?: string | null
        }
        Update: {
          id?: string
          max_value?: number | null
          min_value?: number | null
          name?: string
          sort_order?: number
          template_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_parameters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          entered_by: string | null
          id: string
          parameter_id: string
          passed: boolean | null
          sample_id: string
          text_value: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          entered_by?: string | null
          id?: string
          parameter_id: string
          passed?: boolean | null
          sample_id: string
          text_value?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          entered_by?: string | null
          id?: string
          parameter_id?: string
          passed?: boolean | null
          sample_id?: string
          text_value?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "test_parameters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "order_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          product_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "lab" | "admin"
      attachment_kind:
        | "evidence"
        | "external_cert"
        | "report"
        | "packing_slip"
        | "invoice"
        | "other"
      delivery_type: "same_day" | "standard"
      exception_status: "open" | "approved" | "rejected"
      intake_disposition: "accepted" | "on_hold" | "rejected"
      order_stage:
        | "draft"
        | "ordered"
        | "paid"
        | "picked_up"
        | "in_transit"
        | "received_at_lab"
        | "sample_verified"
        | "in_testing"
        | "qa_review"
        | "ready_for_release"
        | "released"
        | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      sample_stage:
        | "pending"
        | "received"
        | "sample_prep"
        | "in_testing"
        | "data_validation"
        | "qa_review"
        | "ready_for_release"
        | "released"
        | "rejected"
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
      app_role: ["customer", "lab", "admin"],
      attachment_kind: [
        "evidence",
        "external_cert",
        "report",
        "packing_slip",
        "invoice",
        "other",
      ],
      delivery_type: ["same_day", "standard"],
      exception_status: ["open", "approved", "rejected"],
      intake_disposition: ["accepted", "on_hold", "rejected"],
      order_stage: [
        "draft",
        "ordered",
        "paid",
        "picked_up",
        "in_transit",
        "received_at_lab",
        "sample_verified",
        "in_testing",
        "qa_review",
        "ready_for_release",
        "released",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      sample_stage: [
        "pending",
        "received",
        "sample_prep",
        "in_testing",
        "data_validation",
        "qa_review",
        "ready_for_release",
        "released",
        "rejected",
      ],
    },
  },
} as const
