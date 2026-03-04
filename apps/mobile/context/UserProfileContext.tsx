import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, upsertProfile, updateProfile } from '../lib/database';
import type { Profile } from '../lib/types';

interface UserProfileContextType {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => Promise<void>;
  clearProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const existingProfile = await getProfile(user.id);
      setProfile(existingProfile);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Listen for auth state changes to reload profile
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Small delay to let auth settle
          setTimeout(() => loadProfile(), 500);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    await loadProfile();
  }, [loadProfile]);

  const updateUserProfile = useCallback(async (
    updates: Partial<Omit<Profile, 'id' | 'created_at'>>
  ) => {
    if (!profile) throw new Error('No profile loaded');

    try {
      const updated = await updateProfile(profile.id, updates);
      setProfile(updated);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      throw err;
    }
  }, [profile]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setLoading(false);
    setError(null);
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        refreshProfile,
        updateUserProfile,
        clearProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
}
