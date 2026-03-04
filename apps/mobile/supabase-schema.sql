-- RideSquad Supabase Database Schema
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Run the migration script first if upgrading from an existing schema
-- See: supabase-migration.sql

-- ============================================================================
-- PROFILES TABLE
-- Extends auth.users with app-specific data
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  use_case TEXT CHECK (use_case IN ('motorcycle', 'work', 'hunting', NULL)),
  marketing_consent BOOLEAN DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'sv', 'fi', 'no', 'de', 'es')),
  theme TEXT DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TEAMS TABLE
-- Premium users can own up to 5 teams with up to 15 members each
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TEAM MEMBERS TABLE
-- Tracks team membership with 24-hour active status
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  active_until TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ============================================================================
-- FAVORITES TABLE
-- Premium users can have up to 15 favorites, overflow goes to waitlist
-- ============================================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'favorite' CHECK (status IN ('favorite', 'waitlisted')) NOT NULL,
  position INTEGER, -- For ordering waitlist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, target_user_id)
);

-- ============================================================================
-- RECENTS TABLE
-- Tracks recent participants (30-day retention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, target_user_id)
);

-- ============================================================================
-- SESSIONS TABLE
-- Voice sessions with 24-hour inactivity timeout
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')) NOT NULL,
  max_participants INTEGER DEFAULT 2,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================================================
-- SESSION PARTICIPANTS TABLE
-- Tracks who joined which session
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- ============================================================================
-- INVITES TABLE
-- For session and team invites via link/QR
-- ============================================================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('session', 'team', 'friend')) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  target_id UUID NOT NULL, -- References sessions.id, teams.id, or profiles.id (for friend)
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FREE USAGE TABLE
-- Tracks free tier 60-minute usage per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS free_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  seconds_used INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECURITY DEFINER HELPERS (break RLS recursion between related tables)
-- ============================================================================

