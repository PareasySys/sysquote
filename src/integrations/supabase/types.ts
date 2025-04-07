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
          created_at: string
          daily_accommodation_food_cost: number
          daily_allowance: number
          daily_car_rental_cost: number | null
          daily_pocket_money: number
          daily_taxi_cost: number | null
          travel_cost_flight: number | null
          updated_at: string
        }
        Insert: {
          area_cost_id?: number
          area_id: number
          created_at?: string
          daily_accommodation_food_cost: number
          daily_allowance: number
          daily_car_rental_cost?: number | null
          daily_pocket_money: number
          daily_taxi_cost?: number | null
          travel_cost_flight?: number | null
          updated_at?: string
        }
        Update: {
          area_cost_id?: number
          area_id?: number
          created_at?: string
          daily_accommodation_food_cost?: number
          daily_allowance?: number
          daily_car_rental_cost?: number | null
          daily_pocket_money?: number
          daily_taxi_cost?: number | null
          travel_cost_flight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_costs_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: true
            referencedRelation: "geographic_areas"
            referencedColumns: ["area_id"]
          },
        ]
      }
      geographic_areas: {
        Row: {
          area_id: number
          created_at: string | null
          name: string
        }
        Insert: {
          area_id?: number
          created_at?: string | null
          name: string
        }
        Update: {
          area_id?: number
          created_at?: string | null
          name?: string
        }
        Relationships: []
      }
      machine_types: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          machine_type_id: number
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          machine_type_id?: number
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          machine_type_id?: number
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      plan_specific_costs: {
        Row: {
          cost_type: string
          cost_value: number
          created_at: string
          plan_cost_id: number
          plan_id: number
        }
        Insert: {
          cost_type: string
          cost_value: number
          created_at?: string
          plan_cost_id?: number
          plan_id: number
        }
        Update: {
          cost_type?: string
          cost_value?: number
          created_at?: string
          plan_cost_id?: number
          plan_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_specific_costs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      quotes: {
        Row: {
          area_id: number | null
          client_name: string | null
          created_at: string
          created_by_user_id: string
          quote_id: string
          quote_name: string
        }
        Insert: {
          area_id?: number | null
          client_name?: string | null
          created_at?: string
          created_by_user_id: string
          quote_id?: string
          quote_name: string
        }
        Update: {
          area_id?: number | null
          client_name?: string | null
          created_at?: string
          created_by_user_id?: string
          quote_id?: string
          quote_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "geographic_areas"
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
      software_types: {
        Row: {
          always_included: boolean
          created_at: string
          description: string | null
          is_active: boolean
          name: string
          photo_url: string | null
          software_type_id: number
        }
        Insert: {
          always_included?: boolean
          created_at?: string
          description?: string | null
          is_active?: boolean
          name: string
          photo_url?: string | null
          software_type_id?: number
        }
        Update: {
          always_included?: boolean
          created_at?: string
          description?: string | null
          is_active?: boolean
          name?: string
          photo_url?: string | null
          software_type_id?: number
        }
        Relationships: []
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
      training_requirements: {
        Row: {
          created_at: string
          item_id: number
          item_type: string
          lesson_details: string | null
          plan_id: number
          required_resource_id: number
          requirement_id: number
          training_hours: number
        }
        Insert: {
          created_at?: string
          item_id: number
          item_type: string
          lesson_details?: string | null
          plan_id: number
          required_resource_id: number
          requirement_id?: number
          training_hours: number
        }
        Update: {
          created_at?: string
          item_id?: number
          item_type?: string
          lesson_details?: string | null
          plan_id?: number
          required_resource_id?: number
          requirement_id?: number
          training_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_requirements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "training_requirements_required_resource_id_fkey"
            columns: ["required_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["resource_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
