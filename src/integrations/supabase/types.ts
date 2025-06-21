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
      cache_control: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
        }
        Relationships: []
      }
      concept_visualizations: {
        Row: {
          analogies: Json | null
          concept_description: string
          concept_title: string
          created_at: string | null
          diagram: Json | null
          examples: Json | null
          id: string
          learning_style: string
          mind_map: Json | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          analogies?: Json | null
          concept_description: string
          concept_title: string
          created_at?: string | null
          diagram?: Json | null
          examples?: Json | null
          id?: string
          learning_style: string
          mind_map?: Json | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          analogies?: Json | null
          concept_description?: string
          concept_title?: string
          created_at?: string | null
          diagram?: Json | null
          examples?: Json | null
          id?: string
          learning_style?: string
          mind_map?: Json | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          balance: number | null
          created_at: string | null
          customer_id: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          course_code: string
          deadline: string | null
          file_description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: number
          teacher_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          course_code: string
          deadline?: string | null
          file_description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: number
          teacher_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          course_code?: string
          deadline?: string | null
          file_description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: number
          teacher_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      invoice_counter: {
        Row: {
          counter_type: string
          created_at: string | null
          current_value: number | null
          id: string
          updated_at: string | null
        }
        Insert: {
          counter_type: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          counter_type?: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          payment_date: string | null
          payment_type: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          payment_date?: string | null
          payment_type: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          payment_date?: string | null
          payment_type?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          low_stock_threshold: number | null
          name: string
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          invoice_number: string | null
          product_id: string | null
          quantity: number
          total_amount: number
          transaction_date: string | null
          type: string
          unit_price: number
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_number?: string | null
          product_id?: string | null
          quantity: number
          total_amount: number
          transaction_date?: string | null
          type: string
          unit_price: number
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_number?: string | null
          product_id?: string | null
          quantity?: number
          total_amount?: number
          transaction_date?: string | null
          type?: string
          unit_price?: number
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_customer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: { invoice_type: string }
        Returns: string
      }
      generate_vendor_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
