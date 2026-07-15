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
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      chronicle_posts: {
        Row: {
          author: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      custom_orders: {
        Row: {
          category: string
          colors: string[] | null
          created_at: string
          delivery_location: string | null
          email: string | null
          id: string
          materials: string | null
          name: string
          phone: string
          vision: string | null
        }
        Insert: {
          category: string
          colors?: string[] | null
          created_at?: string
          delivery_location?: string | null
          email?: string | null
          id?: string
          materials?: string | null
          name: string
          phone: string
          vision?: string | null
        }
        Update: {
          category?: string
          colors?: string[] | null
          created_at?: string
          delivery_location?: string | null
          email?: string | null
          id?: string
          materials?: string | null
          name?: string
          phone?: string
          vision?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enquiry_messages: {
        Row: {
          conversation_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          is_from_admin: boolean
          is_read: boolean
          message: string
        }
        Insert: {
          conversation_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_from_admin?: boolean
          is_read?: boolean
          message: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_from_admin?: boolean
          is_read?: boolean
          message?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          cta_link: string
          cta_text: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          subtitle: string
          title: string
        }
        Insert: {
          created_at?: string
          cta_link?: string
          cta_text?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          subtitle?: string
          title?: string
        }
        Update: {
          created_at?: string
          cta_link?: string
          cta_text?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      newsletter_digest_state: {
        Row: {
          id: number
          last_sent_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          last_sent_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          last_sent_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          items: Json
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          phone: string
          shipping_address: Json | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone: string
          shipping_address?: Json | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone?: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          admin_response: string | null
          comment: string
          created_at: string
          customer_name: string
          id: string
          is_verified_buyer: boolean
          photo_urls: string[] | null
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          comment: string
          created_at?: string
          customer_name: string
          id?: string
          is_verified_buyer?: boolean
          photo_urls?: string[] | null
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          comment?: string
          created_at?: string
          customer_name?: string
          id?: string
          is_verified_buyer?: boolean
          photo_urls?: string[] | null
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          price: number
          product_id: string
          size: string | null
          stock: number
          updated_at: string
          variant_label: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id: string
          size?: string | null
          stock?: number
          updated_at?: string
          variant_label?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          size?: string | null
          stock?: number
          updated_at?: string
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          is_active: boolean
          is_preorder: boolean
          low_stock_threshold: number
          name: string
          preorder_label: string | null
          price: number
          price_max: number | null
          price_min: number | null
          stock: number
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          is_preorder?: boolean
          low_stock_threshold?: number
          name: string
          preorder_label?: string | null
          price: number
          price_max?: number | null
          price_min?: number | null
          stock?: number
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          is_preorder?: boolean
          low_stock_threshold?: number
          name?: string
          preorder_label?: string | null
          price?: number
          price_max?: number | null
          price_min?: number | null
          stock?: number
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_methods: {
        Row: {
          created_at: string
          estimated_days: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          provider: string
          regions: string[] | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          provider?: string
          regions?: string[] | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          provider?: string
          regions?: string[] | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          section_key: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          section_key: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          section_key?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          adjusted_by_email: string | null
          change: number
          created_at: string
          id: string
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          reason: string
          variant_id: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjusted_by_email?: string | null
          change: number
          created_at?: string
          id?: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          product_id: string
          reason: string
          variant_id?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjusted_by_email?: string | null
          change?: number
          created_at?: string
          id?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          reason?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tribe_looks: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string
          piece_name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name?: string
          piece_name?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          piece_name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_transactional_email: {
        Args: {
          html_body: string
          recipient_email: string
          subject_text: string
          template_label: string
        }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
    Enums: {},
  },
} as const
