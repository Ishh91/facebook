/*
  # Link Shortener Database Schema

  ## Overview
  Complete database schema for a link shortener with monetization and analytics features.

  ## New Tables
  
  ### `links`
  Main table storing all shortened links
  - `id` (uuid, primary key) - Unique identifier for each link
  - `short_code` (text, unique) - The short code used in URLs (e.g., "abc123")
  - `original_url` (text) - The destination URL
  - `title` (text) - Optional title for the link
  - `is_affiliate` (boolean) - Whether this is an affiliate link
  - `redirect_delay` (integer) - Delay in seconds before redirect (default 3)
  - `total_clicks` (integer) - Total number of clicks (denormalized for performance)
  - `estimated_revenue` (numeric) - Estimated revenue from this link
  - `created_at` (timestamptz) - When the link was created
  - `expires_at` (timestamptz) - Optional expiration date
  - `is_active` (boolean) - Whether the link is active
  - `created_by_ip` (text) - IP address of creator (for rate limiting)

  ### `clicks`
  Detailed analytics for each click
  - `id` (uuid, primary key) - Unique identifier for each click
  - `link_id` (uuid, foreign key) - Reference to the links table
  - `clicked_at` (timestamptz) - When the click occurred
  - `referrer` (text) - HTTP referrer header
  - `user_agent` (text) - Browser/device information
  - `ip_address` (text) - IP address of the visitor
  - `country` (text) - Visitor's country (can be populated via IP lookup)
  - `device_type` (text) - Desktop, mobile, tablet
  - `revenue_generated` (numeric) - Revenue from this specific click

  ## Security
  - Enable RLS on all tables
  - Public read access for active links (for redirect functionality)
  - Restrict write access appropriately
  
  ## Indexes
  - Index on short_code for fast lookups
  - Index on link_id in clicks table for analytics queries
  - Index on clicked_at for time-based analytics

  ## Notes
  - This schema supports affiliate link tracking and monetization
  - Analytics can be aggregated from the clicks table
  - Revenue tracking is built-in for each link and click
*/

-- Create links table
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code text UNIQUE NOT NULL,
  original_url text NOT NULL,
  title text DEFAULT '',
  is_affiliate boolean DEFAULT false,
  redirect_delay integer DEFAULT 3,
  total_clicks integer DEFAULT 0,
  estimated_revenue numeric(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by_ip text DEFAULT ''
);

-- Create clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES links(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  referrer text DEFAULT '',
  user_agent text DEFAULT '',
  ip_address text DEFAULT '',
  country text DEFAULT '',
  device_type text DEFAULT '',
  revenue_generated numeric(10,2) DEFAULT 0.00
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at DESC);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for links table
-- Anyone can read active, non-expired links (needed for redirect)
CREATE POLICY "Anyone can read active links"
  ON links FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Anyone can create links (public link shortener)
CREATE POLICY "Anyone can create links"
  ON links FOR INSERT
  WITH CHECK (true);

-- Anyone can update click count (for increment operations)
CREATE POLICY "Anyone can update link stats"
  ON links FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for clicks table
-- Anyone can insert clicks (needed for tracking)
CREATE POLICY "Anyone can insert clicks"
  ON clicks FOR INSERT
  WITH CHECK (true);

-- Anyone can read clicks (for analytics)
CREATE POLICY "Anyone can read clicks"
  ON clicks FOR SELECT
  USING (true);

-- Function to increment click count
CREATE OR REPLACE FUNCTION increment_click_count(link_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE links
  SET total_clicks = total_clicks + 1
  WHERE id = link_uuid;
END;
$$;

-- Function to update estimated revenue
CREATE OR REPLACE FUNCTION update_link_revenue(link_uuid uuid, revenue_amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE links
  SET estimated_revenue = estimated_revenue + revenue_amount
  WHERE id = link_uuid;
END;
$$;