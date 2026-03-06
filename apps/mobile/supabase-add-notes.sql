-- ==========================================================================
-- Add notes column to favorites table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- Allows users to add personal notes about each friend/waitlisted contact.
-- ==========================================================================

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS notes TEXT;
