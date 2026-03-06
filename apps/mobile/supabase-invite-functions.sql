-- ==========================================================================
-- Atomic Invite Acceptance Functions
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- Problem: Client-side invite acceptance had two bugs:
--   1. acceptInvite() marked the invite as "used" BEFORE the action ran,
--      so a failed action left the invite permanently consumed.
--   2. addMutualFavorites() silently failed for the inviter → invitee
--      direction because RLS blocks inserting rows for other users.
--
-- Fix: SECURITY DEFINER functions run as the postgres owner (bypasses RLS)
-- and perform all steps atomically — either everything succeeds or the
-- invite stays unconsumed.
-- ==========================================================================


-- ==========================================================================
-- STEP 1: Reset stuck invites
-- Clears "used_at" for invites that were marked used in the last 7 days
-- so you can re-test without generating new invite links.
-- ==========================================================================

UPDATE invites
SET used_at = NULL
WHERE used_at > NOW() - INTERVAL '7 days';


-- ==========================================================================
-- STEP 2: accept_team_invite
-- Called by the mobile app via supabase.rpc('accept_team_invite', {...})
-- Steps (all atomic):
--   1. Lock + validate invite (exists, type=team, not used, not expired)
--   2. Check team member limit (max 15)
--   3. Upsert team_member with 24-hour active_until
--   4. Mark invite as used
-- ==========================================================================

CREATE OR REPLACE FUNCTION accept_team_invite(
  p_invite_id UUID,
  p_user_id   UUID
)
RETURNS void AS $$
DECLARE
  v_invite       invites%ROWTYPE;
  v_team_id      UUID;
  v_member_count INTEGER;
BEGIN
  -- Lock the row so two simultaneous acceptances cannot both succeed
  SELECT * INTO v_invite
  FROM invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.type != 'team' THEN
    RAISE EXCEPTION 'Invalid invite type';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  v_team_id := v_invite.target_id;

  -- Enforce max-15-member limit
  SELECT COUNT(*) INTO v_member_count
  FROM team_members
  WHERE team_id = v_team_id;

  IF v_member_count >= 15 THEN
    RAISE EXCEPTION 'Maximum team member limit reached';
  END IF;

  -- Add or reactivate the member with a fresh 24-hour window
  INSERT INTO team_members (team_id, user_id, active_until)
  VALUES (v_team_id, p_user_id, NOW() + INTERVAL '24 hours')
  ON CONFLICT (team_id, user_id) DO UPDATE
    SET active_until = NOW() + INTERVAL '24 hours';

  -- Only mark used after everything above succeeds
  UPDATE invites
  SET used_at = NOW()
  WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================================================
-- STEP 3: accept_friend_invite
-- Called by the mobile app via supabase.rpc('accept_friend_invite', {...})
-- Steps (all atomic):
--   1. Lock + validate invite (exists, type=friend, not used, not expired)
--   2. Insert invitee → inviter favorite (waitlist if full)
--   3. Insert inviter → invitee favorite (waitlist if full) — bypasses RLS
--   4. Mark invite as used
-- ==========================================================================

CREATE OR REPLACE FUNCTION accept_friend_invite(
  p_invite_id UUID,
  p_user_id   UUID
)
RETURNS void AS $$
DECLARE
  v_invite        invites%ROWTYPE;
  v_inviter_id    UUID;
  v_invitee_count INTEGER;
  v_inviter_count INTEGER;
  v_next_position INTEGER;
BEGIN
  -- Lock the row so two simultaneous acceptances cannot both succeed
  SELECT * INTO v_invite
  FROM invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.type != 'friend' THEN
    RAISE EXCEPTION 'Invalid invite type';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  v_inviter_id := v_invite.created_by;

  -- ── Side A: invitee (p_user_id) adds inviter to their favorites ────────

  SELECT COUNT(*) INTO v_invitee_count
  FROM favorites
  WHERE owner_id = p_user_id AND status = 'favorite';

  IF v_invitee_count >= 15 THEN
    -- Favorites full → waitlist
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
    FROM favorites
    WHERE owner_id = p_user_id AND status = 'waitlisted';

    INSERT INTO favorites (owner_id, target_user_id, status, position)
    VALUES (p_user_id, v_inviter_id, 'waitlisted', v_next_position)
    ON CONFLICT (owner_id, target_user_id) DO NOTHING;
  ELSE
    INSERT INTO favorites (owner_id, target_user_id, status)
    VALUES (p_user_id, v_inviter_id, 'favorite')
    ON CONFLICT (owner_id, target_user_id) DO NOTHING;
  END IF;

  -- ── Side B: inviter adds invitee to THEIR favorites (bypasses RLS) ─────

  SELECT COUNT(*) INTO v_inviter_count
  FROM favorites
  WHERE owner_id = v_inviter_id AND status = 'favorite';

  IF v_inviter_count >= 15 THEN
    -- Favorites full → waitlist
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
    FROM favorites
    WHERE owner_id = v_inviter_id AND status = 'waitlisted';

    INSERT INTO favorites (owner_id, target_user_id, status, position)
    VALUES (v_inviter_id, p_user_id, 'waitlisted', v_next_position)
    ON CONFLICT (owner_id, target_user_id) DO NOTHING;
  ELSE
    INSERT INTO favorites (owner_id, target_user_id, status)
    VALUES (v_inviter_id, p_user_id, 'favorite')
    ON CONFLICT (owner_id, target_user_id) DO NOTHING;
  END IF;

  -- Only mark used after both favorites are inserted
  UPDATE invites
  SET used_at = NOW()
  WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================================================
-- STEP 4: Grant execute permission to authenticated users
-- ==========================================================================

GRANT EXECUTE ON FUNCTION accept_team_invite(UUID, UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_invite(UUID, UUID) TO authenticated;


-- ==========================================================================
-- DONE ✓
-- Verify with:
--   SELECT proname FROM pg_proc WHERE proname IN ('accept_team_invite', 'accept_friend_invite');
-- Expected output: two rows.
-- ==========================================================================
