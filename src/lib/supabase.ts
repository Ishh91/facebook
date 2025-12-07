import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Link = {
  id: string;
  short_code: string;
  original_url: string;
  title: string;
  is_affiliate: boolean;
  redirect_delay: number;
  total_clicks: number;
  estimated_revenue: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_by_ip: string;
};

export type Click = {
  id: string;
  link_id: string;
  clicked_at: string;
  referrer: string;
  user_agent: string;
  ip_address: string;
  country: string;
  device_type: string;
  revenue_generated: number;
};
