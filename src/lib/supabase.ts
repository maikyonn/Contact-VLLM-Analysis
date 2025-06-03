import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export interface Database {
  public: {
    Tables: {
      evaluations: {
        Row: {
          id: string;
          image_id: string;
          model_name: string;
          user_id: string;
          score?: number;
          checks?: number;
          xs?: number;
          missed_interactions?: number;
          created_at: string;
          image_url: string;
          original_contacts: string[];
          model_contacts: string[];
          model_raw_response: string;
        };
        Insert: {
          id?: string;
          image_id: string;
          model_name: string;
          user_id: string;
          score?: number;
          checks?: number;
          xs?: number;
          missed_interactions?: number;
          created_at?: string;
          image_url: string;
          original_contacts: string[];
          model_contacts: string[];
          model_raw_response: string;
        };
        Update: {
          id?: string;
          image_id?: string;
          model_name?: string;
          user_id?: string;
          score?: number;
          checks?: number;
          xs?: number;
          missed_interactions?: number;
          created_at?: string;
          image_url?: string;
          original_contacts?: string[];
          model_contacts?: string[];
          model_raw_response?: string;
        };
      };
      evaluation_sessions: {
        Row: {
          id: string;
          user_id: string;
          total_pairs: number;
          completed_pairs: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_pairs: number;
          completed_pairs?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_pairs?: number;
          completed_pairs?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export const supabase = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);