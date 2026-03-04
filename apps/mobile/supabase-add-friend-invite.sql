-- ==========================================================================
-- Add 'friend' invite type
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- Update the invites type constraint to include 'friend'
ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_type_check;
ALTER TABLE invites ADD CONSTRAINT invites_type_check CHECK (type IN ('session', 'team', 'friend'));
