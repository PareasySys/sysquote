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
      area_costs: {
        Row: {
          area_cost_id: number
          area_id: number
          area_name: string
          created_at: string
          daily_accommodation_food_cost: number
          daily_allowance: number
          daily_pocket_money: number
          icon_name: string | null
          updated_at: string
        }
        Insert: {
          area_cost_id?: number
          area_id: number
          area_name?: string
          created_at?: string
          daily_accommodation_food_cost: number
          daily_allowance: number
          daily_pocket_money: number
          icon_name?: string | null
          updated_at?: string
        }
        Update: {
          area_cost_id?: number
          area_id?: number
          area_name?: string
          created_at?: string
          daily_accommodation_food_cost?: number
          daily_allowance?: number
          daily_pocket_money?: number
          icon_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      machine_training_requirements: {
        Row: {
          created_at: string | null
          id: number
          machine_type_id: number | null
          plan_id: number | null
          resource_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          machine_type_id?: number | null
          plan_id?: number | null
          resource_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          machine_type_id?: number | null
          plan_id?: number | null
          resource_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_training_requirements_machine_type_id_fkey"
            columns: ["machine_type_id"]
            isOneToOne: false
            referencedRelation: "machine_types"
            referencedColumns: ["machine_type_id"]
          },
          {
            foreignKeyName: "machine_training_requirements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "machine_training_requirements_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      machine_types: {
        Row: {
          created_at: string
          description: string | null
          machine_type_id: number
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          machine_type_id?: number
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          machine_type_id?: number
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      planning_details: {
        Row: {
          allocated_hours: number
          created_at: string
          id: string
          machine_types_id: number | null
          plan_id: number
          quote_id: string
          resource_id: number | null
          software_types_id: number | null
          updated_at: string
          work_on_saturday: boolean
          work_on_sunday: boolean
        }
        Insert: {
          allocated_hours?: number
          created_at?: string
          id?: string
          machine_types_id?: number | null
          plan_id: number
          quote_id: string
          resource_id?: number | null
          software_types_id?: number | null
          updated_at?: string
          work_on_saturday?: boolean
          work_on_sunday?: boolean
        }
        Update: {
          allocated_hours?: number
          created_at?: string
          id?: string
          machine_types_id?: number | null
          plan_id?: number
          quote_id?: string
          resource_id?: number | null
          software_types_id?: number | null
          updated_at?: string
          work_on_saturday?: boolean
          work_on_sunday?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "planning_details_machine_types_id_fkey"
            columns: ["machine_types_id"]
            isOneToOne: false
            referencedRelation: "machine_types"
            referencedColumns: ["machine_type_id"]
          },
          {
            foreignKeyName: "planning_details_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "planning_details_software_types_id_fkey"
            columns: ["software_types_id"]
            isOneToOne: false
            referencedRelation: "software_types"
            referencedColumns: ["software_type_id"]
          },
        ]
      }
      quote_training_plan_hours: {
        Row: {
          created_at: string | null
          id: number
          plan_id: number
          quote_id: string
          training_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          plan_id: number
          quote_id: string
          training_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          plan_id?: number
          quote_id?: string
          training_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_training_plan_hours_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "quote_training_plan_hours_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["quote_id"]
          },
        ]
      }
      quotes: {
        Row: {
          area_id: number | null
          client_name: string | null
          created_at: string
          created_by_user_id: string
          machine_type_ids: number[] | null
          quote_id: string
          quote_name: string
          software_type_ids: number[] | null
          work_on_saturday: boolean | null
          work_on_sunday: boolean | null
        }
        Insert: {
          area_id?: number | null
          client_name?: string | null
          created_at?: string
          created_by_user_id: string
          machine_type_ids?: number[] | null
          quote_id?: string
          quote_name: string
          software_type_ids?: number[] | null
          work_on_saturday?: boolean | null
          work_on_sunday?: boolean | null
        }
        Update: {
          area_id?: number | null
          client_name?: string | null
          created_at?: string
          created_by_user_id?: string
          machine_type_ids?: number[] | null
          quote_id?: string
          quote_name?: string
          software_type_ids?: number[] | null
          work_on_saturday?: boolean | null
          work_on_sunday?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area_costs"
            referencedColumns: ["area_id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          hourly_rate: number
          icon_name: string | null
          is_active: boolean
          name: string
          resource_id: number
        }
        Insert: {
          created_at?: string
          hourly_rate: number
          icon_name?: string | null
          is_active?: boolean
          name: string
          resource_id?: number
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          icon_name?: string | null
          is_active?: boolean
          name?: string
          resource_id?: number
        }
        Relationships: []
      }
      software_training_requirements: {
        Row: {
          created_at: string
          id: number
          plan_id: number
          resource_id: number | null
          software_type_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          plan_id: number
          resource_id?: number | null
          software_type_id: number
        }
        Update: {
          created_at?: string
          id?: number
          plan_id?: number
          resource_id?: number | null
          software_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "software_training_requirements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "software_training_requirements_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "software_training_requirements_software_type_id_fkey"
            columns: ["software_type_id"]
            isOneToOne: false
            referencedRelation: "software_types"
            referencedColumns: ["software_type_id"]
          },
        ]
      }
      software_types: {
        Row: {
          always_included: boolean
          created_at: string
          description: string | null
          name: string
          photo_url: string | null
          software_type_id: number
        }
        Insert: {
          always_included?: boolean
          created_at?: string
          description?: string | null
          name: string
          photo_url?: string | null
          software_type_id?: number
        }
        Update: {
          always_included?: boolean
          created_at?: string
          description?: string | null
          name?: string
          photo_url?: string | null
          software_type_id?: number
        }
        Relationships: []
      }
      training_offers: {
        Row: {
          created_at: string
          hours_required: number
          id: number
          machine_type_id: number | null
          plan_id: number
          software_type_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours_required?: number
          id?: number
          machine_type_id?: number | null
          plan_id: number
          software_type_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours_required?: number
          id?: number
          machine_type_id?: number | null
          plan_id?: number
          software_type_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_software_type"
            columns: ["software_type_id"]
            isOneToOne: false
            referencedRelation: "software_types"
            referencedColumns: ["software_type_id"]
          },
          {
            foreignKeyName: "training_offers_machine_type_id_fkey"
            columns: ["machine_type_id"]
            isOneToOne: false
            referencedRelation: "machine_types"
            referencedColumns: ["machine_type_id"]
          },
          {
            foreignKeyName: "training_offers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      training_plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon_name: string | null
          name: string
          plan_id: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          name: string
          plan_id?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          name?: string
          plan_id?: number
        }
        Relationships: []
      }
      training_topics: {
        Row: {
          created_at: string
          display_order: number | null
          item_type: string | null
          machine_type_id: number | null
          plan_id: number | null
          requirement_id: number
          software_type_id: number | null
          topic_id: number
          topic_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          item_type?: string | null
          machine_type_id?: number | null
          plan_id?: number | null
          requirement_id: number
          software_type_id?: number | null
          topic_id?: number
          topic_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          item_type?: string | null
          machine_type_id?: number | null
          plan_id?: number | null
          requirement_id?: number
          software_type_id?: number | null
          topic_id?: number
          topic_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_topics_machine_type_id_fkey"
            columns: ["machine_type_id"]
            isOneToOne: false
            referencedRelation: "machine_types"
            referencedColumns: ["machine_type_id"]
          },
          {
            foreignKeyName: "training_topics_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "training_topics_software_type_id_fkey"
            columns: ["software_type_id"]
            isOneToOne: false
            referencedRelation: "software_types"
            referencedColumns: ["software_type_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_quote_machines: {
        Args: { quote_id_param: string }
        Returns: {
          id: string
          quote_id: string
          machine_type_id: number
          created_at: string
          machine_details: Json
        }[]
      }
      get_quote_planning_view: {
        Args: { quote_id_param: string }
        Returns: {
          id: string
          quote_id: string
          reference_id: string
          plan_id: number
          plan_name: string
          machine_type_id: number
          machine_name: string
          software_type_id: number
          software_name: string
          area_id: number
          area_name: string
          resource_id: number
          resource_name: string
          training_hours: number
          start_day: number
          duration_days: number
          work_on_saturday: boolean
          work_on_sunday: boolean
        }[]
      }
      get_quote_software_types: {
        Args: { p_quote_id: string }
        Returns: {
          software_type_ids: number[]
        }[]
      }
      get_quote_training_hours: {
        Args: { quote_id_param: string }
        Returns: {
          plan_id: number
          plan_name: string
          icon_name: string
          training_hours: number
        }[]
      }
      get_quote_training_plan_details: {
        Args: { quote_id_param: string }
        Returns: {
          id: string
          quote_id: string
          plan_id: number
          plan_name: string
          resource_category: string
          machine_types_id: number
          software_types_id: number
          type_name: string
          resource_id: number
          resource_name: string
          allocated_hours: number
          start_day: number
          duration_days: number
          work_on_saturday: boolean
          work_on_sunday: boolean
        }[]
      }
      get_quote_training_requirements: {
        Args: { quote_id_param: string; plan_id_param: number }
        Returns: {
          requirement_id: number
          resource_id: number
          resource_name: string
          training_hours: number
          start_day: number
          duration_days: number
        }[]
      }
      get_quote_with_machines: {
        Args: { quote_id_param: string }
        Returns: {
          quote_id: string
          quote_name: string
          client_name: string
          created_at: string
          area_id: number
          machine_type_ids: number[]
          machines: Json
        }[]
      }
      save_quote_planning_item: {
        Args: {
          p_quote_id: string
          p_reference_id: string
          p_plan_id: number
          p_machine_type_id: number
          p_software_type_id: number
          p_area_id: number
          p_resource_id: number
          p_training_hours: number
          p_start_day: number
          p_duration_days: number
          p_work_on_saturday?: boolean
          p_work_on_sunday?: boolean
        }
        Returns: string
      }
      save_training_plan_detail: {
        Args:
          | {
              p_quote_id: string
              p_plan_id: number
              p_resource_category: string
              p_type_id: number
              p_resource_id: number
              p_allocated_hours: number
              p_start_day?: number
              p_duration_days?: number
              p_work_on_saturday?: boolean
              p_work_on_sunday?: boolean
            }
          | {
              p_quote_id: string
              p_plan_id: number
              p_resource_category: string
              p_machine_types_id: number
              p_software_types_id: number
              p_resource_id: number
              p_allocated_hours: number
              p_start_day?: number
              p_duration_days?: number
              p_work_on_saturday?: boolean
              p_work_on_sunday?: boolean
            }
        Returns: string
      }
      update_quote_machines: {
        Args: { quote_id_param: string; machine_ids: number[] }
        Returns: undefined
      }
      update_quote_machines_direct: {
        Args: { quote_id_param: string; machine_ids: number[] }
        Returns: undefined
      }
      update_quote_software_types: {
        Args: { p_quote_id: string; p_software_type_ids: number[] }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
