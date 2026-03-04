-- ==========================================================================
-- RLS Recursion Fix
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- Problem: teams SELECT policy references team_members, and team_members
-- SELECT policy references teams — causing infinite recursion.
-- Same issue between sessions and session_participants.
--
-- Fix: SECURITY DEFINER helper functions that bypass RLS for cross-table
-- policy lookups.
-- ==========================================================================

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER helper functions
-- These run as the function owner (postgres) and bypass RLS
-- ============================================================================

-- Get team IDs where user is a member
CREATE OR REPLACE FUNCTION get_user_team_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT team_id FROM team_members WHERE user_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get team IDs where user is owner
CREATE OR REPLACE FUNCTION get_user_owned_team_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM teams WHERE owner_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get session IDs where user is a participant
CREATE OR REPLACE FUNCTION get_user_session_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT session_id FROM session_participants WHERE user_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get session IDs where user is owner
CREATE OR REPLACE FUNCTION get_user_owned_session_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM sessions WHERE owner_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: Fix TEAMS policies (remove direct team_members subquery)
-- ============================================================================

DROP POLICY IF EXISTS "Team members can view team" ON teams;
CREATE POLICY "Team members can view team" ON teams
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT get_user_team_ids(auth.uid()))
  );

-- ============================================================================
-- STEP 3: Fix TEAM_MEMBERS policies (remove direct teams subquery)
-- ============================================================================

DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;
CREATE POLICY "Team owners can manage members" ON team_members
  FOR ALL USING (
    team_id IN (SELECT get_user_owned_team_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can view team members if member" ON team_members;
CREATE POLICY "Users can view team members if member" ON team_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    team_id IN (SELECT get_user_team_ids(auth.uid())) OR
    team_id IN (SELECT get_user_owned_team_ids(auth.uid()))
  );

-- ============================================================================
-- STEP 4: Fix SESSIONS policies (remove direct session_participants subquery)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view session" ON sessions;
CREATE POLICY "Participants can view session" ON sessions
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT get_user_session_ids(auth.uid()))
  );

-- ============================================================================
-- STEP 5: Fix SESSION_PARTICIPANTS policies (remove direct sessions subquery)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view session participants" ON session_participants;
CREATE POLICY "Participants can view session participants" ON session_participants
  FOR SELECT USING (
    session_id IN (SELECT get_user_session_ids(auth.uid())) OR
    session_id IN (SELECT get_user_owned_session_ids(auth.uid()))
  );

-- ============================================================================
-- STEP 6: Fix INVITES update policy (allow accepting invites)
-- The current "Invite creators can manage invites" FOR ALL policy only allows
-- the creator to update. We need to allow any authenticated user to update
-- an invite (to mark it as used when they accept it).
-- ============================================================================

DROP POLICY IF EXISTS "Invite creators can manage invites" ON invites;
CREATE POLICY "Invite creators can manage invites" ON invites
  FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can accept invites" ON invites;
CREATE POLICY "Anyone can accept invites" ON invites
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DONE! Verify by running:
-- SELECT * FROM teams LIMIT 1;
-- SELECT * FROM team_members LIMIT 1;
-- SELECT * FROM sessions LIMIT 1;
-- SELECT * FROM session_participants LIMIT 1;
-- ============================================================================
