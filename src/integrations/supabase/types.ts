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
          ends_at: string | null
          id: string
          image_url: string | null
          is_temporary: boolean
          name: string
          parent_id: string | null
          position: number
          slug: string
          starts_at: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_temporary?: boolean
          name: string
          parent_id?: string | null
          position?: number
          slug: string
          starts_at?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_temporary?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
          starts_at?: string | null
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
      community_interests: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          interest_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          interest_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          interest_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      community_library: {
        Row: {
          aroma: string | null
          created_at: string
          id: string
          image_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          aroma?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          aroma?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      community_memberships: {
        Row: {
          joined_at: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          image_urls: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          instagram_url: string | null
          library_visible: boolean
          other_social_url: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          instagram_url?: string | null
          library_visible?: boolean
          other_social_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          instagram_url?: string | null
          library_visible?: boolean
          other_social_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          approved: boolean
          created_at: string
          display_name: string
          id: string
          media_urls: string[]
          message: string
          order_id: string | null
          photo_urls: string[]
          rating: number
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          display_name?: string
          id?: string
          media_urls?: string[]
          message: string
          order_id?: string | null
          photo_urls?: string[]
          rating: number
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          display_name?: string
          id?: string
          media_urls?: string[]
          message?: string
          order_id?: string | null
          photo_urls?: string[]
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          variant_details: Json
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
          variant_details?: Json
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          variant_details?: Json
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
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          discount: number
          id: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipping: number
          shipping_address: Json | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: string
          subtotal?: number
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
          intro_cta_text: string
          intro_duration_ms: number
          intro_enabled: boolean
          intro_subtitle: string | null
          intro_title: string | null
          intro_video_url: string | null
          name: string
          slug: string
          spotify_description: string | null
          spotify_playlist_url: string | null
          spotify_title: string | null
          spotify_visible: boolean
          status: string
          store_category_url: string | null
          theme: Json
          universe: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          intro_cta_text?: string
          intro_duration_ms?: number
          intro_enabled?: boolean
          intro_subtitle?: string | null
          intro_title?: string | null
          intro_video_url?: string | null
          name: string
          slug: string
          spotify_description?: string | null
          spotify_playlist_url?: string | null
          spotify_title?: string | null
          spotify_visible?: boolean
          status?: string
          store_category_url?: string | null
          theme?: Json
          universe?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          intro_cta_text?: string
          intro_duration_ms?: number
          intro_enabled?: boolean
          intro_subtitle?: string | null
          intro_title?: string | null
          intro_video_url?: string | null
          name?: string
          slug?: string
          spotify_description?: string | null
          spotify_playlist_url?: string | null
          spotify_title?: string | null
          spotify_visible?: boolean
          status?: string
          store_category_url?: string | null
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
          product_badge: string | null
          sale_price: number | null
          sku: string | null
          slug: string
          status: string
          stock: number
          updated_at: string
          variants: Json
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
          product_badge?: string | null
          sale_price?: number | null
          sku?: string | null
          slug: string
          status?: string
          stock?: number
          updated_at?: string
          variants?: Json
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
          product_badge?: string | null
          sale_price?: number | null
          sku?: string | null
          slug?: string
          status?: string
          stock?: number
          updated_at?: string
          variants?: Json
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
      promotions: {
        Row: {
          active: boolean
          all_products: boolean
          buy_quantity: number | null
          code: string | null
          created_at: string
          discount_type: string | null
          discount_value: number
          eligible_category_ids: string[]
          eligible_product_ids: string[]
          ends_at: string | null
          gift_name: string | null
          gift_product_id: string | null
          id: string
          kind: string
          min_cart_value: number
          name: string
          pay_quantity: number | null
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
          visible: boolean
        }
        Insert: {
          active?: boolean
          all_products?: boolean
          buy_quantity?: number | null
          code?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number
          eligible_category_ids?: string[]
          eligible_product_ids?: string[]
          ends_at?: string | null
          gift_name?: string | null
          gift_product_id?: string | null
          id?: string
          kind: string
          min_cart_value?: number
          name: string
          pay_quantity?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          visible?: boolean
        }
        Update: {
          active?: boolean
          all_products?: boolean
          buy_quantity?: number | null
          code?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number
          eligible_category_ids?: string[]
          eligible_product_ids?: string[]
          ends_at?: string | null
          gift_name?: string | null
          gift_product_id?: string | null
          id?: string
          kind?: string
          min_cart_value?: number
          name?: string
          pay_quantity?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "promotions_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_flame_claims: {
        Row: {
          candle_index: number
          created_at: string
          id: string
          reward_snapshot: Json
          user_id: string | null
          visitor_key: string | null
        }
        Insert: {
          candle_index: number
          created_at?: string
          id?: string
          reward_snapshot: Json
          user_id?: string | null
          visitor_key?: string | null
        }
        Update: {
          candle_index?: number
          created_at?: string
          id?: string
          reward_snapshot?: Json
          user_id?: string | null
          visitor_key?: string | null
        }
        Relationships: []
      }
      secret_flame_rewards: {
        Row: {
          candle_index: number
          coupon_code: string | null
          reward_description: string
          reward_title: string
          reward_type: string
          updated_at: string
        }
        Insert: {
          candle_index: number
          coupon_code?: string | null
          reward_description?: string
          reward_title?: string
          reward_type?: string
          updated_at?: string
        }
        Update: {
          candle_index?: number
          coupon_code?: string | null
          reward_description?: string
          reward_title?: string
          reward_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      secret_flame_settings: {
        Row: {
          active: boolean
          candle_images: Json
          ends_at: string | null
          id: boolean
          min_cart_value: number
          starts_at: string | null
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          candle_images?: Json
          ends_at?: string | null
          id?: boolean
          min_cart_value?: number
          starts_at?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          candle_images?: Json
          ends_at?: string | null
          id?: boolean
          min_cart_value?: number
          starts_at?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          active: boolean
          created_at: string
          href: string
          id: string
          image_url: string
          position: number
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          href?: string
          id?: string
          image_url: string
          position?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          href?: string
          id?: string
          image_url?: string
          position?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_profile: {
        Row: {
          about_gallery: string[]
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
          about_gallery?: string[]
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
          about_gallery?: string[]
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
      claim_secret_flame: {
        Args: { p_candle_index: number; p_visitor_key?: string }
        Returns: Json
      }
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
