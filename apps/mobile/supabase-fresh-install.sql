-- RideSquad Fresh Install Script
-- WARNING: This will DROP all existing tables and data!
-- Only use this for a fresh start or development environment
--
-- Run this BEFORE supabase-schema.sql

-- ============================================================================
-- DROP EVERYTHING WITH CASCADE
-- ============================================================================

-- Drop all tables first (CASCADE handles foreign keys)
DROP TABLE IF EXISTS free_usage CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS recents CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_invite_token() CASCADE;
DROP FUNCTION IF EXISTS check_team_limit() CASCADE;
DROP FUNCTION IF EXISTS check_team_member_limit() CASCADE;
DROP FUNCTION IF EXISTS check_favorite_limit() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_recents() CASCADE;
DROP FUNCTION IF EXISTS expire_inactive_sessions() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_teams(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS get_user_teams(UUID) CASCADE;

-- Drop any remaining triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- VERIFY CLEANUP
-- Run this to confirm profiles table is gone:
-- SELECT * FROM information_schema.tables WHERE table_name = 'profiles';
-- Should return 0 rows
-- ============================================================================

-- ============================================================================
-- Now run supabase-schema.sql to create fresh tables
-- ============================================================================
