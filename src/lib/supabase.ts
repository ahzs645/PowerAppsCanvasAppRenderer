import { createClient } from '@supabase/supabase-js'

// These would normally be environment variables
// For demo purposes, I'm using placeholder values
// In production, you would get these from your Supabase project dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface DatabaseScreen {
  id: string
  name: string
  yaml: string
  app_id: string
  created_at: string
  updated_at: string
}

export interface DatabaseApp {
  id: string
  name: string
  user_id: string
  start_screen_id: string | null
  created_at: string
  updated_at: string
}

export interface UserWorkspaceDB {
  id: string
  user_id: string
  active_app_id: string | null
  active_screen_id: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseImage {
  id: string;
  app_id: string;
  name: string;
  storage_path: string;
  public_url: string;
  created_at: string;
}
