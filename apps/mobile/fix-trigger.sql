-- RideSquad Migration Script
-- Run this if you have an existing database with the old schema
-- This will migrate from BIGINT ids to UUID ids

-- ============================================================================
-- STEP 1: Drop old triggers and functions that won't work with new schema
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS get_user_teams(BIGINT);

-- ============================================================================
-- STEP 2: If you have existing data with BIGINT ids, you need to:
-- 1. Export your data
-- 2. Run supabase-fresh-install.sql
-- 3. Run supabase-schema.sql
-- 4. Import your data with proper UUID ids
--
-- For development, it's easiest to just start fresh.
-- ============================================================================

-- Verify the old tables exist and check their structure
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles';

-- ============================================================================
-- NOTES:
-- - The new schema uses UUID for all user references (matching auth.users.id)
-- - Profile creation is now handled in the app (OnboardingScreen)
-- - No automatic profile creation trigger (was causing issues)
-- ============================================================================
