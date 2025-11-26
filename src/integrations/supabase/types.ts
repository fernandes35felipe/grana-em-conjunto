export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      group_members: {
        Row: {
          group_id: string;
          id: string;
          is_admin: boolean;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          is_admin?: boolean;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          is_admin?: boolean;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          }
        ];
      };
      groups: {
        Row: {
          color: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      investment_goals: {
        Row: {
          color: string | null;
          created_at: string;
          current_amount: number;
          description: string | null;
          id: string;
          name: string;
          target_amount: number;
          target_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          current_amount?: number;
          description?: string | null;
          id?: string;
          name: string;
          target_amount: number;
          target_date?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          current_amount?: number;
          description?: string | null;
          id?: string;
          name?: string;
          target_amount?: number;
          target_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          amount: number;
          created_at: string;
          current_value: number;
          group_id: string | null;
          id: string;
          maturity_date: string | null;
          name: string;
          type: string;
          updated_at: string;
          user_id: string;
          quantity: number | null;
          unit_price: number | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          current_value: number;
          group_id?: string | null;
          id?: string;
          maturity_date?: string | null;
          name: string;
          type: string;
          updated_at?: string;
          user_id: string;
          quantity: number | null;
          unit_price: number | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          current_value?: number;
          group_id?: string | null;
          id?: string;
          maturity_date?: string | null;
          name?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
          quantity: number | null;
          unit_price: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "investments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
          age: number | null;
          gender: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
          age?: number | null;
          gender?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
          age?: number | null;
          gender?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          date: string;
          description: string;
          group_id: string | null;
          id: string;
          type: string;
          updated_at: string;
          user_id: string;
          event_id: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          date?: string;
          description: string;
          group_id?: string | null;
          id?: string;
          type: string;
          updated_at?: string;
          user_id: string;
          event_id?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          date?: string;
          description?: string;
          group_id?: string | null;
          id?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
          event_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
