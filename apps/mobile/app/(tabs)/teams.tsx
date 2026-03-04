import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';
import { useUserProfile } from '@/context/UserProfileContext';
import {
  getMyTeams,
  createTeam,
  renameTeam,
  deleteTeam,
  reactivateTeamMember,
  leaveTeam,
  createInvite,
  buildInviteLink,
} from '@/lib/database';
import type { TeamWithMembers, TeamMemberWithProfile } from '@/lib/types';

export default function TeamsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { profile } = useUserProfile();

  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getMyTeams(profile.id);
      setTeams(data);
    } catch (error: any) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTeams();
  }, [loadTeams]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !profile) return;

    setCreating(true);
    try {
      await createTeam(newTeamName.trim(), profile.id);
      setNewTeamName('');
      setShowCreateForm(false);
      await loadTeams();
    } catch (error: any) {
      if (error.message?.includes('Maximum team limit')) {
        Alert.alert(t('teams.error'), t('teams.maxTeamsReached'));
      } else {
        Alert.alert(t('teams.error'), t('teams.createFailed'));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    Alert.alert(
      t('teams.deleteTeam'),
      t('teams.deleteTeamConfirm').replace('{name}', teamName),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTeam(teamId);
              await loadTeams();
            } catch (error: any) {
              Alert.alert(t('teams.error'), t('teams.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (teamId: string) => {
    if (!profile) return;
    try {
      await reactivateTeamMember(teamId, profile.id);
      await loadTeams();
    } catch (error: any) {
      Alert.alert(t('teams.error'), t('teams.reactivateFailed'));
    }
  };

  const handleLeaveTeam = (teamId: string, teamName: string) => {
    if (!profile) return;
    Alert.alert(
      t('teams.leaveTeam'),
      t('teams.leaveTeamConfirm').replace('{name}', teamName),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('teams.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveTeam(teamId, profile.id);
              await loadTeams();
            } catch (error: any) {
              Alert.alert(t('teams.error'), t('teams.leaveFailed'));
            }
          },
        },
      ]
    );
  };

  const handleShareInvite = async (team: TeamWithMembers) => {
    if (!profile) return;
    try {
      const invite = await createInvite('team', team.id, profile.id);
      const link = buildInviteLink('team', invite.token);
      await Share.share({
        message: t('teams.inviteMessage').replace('{name}', team.name).replace('{link}', link),
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        Alert.alert(t('teams.error'), t('teams.inviteFailed'));
      }
    }
  };

  const isActive = (member: TeamMemberWithProfile): boolean => {
    if (!member.active_until) return false;
    return new Date(member.active_until) > new Date();
  };

  const isOwner = (team: TeamWithMembers): boolean => {
    return team.owner_id === profile?.id;
  };

  const getMyMembership = (team: TeamWithMembers): TeamMemberWithProfile | undefined => {
    return team.members.find((m) => m.user_id === profile?.id);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.groupedBackground }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.groupedBackground }}
      contentContainerStyle={[styles.container, { backgroundColor: palette.groupedBackground }]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
      }
    >
      <Text style={styles.title}>{t('tabs.teams')}</Text>

      {/* Create Team Button / Form */}
      {!showCreateForm ? (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: palette.tint }]}
          onPress={() => setShowCreateForm(true)}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.createButtonText}>{t('teams.createTeam')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
          <Text style={styles.cardTitle}>{t('teams.createTeam')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.groupedBackground,
                color: colorScheme === 'dark' ? '#fff' : '#000',
                borderColor: palette.separator,
              },
            ]}
            placeholder={t('teams.teamNamePlaceholder')}
            placeholderTextColor={palette.secondaryText}
            value={newTeamName}
            onChangeText={setNewTeamName}
            autoFocus
            editable={!creating}
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: palette.separator }]}
              onPress={() => { setShowCreateForm(false); setNewTeamName(''); }}
              disabled={creating}
            >
              <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: palette.tint, opacity: newTeamName.trim() ? 1 : 0.5 }]}
              onPress={handleCreateTeam}
              disabled={!newTeamName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
          <Text style={[styles.emptyState, { color: palette.secondaryText }]}>
            {t('teams.noTeams')}
          </Text>
          <Text style={[styles.emptyStateHint, { color: palette.secondaryText }]}>
            {t('teams.noTeamsHint')}
          </Text>
        </View>
      ) : (
        teams.map((team) => {
          const activeMembers = team.members.filter(isActive);
          const myMembership = getMyMembership(team);
          const amActive = myMembership ? isActive(myMembership) : false;
          const amOwner = isOwner(team);

          return (
            <View
              key={team.id}
              style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}
            >
              {/* Team Header */}
              <View style={styles.teamHeader}>
                <View style={styles.teamHeaderLeft}>
                  <Text style={styles.cardTitle}>{team.name}</Text>
                  <Text style={[styles.memberCount, { color: palette.secondaryText }]}>
                    {t('teams.memberCount').replace('{count}', String(team.member_count))}
                  </Text>
                </View>
                {amOwner && (
                  <View style={styles.teamActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleShareInvite(team)}
                    >
                      <FontAwesome name="share-alt" size={18} color={palette.tint} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteTeam(team.id, team.name)}
                    >
                      <FontAwesome name="trash-o" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Active Members */}
              <Text style={[styles.sectionLabel, { color: palette.secondaryText }]}>
                {t('teams.activeMembers')} ({activeMembers.length})
              </Text>
              {activeMembers.length > 0 ? (
                activeMembers.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
                      <Text style={styles.avatarText}>
                        {(member.profile?.display_name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', flex: 1 }}>
                      {member.profile?.display_name ?? t('teams.unknownMember')}
                    </Text>
                    <View style={[styles.activeIndicator, { backgroundColor: '#34C759' }]} />
                  </View>
                ))
              ) : (
                <Text style={[styles.noMembers, { color: palette.secondaryText }]}>
                  {t('teams.noActiveMembers')}
                </Text>
              )}

              {/* Your Status */}
              <View style={styles.statusSection}>
                {amActive ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#34C75920' }]}>
                    <FontAwesome name="check-circle" size={14} color="#34C759" />
                    <Text style={{ color: '#34C759', fontSize: 14, marginLeft: 6 }}>
                      {t('teams.statusActive')}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.reactivateButton, { backgroundColor: palette.tint }]}
                    onPress={() => handleReactivate(team.id)}
                  >
                    <Text style={styles.reactivateButtonText}>{t('teams.reactivate')}</Text>
                  </TouchableOpacity>
                )}

                {!amOwner && (
                  <TouchableOpacity
                    style={styles.leaveButton}
                    onPress={() => handleLeaveTeam(team.id, team.name)}
                  >
                    <Text style={{ color: '#FF3B30', fontSize: 14 }}>{t('teams.leave')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Owner: All Members */}
              {amOwner && (
                <>
                  <Text style={[styles.sectionLabel, { color: palette.secondaryText, marginTop: 12 }]}>
                    {t('teams.allMembers')}
                  </Text>
                  {team.members.map((member) => (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={[styles.avatar, { backgroundColor: isActive(member) ? palette.tint : palette.separator }]}>
                        <Text style={styles.avatarText}>
                          {(member.profile?.display_name ?? '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', flex: 1 }}>
                        {member.profile?.display_name ?? t('teams.unknownMember')}
                      </Text>
                      {isActive(member) ? (
                        <View style={[styles.activeIndicator, { backgroundColor: '#34C759' }]} />
                      ) : (
                        <Text style={{ color: palette.secondaryText, fontSize: 12 }}>
                          {t('teams.inactive')}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 12,
  },
  emptyStateHint: {
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  teamHeaderLeft: {
    flex: 1,
  },
  memberCount: {
    fontSize: 13,
    marginTop: 2,
  },
  teamActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noMembers: {
    fontSize: 14,
    paddingVertical: 4,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reactivateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reactivateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
