// ============================================================================
// RideSquad TypeScript Type Definitions
// Matches the Supabase database schema (supabase-schema.sql)
// ============================================================================

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  use_case: 'motorcycle' | 'work' | 'hunting' | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  language: 'en' | 'sv' | 'fi' | 'no' | 'de' | 'es';
  theme: 'system' | 'light' | 'dark';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  active_until: string | null;
  joined_at: string;
}

export interface TeamWithMembers extends Team {
  members: TeamMemberWithProfile[];
  member_count: number;
}

export interface TeamMemberWithProfile extends TeamMember {
  profile?: Pick<Profile, 'display_name' | 'avatar_url'>;
}

export interface Favorite {
  id: string;
  owner_id: string;
  target_user_id: string;
  status: 'favorite' | 'waitlisted';
  position: number | null;
  created_at: string;
}

export interface FavoriteWithProfile extends Favorite {
  target_profile?: Pick<Profile, 'display_name' | 'avatar_url'>;
}

export interface Recent {
  id: string;
  owner_id: string;
  target_user_id: string;
  last_seen_at: string;
}

export interface RecentWithProfile extends Recent {
  target_profile?: Pick<Profile, 'display_name' | 'avatar_url'>;
}

export type SessionStatus = 'active' | 'ended' | 'expired';

export interface Session {
  id: string;
  owner_id: string;
  team_id: string | null;
  status: SessionStatus;
  max_participants: number;
  last_activity_at: string;
  created_at: string;
  ended_at: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
}

export type InviteType = 'session' | 'team' | 'friend';

export interface Invite {
  id: string;
  type: InviteType;
  token: string;
  target_id: string;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}
