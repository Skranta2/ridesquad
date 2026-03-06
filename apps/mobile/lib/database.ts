// ============================================================================
// RideSquad Database Helper Functions
// CRUD operations for all Supabase tables
// ============================================================================

import * as ExpoCrypto from 'expo-crypto';
import { supabase } from './supabase';
import type {
  Profile,
  Team,
  TeamMember,
  TeamWithMembers,
  TeamMemberWithProfile,
  Favorite,
  FavoriteWithProfile,
  Recent,
  RecentWithProfile,
  Invite,
  InviteType,
} from './types';

// ============================================================================
// PROFILES
// ============================================================================

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      ...profile,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting profile:', error);
    throw error;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// TEAMS
// ============================================================================

export async function getMyTeams(userId: string): Promise<TeamWithMembers[]> {
  // Get teams where user is owner
  const { data: ownedTeams, error: ownedError } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (ownedError) {
    console.error('Error fetching owned teams:', ownedError);
    throw ownedError;
  }

  // Get teams where user is a member (not owner)
  const { data: memberships, error: memberError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (memberError) {
    console.error('Error fetching memberships:', memberError);
    throw memberError;
  }

  const memberTeamIds = memberships
    ?.map((m) => m.team_id)
    .filter((id) => !ownedTeams?.some((t) => t.id === id)) ?? [];

  let memberTeams: Team[] = [];
  if (memberTeamIds.length > 0) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .in('id', memberTeamIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching member teams:', error);
      throw error;
    }
    memberTeams = data ?? [];
  }

  const allTeams = [...(ownedTeams ?? []), ...memberTeams];

  // Load members for each team
  const teamsWithMembers: TeamWithMembers[] = await Promise.all(
    allTeams.map(async (team) => {
      const members = await getTeamMembers(team.id);
      return {
        ...team,
        members,
        member_count: members.length,
      };
    })
  );

  return teamsWithMembers;
}

export async function createTeam(name: string, ownerId: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();

  if (error) {
    console.error('Error creating team:', error);
    throw error;
  }

  // Auto-add owner as a member with 24h active status
  await addTeamMember(data.id, ownerId);

  return data;
}

export async function renameTeam(teamId: string, newName: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({ name: newName })
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error('Error renaming team:', error);
    throw error;
  }

  return data;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      profile:profiles!team_members_user_id_fkey(display_name, avatar_url)
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }

  return (data ?? []).map((member: any) => ({
    ...member,
    profile: member.profile ?? undefined,
  }));
}

export async function addTeamMember(teamId: string, userId: string): Promise<TeamMember> {
  const activeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('team_members')
    .upsert({
      team_id: teamId,
      user_id: userId,
      active_until: activeUntil,
    }, {
      onConflict: 'team_id,user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding team member:', error);
    throw error;
  }

  return data;
}

export async function reactivateTeamMember(teamId: string, userId: string): Promise<TeamMember> {
  const activeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('team_members')
    .update({ active_until: activeUntil })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error reactivating team member:', error);
    throw error;
  }

  return data;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  await removeTeamMember(teamId, userId);
}

// ============================================================================
// FAVORITES
// ============================================================================

export async function getFavorites(userId: string): Promise<FavoriteWithProfile[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      *,
      target_profile:profiles!favorites_target_user_id_fkey(display_name, avatar_url)
    `)
    .eq('owner_id', userId)
    .eq('status', 'favorite')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }

  return (data ?? []).map((fav: any) => ({
    ...fav,
    target_profile: fav.target_profile ?? undefined,
  }));
}

export async function getWaitlist(userId: string): Promise<FavoriteWithProfile[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      *,
      target_profile:profiles!favorites_target_user_id_fkey(display_name, avatar_url)
    `)
    .eq('owner_id', userId)
    .eq('status', 'waitlisted')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching waitlist:', error);
    throw error;
  }

  return (data ?? []).map((fav: any) => ({
    ...fav,
    target_profile: fav.target_profile ?? undefined,
  }));
}

export async function addFavorite(ownerId: string, targetUserId: string): Promise<Favorite> {
  const { data, error } = await supabase
    .from('favorites')
    .insert({
      owner_id: ownerId,
      target_user_id: targetUserId,
      status: 'favorite', // Trigger may change to 'waitlisted' if at 15
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }

  return data;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId);

  if (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
}

export async function promoteFavoriteFromWaitlist(ownerId: string): Promise<void> {
  // Find the first waitlisted entry
  const { data: firstWaitlisted, error: fetchError } = await supabase
    .from('favorites')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('status', 'waitlisted')
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (fetchError || !firstWaitlisted) return;

  // Promote to favorite
  const { error: updateError } = await supabase
    .from('favorites')
    .update({ status: 'favorite', position: null })
    .eq('id', firstWaitlisted.id);

  if (updateError) {
    console.error('Error promoting from waitlist:', updateError);
  }
}

// ============================================================================
// RECENTS
// ============================================================================

export async function getRecents(userId: string): Promise<RecentWithProfile[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('recents')
    .select(`
      *,
      target_profile:profiles!recents_target_user_id_fkey(display_name, avatar_url)
    `)
    .eq('owner_id', userId)
    .gte('last_seen_at', thirtyDaysAgo)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('Error fetching recents:', error);
    throw error;
  }

  return (data ?? []).map((r: any) => ({
    ...r,
    target_profile: r.target_profile ?? undefined,
  }));
}

