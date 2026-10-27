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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          position: number
          slug: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          position?: number
          slug: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      essence_stock_movements: {
        Row: {
          balance_after_ml: number
          created_at: string
          essence_id: string
          id: string
          movement_type: string
          note: string | null
          order_id: string | null
          order_item_id: string | null
          quantity_ml: number
        }
        Insert: {
          balance_after_ml: number
          created_at?: string
          essence_id: string
          id?: string
          movement_type: string
          note?: string | null
          order_id?: string | null
          order_item_id?: string | null
          quantity_ml: number
        }
        Update: {
          balance_after_ml?: number
          created_at?: string
          essence_id?: string
          id?: string
          movement_type?: string
          note?: string | null
          order_id?: string | null
          order_item_id?: string | null
          quantity_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "essence_stock_movements_essence_id_fkey"
            columns: ["essence_id"]
            isOneToOne: false
            referencedRelation: "essences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essence_stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essence_stock_movements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      essences: {
        Row: {
          active: boolean
          created_at: string
          id: string
          minimum_stock_ml: number
          name: string
          notes: string | null
          stock_ml: number
          supplier: string | null
          target_stock_ml: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          minimum_stock_ml?: number
          name: string
          notes?: string | null
          stock_ml?: number
          supplier?: string | null
          target_stock_ml?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          minimum_stock_ml?: number
          name?: string
          notes?: string | null
          stock_ml?: number
          supplier?: string | null
          target_stock_ml?: number
          updated_at?: string
        }
        Relationships: []
      }
      library_items: {
        Row: {
          acquired_at: string | null
          created_at: string
          custom_name: string | null
          favorite: boolean
          id: string
          notes: string | null
          product_id: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string
          custom_name?: string | null
          favorite?: boolean
          id?: string
          notes?: string | null
          product_id?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          created_at?: string
          custom_name?: string | null
          favorite?: boolean
          id?: string
          notes?: string | null
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipping: number
          shipping_address: Json | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portal_fragments: {
        Row: {
          body: string
          caption: string | null
          context: string | null
          id: string
          image_url: string | null
          portal_id: string
          position: number
          reference: string | null
          title: string
          visible: boolean
        }
        Insert: {
          body: string
          caption?: string | null
          context?: string | null
          id?: string
          image_url?: string | null
          portal_id: string
          position?: number
          reference?: string | null
          title: string
          visible?: boolean
        }
        Update: {
          body?: string
          caption?: string | null
          context?: string | null
          id?: string
          image_url?: string | null
          portal_id?: string
          position?: number
          reference?: string | null
          title?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "portal_fragments_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portals: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          id: string
          intro_duration_ms: number
          intro_enabled: boolean
          intro_subtitle: string | null
          intro_title: string | null
          name: string
          slug: string
          spotify_description: string | null
          spotify_playlist_url: string | null
          spotify_title: string | null
          spotify_visible: boolean
          status: string
          theme: Json
          universe: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          intro_duration_ms?: number
          intro_enabled?: boolean
          intro_subtitle?: string | null
          intro_title?: string | null
          name: string
          slug: string
          spotify_description?: string | null
          spotify_playlist_url?: string | null
          spotify_title?: string | null
          spotify_visible?: boolean
          status?: string
          theme?: Json
          universe?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          intro_duration_ms?: number
          intro_enabled?: boolean
          intro_subtitle?: string | null
          intro_title?: string | null
          name?: string
          slug?: string
          spotify_description?: string | null
          spotify_playlist_url?: string | null
          spotify_title?: string | null
          spotify_visible?: boolean
          status?: string
          theme?: Json
          universe?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_essences: {
        Row: {
          created_at: string
          essence_id: string
          id: string
          product_id: string
          quantity_ml: number
        }
        Insert: {
          created_at?: string
          essence_id: string
          id?: string
          product_id: string
          quantity_ml: number
        }
        Update: {
          created_at?: string
          essence_id?: string
          id?: string
          product_id?: string
          quantity_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_essences_essence_id_fkey"
            columns: ["essence_id"]
            isOneToOne: false
            referencedRelation: "essences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_essences_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          collection: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          features: string[] | null
          fragrance: string | null
          id: string
          images: string[]
          name: string
          portal_id: string | null
          price: number
          sale_price: number | null
          sku: string | null
          slug: string
          status: string
          stock: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          category_id?: string | null
          collection?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          features?: string[] | null
          fragrance?: string | null
          id?: string
          images?: string[]
          name: string
          portal_id?: string | null
          price?: number
          sale_price?: number | null
          sku?: string | null
          slug: string
          status?: string
          stock?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          category_id?: string | null
          collection?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          features?: string[] | null
          fragrance?: string | null
          id?: string
          images?: string[]
          name?: string
          portal_id?: string | null
          price?: number
          sale_price?: number | null
          sku?: string | null
          slug?: string
          status?: string
          stock?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      site_profile: {
        Row: {
          about_image_url: string
          about_mari: string
          about_story: string
          contact_email: string
          id: boolean
          instagram_url: string
          story_image_url: string
          updated_at: string
          whatsapp_number: string
          whatsapp_url: string
        }
        Insert: {
          about_image_url?: string
          about_mari?: string
          about_story?: string
          contact_email?: string
          id?: boolean
          instagram_url?: string
          story_image_url?: string
          updated_at?: string
          whatsapp_number?: string
          whatsapp_url?: string
        }
        Update: {
          about_image_url?: string
          about_mari?: string
          about_story?: string
          contact_email?: string
          id?: boolean
          instagram_url?: string
          story_image_url?: string
          updated_at?: string
          whatsapp_number?: string
          whatsapp_url?: string
        }
        Relationships: []
      }
      site_shortcuts: {
        Row: {
          active: boolean
          description: string
          href: string
          id: string
          image_key: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          description?: string
          href: string
          id: string
          image_key: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          description?: string
          href?: string
          id?: string
          image_key?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "customer"],
    },
  },
} as const
