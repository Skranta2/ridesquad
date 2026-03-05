import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';
import { useUserProfile } from '@/context/UserProfileContext';
import {
  getFavorites,
  getWaitlist,
  getRecents,
  removeFavorite,
  promoteFavoriteFromWaitlist,
  addFavorite,
  searchProfiles,
  createInvite,
  buildInviteLink,
} from '@/lib/database';
import type { FavoriteWithProfile, RecentWithProfile, Profile } from '@/lib/types';

type SearchResult = Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'email'>;

export default function FriendsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { profile } = useUserProfile();

  const [favorites, setFavorites] = useState<FavoriteWithProfile[]>([]);
  const [waitlist, setWaitlist] = useState<FavoriteWithProfile[]>([]);
  const [recents, setRecents] = useState<RecentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add friend state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Invite state — one token per panel open, shared across all 3 invite methods
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const closeAddFriendPanel = () => {
    setShowAddFriend(false);
    setSearchQuery('');
    setSearchResults([]);
    setInviteToken(null);
  };

  const loadData = useCallback(async () => {
    if (!profile) return;
    try {
      const [favs, wait, recs] = await Promise.all([
        getFavorites(profile.id),
        getWaitlist(profile.id),
        getRecents(profile.id),
      ]);
      setFavorites(favs);
      setWaitlist(wait);
      setRecents(recs);
    } catch (error: any) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2 || !profile) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchProfiles(query.trim(), profile.id);
      // Filter out users already in favorites or waitlist
      const favoriteIds = new Set(favorites.map((f) => f.target_user_id));
      const waitlistIds = new Set(waitlist.map((w) => w.target_user_id));
      const filtered = results.filter(
        (r) => !favoriteIds.has(r.id) && !waitlistIds.has(r.id)
      );
      setSearchResults(filtered);
    } catch (error: any) {
      console.error('Error searching profiles:', error);
    } finally {
      setSearching(false);
    }
  }, [profile, favorites, waitlist]);

  const handleAddFavorite = async (targetUser: SearchResult) => {
    if (!profile) return;
    setAddingUserId(targetUser.id);
    try {
      await addFavorite(profile.id, targetUser.id);
      setSearchResults((prev) => prev.filter((r) => r.id !== targetUser.id));
      await loadData();
      Alert.alert(
        t('friends.addedTitle'),
        t('friends.addedMessage').replace('{name}', targetUser.display_name ?? '')
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), t('friends.addFailed'));
    } finally {
      setAddingUserId(null);
    }
  };

  // --------------------------------------------------------------------------
  // Invite helpers — creates one token per panel session, reused across methods
  // --------------------------------------------------------------------------

  const getOrCreateToken = useCallback(async (): Promise<string | null> => {
    if (!profile) return null;
    if (inviteToken) return inviteToken;

    setInviteLoading(true);
    try {
      const invite = await createInvite('friend', profile.id, profile.id);
      setInviteToken(invite.token);
      return invite.token;
    } catch (err: any) {
      Alert.alert(t('common.error'), t('friends.inviteFailed'));
      return null;
    } finally {
      setInviteLoading(false);
    }
  }, [profile, inviteToken, t]);

  const handleShowQr = useCallback(async () => {
    const token = await getOrCreateToken();
    if (!token) return;
    setQrVisible(true);
  }, [getOrCreateToken]);

  const handleCopyCode = useCallback(async () => {
    const token = await getOrCreateToken();
    if (!token) return;
    await Clipboard.setStringAsync(buildInviteLink('friend', token));
    Alert.alert(t('friends.codeCopied'), t('friends.codeCopiedHint'));
  }, [getOrCreateToken, t]);

  const handleSendEmail = useCallback(async () => {
    const token = await getOrCreateToken();
    if (!token) return;
    const link = buildInviteLink('friend', token);
    const subject = encodeURIComponent(t('friends.emailSubject'));
    const body = encodeURIComponent(
      t('friends.emailBody').replace('{code}', token).replace('{link}', link)
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  }, [getOrCreateToken, t]);

  // --------------------------------------------------------------------------

  const handleRemoveFavorite = (favoriteId: string, name: string) => {
    Alert.alert(
      t('friends.removeFavorite'),
      t('friends.removeFavoriteConfirm').replace('{name}', name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFavorite(favoriteId);
              if (profile) {
                await promoteFavoriteFromWaitlist(profile.id);
              }
              await loadData();
            } catch (error: any) {
              Alert.alert(t('common.error'), t('friends.removeFailed'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('friends.today');
    if (diffDays === 1) return t('friends.yesterday');
    if (diffDays < 7) return t('friends.daysAgo').replace('{days}', String(diffDays));
    return date.toLocaleDateString();
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
      <Text style={styles.title}>{t('tabs.friends')}</Text>

      {/* Add Friend Button / Search Panel */}
      {!showAddFriend ? (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: palette.tint }]}
          onPress={() => setShowAddFriend(true)}
        >
          <FontAwesome name="user-plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>{t('friends.addFriend')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
          <View style={styles.addFriendHeader}>
            <Text style={styles.cardTitle}>{t('friends.addFriend')}</Text>
            <TouchableOpacity onPress={closeAddFriendPanel}>
              <FontAwesome name="times" size={18} color={palette.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: palette.groupedBackground,
                color: colorScheme === 'dark' ? '#fff' : '#000',
                borderColor: palette.separator,
              },
            ]}
            placeholder={t('friends.searchPlaceholder')}
            placeholderTextColor={palette.secondaryText}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Search Results */}
          {searching && (
            <ActivityIndicator size="small" color={palette.tint} style={{ marginVertical: 10 }} />
          )}

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((user) => (
                <View key={user.id} style={styles.personRow}>
                  <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
                    <Text style={styles.avatarText}>
                      {(user.display_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                      {user.display_name ?? t('friends.unknownUser')}
                    </Text>
                    {user.email && (
                      <Text style={[styles.personEmail, { color: palette.secondaryText }]}>
                        {user.email}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.addPersonButton, { backgroundColor: palette.tint }]}
                    onPress={() => handleAddFavorite(user)}
                    disabled={addingUserId === user.id}
                  >
                    {addingUserId === user.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <FontAwesome name="plus" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <Text style={[styles.noResults, { color: palette.secondaryText }]}>
              {t('friends.noSearchResults')}
            </Text>
          )}

          {/* ── 3 Invite Options ── */}
          <View style={[styles.divider, { backgroundColor: palette.separator }]} />
          <Text style={[styles.inviteSectionTitle, { color: palette.secondaryText }]}>
            {t('friends.inviteOptions')}
          </Text>

          {/* 1. Show QR Code */}
          <TouchableOpacity
            style={styles.inviteRow}
            onPress={handleShowQr}
            disabled={inviteLoading}
          >
            <View style={[styles.inviteIconBox, { backgroundColor: palette.tint + '22' }]}>
              <FontAwesome name="qrcode" size={20} color={palette.tint} />
            </View>
            <Text style={[styles.inviteRowTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
              {t('friends.showQrCode')}
            </Text>
            {inviteLoading ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <FontAwesome name="chevron-right" size={13} color={palette.secondaryText} />
            )}
          </TouchableOpacity>

          {/* 2. Copy Invite Code */}
          <TouchableOpacity
            style={styles.inviteRow}
            onPress={handleCopyCode}
            disabled={inviteLoading}
          >
            <View style={[styles.inviteIconBox, { backgroundColor: palette.tint + '22' }]}>
              <FontAwesome name="copy" size={18} color={palette.tint} />
            </View>
            <Text style={[styles.inviteRowTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
              {t('friends.copyCode')}
            </Text>
            {inviteLoading ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <FontAwesome name="chevron-right" size={13} color={palette.secondaryText} />
            )}
          </TouchableOpacity>

          {/* 3. Send via Email */}
          <TouchableOpacity
            style={styles.inviteRow}
            onPress={handleSendEmail}
            disabled={inviteLoading}
          >
            <View style={[styles.inviteIconBox, { backgroundColor: palette.tint + '22' }]}>
              <FontAwesome name="envelope" size={16} color={palette.tint} />
            </View>
            <Text style={[styles.inviteRowTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
              {t('friends.sendEmail')}
            </Text>
            {inviteLoading ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <FontAwesome name="chevron-right" size={13} color={palette.secondaryText} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Favorites Section */}
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>{t('friends.favorites')}</Text>
          <Text style={[styles.countBadge, { color: palette.secondaryText }]}>
            {favorites.length}/15
          </Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: palette.secondaryText }]}>
          {t('friends.favoritesDescription')}
        </Text>
        {favorites.length > 0 ? (
          favorites.map((fav) => (
            <View key={fav.id} style={styles.personRow}>
              <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
                <Text style={styles.avatarText}>
                  {(fav.target_profile?.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.personName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                {fav.target_profile?.display_name ?? t('friends.unknownUser')}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFavorite(fav.id, fav.target_profile?.display_name ?? '')}
              >
                <FontAwesome name="star" size={18} color="#FFD60A" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyState, { color: palette.secondaryText }]}>
            {t('friends.noFavorites')}
          </Text>
        )}
      </View>

      {/* Waitlist Section */}
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>{t('friends.waitlist')}</Text>
          <Text style={[styles.countBadge, { color: palette.secondaryText }]}>
            {waitlist.length}
          </Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: palette.secondaryText }]}>
          {t('friends.waitlistDescription')}
        </Text>
        {waitlist.length > 0 ? (
          waitlist.map((w) => (
            <View key={w.id} style={styles.personRow}>
              <View style={[styles.avatar, { backgroundColor: palette.separator }]}>
                <Text style={styles.avatarText}>
                  {(w.target_profile?.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.personName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                {w.target_profile?.display_name ?? t('friends.unknownUser')}
              </Text>
              <Text style={[styles.positionText, { color: palette.secondaryText }]}>
                #{w.position}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyState, { color: palette.secondaryText }]}>
            {t('friends.noWaitlist')}
          </Text>
        )}
      </View>

      {/* Recent Section */}
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>{t('friends.recent')}</Text>
          <Text style={[styles.countBadge, { color: palette.secondaryText }]}>
            {recents.length}
          </Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: palette.secondaryText }]}>
          {t('friends.recentDescription')}
        </Text>
        {recents.length > 0 ? (
          recents.map((r) => (
            <View key={r.id} style={styles.personRow}>
              <View style={[styles.avatar, { backgroundColor: palette.separator }]}>
                <Text style={styles.avatarText}>
                  {(r.target_profile?.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                  {r.target_profile?.display_name ?? t('friends.unknownUser')}
                </Text>
                <Text style={[styles.lastSeen, { color: palette.secondaryText }]}>
                  {formatDate(r.last_seen_at)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyState, { color: palette.secondaryText }]}>
            {t('friends.noRecent')}
          </Text>
        )}
      </View>

      {/* ── QR Code Modal ── */}
      <Modal
        visible={qrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: palette.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
              {t('friends.qrCodeTitle')}
            </Text>

            {/* QR always on white background for max scanner compatibility */}
            <View style={styles.qrBox}>
              {inviteToken && (
                <QRCode
                  value={buildInviteLink('friend', inviteToken)}
                  size={220}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              )}
            </View>

            {/* Show the raw code so the friend can type it manually */}
            <Text style={[styles.modalToken, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
              {inviteToken}
            </Text>

            <Text style={[styles.modalHint, { color: palette.secondaryText }]}>
              {t('friends.qrCodeHint')}
            </Text>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.tint }]}
              onPress={() => setQrVisible(false)}
            >
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  addButtonText: {
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
  addFriendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  searchResults: {
    marginTop: 4,
  },
  noResults: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  inviteSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  inviteIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteRowTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  countBadge: {
    fontSize: 14,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  personName: {
    fontSize: 16,
    flex: 1,
  },
  personInfo: {
    flex: 1,
  },
  personEmail: {
    fontSize: 13,
    marginTop: 1,
  },
  lastSeen: {
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    padding: 6,
  },
  addPersonButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 14,
  },
  emptyState: {
    marginTop: 6,
    fontSize: 14,
    paddingVertical: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  qrBox: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  modalToken: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modalHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