export async function addRecent(ownerId: string, targetUserId: string): Promise<Recent> {
  const { data, error } = await supabase
    .from('recents')
    .upsert({
      owner_id: ownerId,
      target_user_id: targetUserId,
      last_seen_at: new Date().toISOString(),
    }, {
      onConflict: 'owner_id,target_user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding recent:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// INVITES
// ============================================================================

export async function createInvite(
  type: InviteType,
  targetId: string,
  createdBy: string
): Promise<Invite> {
  // Generate a URL-safe token (using expo-crypto for React Native)
  const tokenBytes = ExpoCrypto.getRandomBytes(24);
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 32);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('invites')
    .insert({
      type,
      token,
      target_id: targetId,
      created_by: createdBy,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invite:', error);
    throw error;
  }

  return data;
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching invite:', error);
    throw error;
  }

  return data;
}

export async function acceptInvite(inviteId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('invites')
    .update({
      used_at: new Date().toISOString(),
      used_by: userId,
    })
    .eq('id', inviteId);

  if (error) {
    console.error('Error accepting invite:', error);
    throw error;
  }
}

export async function getInvitesForTarget(
  type: InviteType,
  targetId: string
): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('type', type)
    .eq('target_id', targetId)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invites:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================================
// INVITE LINK HELPERS
// ============================================================================

export function buildInviteLink(type: InviteType, token: string): string {
  return `ridesquad://invite/${type}/${token}`;
}

export function parseInviteLink(url: string): { type: InviteType; token: string } | null {
  const match = url.match(/ridesquad:\/\/invite\/(session|team|friend)\/([a-z0-9]+)/);
  if (!match) return null;
  return { type: match[1] as InviteType, token: match[2] };
}

// ============================================================================
// PROFILE SEARCH (for adding favorites/inviting)
// ============================================================================

export async function searchProfiles(
  query: string,
  excludeUserId: string
): Promise<Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'email'>[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, email')
    .neq('id', excludeUserId)
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching profiles:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================================
// FAVORITE MANAGEMENT (notes, waitlist move, promote)
// ============================================================================

export async function updateFavoriteNotes(favoriteId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .update({ notes: notes.trim() || null })
    .eq('id', favoriteId);

  if (error) {
    console.error('Error updating favorite notes:', error);
    throw error;
  }
}

export async function moveFavoriteToWaitlist(favoriteId: string, ownerId: string): Promise<void> {
  // Find the current max waitlist position so we append at the end
  const { data: maxRow } = await supabase
    .from('favorites')
    .select('position')
    .eq('owner_id', ownerId)
    .eq('status', 'waitlisted')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (maxRow?.position ?? 0) + 1;

  const { error } = await supabase
    .from('favorites')
    .update({ status: 'waitlisted', position: nextPosition })
    .eq('id', favoriteId);

  if (error) {
    console.error('Error moving favorite to waitlist:', error);
    throw error;
  }
}

export async function promoteWaitlistToFavorite(favoriteId: string, ownerId: string): Promise<void> {
  // Count current favorites (not waitlisted) to enforce 15-cap
  const { count, error: countError } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'favorite');

  if (countError) throw countError;

  if ((count ?? 0) >= 15) {
    throw new Error('favorites_full');
  }

  const { error } = await supabase
    .from('favorites')
    .update({ status: 'favorite', position: null })
    .eq('id', favoriteId);

  if (error) {
    console.error('Error promoting waitlist to favorite:', error);
    throw error;
  }
}

// Outgoing friend invites that haven't been accepted yet
export async function getMyPendingInvites(userId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('created_by', userId)
    .eq('type', 'friend')
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending invites:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================================
// MUTUAL FAVORITES (friend invites add both directions)
// ============================================================================

export async function addMutualFavorites(userId1: string, userId2: string): Promise<void> {
  // Add each user as a favorite of the other (if not already)
  await supabase
    .from('favorites')
    .upsert(
      { owner_id: userId1, target_user_id: userId2, status: 'favorite' },
      { onConflict: 'owner_id,target_user_id' }
    );

  await supabase
    .from('favorites')
    .upsert(
      { owner_id: userId2, target_user_id: userId1, status: 'favorite' },
      { onConflict: 'owner_id,target_user_id' }
    );
}
