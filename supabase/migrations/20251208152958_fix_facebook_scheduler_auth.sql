/*
  # Fix Facebook Scheduler RLS Policies

  1. Updates
    - Replace current_setting() calls with proper auth.uid() function
    - Ensures policies work correctly with Supabase authentication
    - Simplifies policy logic for better performance and reliability

  2. Security
    - RLS policies now properly enforce user isolation
    - All policies use standard Supabase auth functions
*/

-- Drop existing policies for facebook_accounts
DROP POLICY IF EXISTS "Users can view their own Facebook accounts" ON facebook_accounts;
DROP POLICY IF EXISTS "Users can insert their own Facebook accounts" ON facebook_accounts;
DROP POLICY IF EXISTS "Users can update their own Facebook accounts" ON facebook_accounts;
DROP POLICY IF EXISTS "Users can delete their own Facebook accounts" ON facebook_accounts;

-- Drop existing policies for scheduled_stories
DROP POLICY IF EXISTS "Users can view stories for their Facebook accounts" ON scheduled_stories;
DROP POLICY IF EXISTS "Users can create stories for their Facebook accounts" ON scheduled_stories;
DROP POLICY IF EXISTS "Users can update stories for their Facebook accounts" ON scheduled_stories;
DROP POLICY IF EXISTS "Users can delete stories for their Facebook accounts" ON scheduled_stories;

-- Create new policies for facebook_accounts
CREATE POLICY "Users can view their own Facebook accounts"
  ON facebook_accounts FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own Facebook accounts"
  ON facebook_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own Facebook accounts"
  ON facebook_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own Facebook accounts"
  ON facebook_accounts FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create new policies for scheduled_stories
CREATE POLICY "Users can view stories for their Facebook accounts"
  ON scheduled_stories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create stories for their Facebook accounts"
  ON scheduled_stories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update stories for their Facebook accounts"
  ON scheduled_stories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete stories for their Facebook accounts"
  ON scheduled_stories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facebook_accounts
      WHERE facebook_accounts.id = scheduled_stories.facebook_account_id
      AND facebook_accounts.user_id = auth.uid()::text
    )
  );