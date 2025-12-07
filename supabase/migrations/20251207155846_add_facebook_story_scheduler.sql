/*
  # Facebook Story Scheduler Schema

  1. New Tables
    - `facebook_accounts`
      - `id` (uuid, primary key)
      - `user_id` (text) - Identifier for the user/owner
      - `facebook_user_id` (text) - Facebook user ID
      - `access_token` (text, encrypted) - Facebook access token
      - `page_id` (text, optional) - Facebook page ID if posting to a page
      - `page_name` (text, optional) - Facebook page name
      - `token_expires_at` (timestamptz) - When the token expires
      - `is_active` (boolean) - Whether this account is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `scheduled_stories`
      - `id` (uuid, primary key)
      - `facebook_account_id` (uuid, foreign key) - References facebook_accounts
      - `story_type` (text) - Type: 'image' or 'video'
      - `media_url` (text) - URL to the media file
      - `caption` (text, optional) - Story caption/text
      - `link_url` (text, optional) - Link to include (swipe up)
      - `scheduled_time` (timestamptz) - When to post
      - `status` (text) - Status: 'pending', 'processing', 'posted', 'failed'
      - `posted_at` (timestamptz, optional) - When it was actually posted
      - `facebook_story_id` (text, optional) - Facebook's story ID after posting
      - `error_message` (text, optional) - Error message if failed
      - `retry_count` (integer) - Number of retry attempts
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only manage their own Facebook accounts
    - Users can only manage scheduled stories for their connected accounts
    - Service role can access all records for processing

  3. Indexes
    - Index on scheduled_stories.status for efficient querying
    - Index on scheduled_stories.scheduled_time for scheduler queries
*/

-- Create facebook_accounts table
CREATE TABLE IF NOT EXISTS facebook_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  facebook_user_id text NOT NULL,
  access_token text NOT NULL,
  page_id text,
  page_name text,
  token_expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scheduled_stories table
CREATE TABLE IF NOT EXISTS scheduled_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_account_id uuid NOT NULL REFERENCES facebook_accounts(id) ON DELETE CASCADE,
  story_type text NOT NULL CHECK (story_type IN ('image', 'video')),
  media_url text NOT NULL,
  caption text DEFAULT '',
  link_url text,
  scheduled_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'failed', 'cancelled')),
  posted_at timestamptz,
  facebook_story_id text,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scheduled_stories_status ON scheduled_stories(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_stories_scheduled_time ON scheduled_stories(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_stories_account_id ON scheduled_stories(facebook_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_accounts_user_id ON facebook_accounts(user_id);

-- Enable Row Level Security
ALTER TABLE facebook_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_accounts
CREATE POLICY "Users can view their own Facebook accounts"
  ON facebook_accounts FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own Facebook accounts"
  ON facebook_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own Facebook accounts"
  ON facebook_accounts FOR UPDATE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own Facebook accounts"
  ON facebook_accounts FOR DELETE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for scheduled_stories
CREATE POLICY "Users can view stories for their Facebook accounts"
  ON scheduled_stories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can create stories for their Facebook accounts"
  ON scheduled_stories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can update stories for their Facebook accounts"
  ON scheduled_stories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can delete stories for their Facebook accounts"
  ON scheduled_stories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_facebook_accounts_updated_at
  BEFORE UPDATE ON facebook_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_stories_updated_at
  BEFORE UPDATE ON scheduled_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();