-- Get team IDs where user is a member (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_team_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT team_id FROM team_members WHERE user_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get team IDs where user is owner (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_owned_team_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM teams WHERE owner_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get session IDs where user is a participant (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_session_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT session_id FROM session_participants WHERE user_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get session IDs where user is owner (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_owned_session_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM sessions WHERE owner_id = user_uuid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate secure invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Check if user can create more teams (max 5)
CREATE OR REPLACE FUNCTION check_team_limit()
RETURNS TRIGGER AS $$
DECLARE
  team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_count
  FROM teams
  WHERE owner_id = NEW.owner_id;

  IF team_count >= 5 THEN
    RAISE EXCEPTION 'Maximum team limit (5) reached';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if team can add more members (max 15)
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE team_id = NEW.team_id;

  IF member_count >= 15 THEN
    RAISE EXCEPTION 'Maximum team member limit (15) reached';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if user can add more favorites (max 15, overflow to waitlist)
CREATE OR REPLACE FUNCTION check_favorite_limit()
RETURNS TRIGGER AS $$
DECLARE
  favorite_count INTEGER;
BEGIN
  IF NEW.status = 'favorite' THEN
    SELECT COUNT(*) INTO favorite_count
    FROM favorites
    WHERE owner_id = NEW.owner_id AND status = 'favorite';

    IF favorite_count >= 15 THEN
      NEW.status := 'waitlisted';
      NEW.position := (
        SELECT COALESCE(MAX(position), 0) + 1
        FROM favorites
        WHERE owner_id = NEW.owner_id AND status = 'waitlisted'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired recents (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_recents()
RETURNS void AS $$
BEGIN
  DELETE FROM recents
  WHERE last_seen_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Expire inactive sessions (24 hours)
CREATE OR REPLACE FUNCTION expire_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET status = 'expired', ended_at = NOW()
  WHERE status = 'active'
    AND last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Limit enforcement triggers
DROP TRIGGER IF EXISTS enforce_team_limit ON teams;
CREATE TRIGGER enforce_team_limit
  BEFORE INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION check_team_limit();

DROP TRIGGER IF EXISTS enforce_team_member_limit ON team_members;
CREATE TRIGGER enforce_team_member_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION check_team_member_limit();

DROP TRIGGER IF EXISTS enforce_favorite_limit ON favorites;
CREATE TRIGGER enforce_favorite_limit
  BEFORE INSERT ON favorites
  FOR EACH ROW EXECUTE FUNCTION check_favorite_limit();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_usage ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can view other profiles (basic info only - enforced by column selection in queries)
DROP POLICY IF EXISTS "Users can view other profiles basic info" ON profiles;
CREATE POLICY "Users can view other profiles basic info" ON profiles
  FOR SELECT USING (true);

-- TEAMS POLICIES
DROP POLICY IF EXISTS "Users can create teams" ON teams;
CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Team members can view team" ON teams;
CREATE POLICY "Team members can view team" ON teams
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT get_user_team_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Team owners can update team" ON teams;
CREATE POLICY "Team owners can update team" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Team owners can delete team" ON teams;
CREATE POLICY "Team owners can delete team" ON teams
  FOR DELETE USING (owner_id = auth.uid());

-- TEAM MEMBERS POLICIES
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

DROP POLICY IF EXISTS "Users can leave teams" ON team_members;
CREATE POLICY "Users can leave teams" ON team_members
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own membership" ON team_members;
CREATE POLICY "Users can update own membership" ON team_members
  FOR UPDATE USING (user_id = auth.uid());

-- FAVORITES POLICIES
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (owner_id = auth.uid());

-- RECENTS POLICIES
DROP POLICY IF EXISTS "Users can manage own recents" ON recents;
CREATE POLICY "Users can manage own recents" ON recents
  FOR ALL USING (owner_id = auth.uid());

-- SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
CREATE POLICY "Users can create sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Participants can view session" ON sessions;
CREATE POLICY "Participants can view session" ON sessions
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT get_user_session_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Session owners can update session" ON sessions;
CREATE POLICY "Session owners can update session" ON sessions
  FOR UPDATE USING (owner_id = auth.uid());

-- SESSION PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "Participants can view session participants" ON session_participants;
CREATE POLICY "Participants can view session participants" ON session_participants
  FOR SELECT USING (
    session_id IN (SELECT get_user_session_ids(auth.uid())) OR
    session_id IN (SELECT get_user_owned_session_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can join sessions" ON session_participants;
CREATE POLICY "Users can join sessions" ON session_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave sessions" ON session_participants;
CREATE POLICY "Users can leave sessions" ON session_participants
  FOR UPDATE USING (user_id = auth.uid());

-- INVITES POLICIES
DROP POLICY IF EXISTS "Users can create invites" ON invites;
CREATE POLICY "Users can create invites" ON invites
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Anyone can view invites by token" ON invites;
CREATE POLICY "Anyone can view invites by token" ON invites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Invite creators can manage invites" ON invites;
CREATE POLICY "Invite creators can manage invites" ON invites
  FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can accept invites" ON invites;
CREATE POLICY "Anyone can accept invites" ON invites
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- FREE USAGE POLICIES
DROP POLICY IF EXISTS "Users can view own usage" ON free_usage;
CREATE POLICY "Users can view own usage" ON free_usage
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own usage" ON free_usage;
CREATE POLICY "Users can insert own usage" ON free_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own usage" ON free_usage;
CREATE POLICY "Users can update own usage" ON free_usage
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active_until ON team_members(active_until);
CREATE INDEX IF NOT EXISTS idx_favorites_owner_id ON favorites(owner_id);
CREATE INDEX IF NOT EXISTS idx_favorites_status ON favorites(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_recents_owner_id ON recents(owner_id);
CREATE INDEX IF NOT EXISTS idx_recents_last_seen ON recents(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_sessions_owner_id ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_target_id ON invites(target_id);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_free_usage_user_id ON free_usage(user_id);
