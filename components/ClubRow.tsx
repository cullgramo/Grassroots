import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { GROUPS } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import type { FollowedClub } from '@/utils/club';

export const groupLabel = (group: string): string => GROUPS.find((g) => g.id === group)?.label ?? group;

/** Follow or unfollow a club. Followed clubs are kept on this phone only. */
export function FollowButton({ club, large }: { club: FollowedClub; large?: boolean }) {
  const t = useTheme();
  const { followedClubs, toggleFollow } = useApp();
  const following = followedClubs.some((c) => c.id === club.id);
  return (
    <Pressable
      onPress={() => toggleFollow(club)}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? `Stop following ${club.name}` : `Follow ${club.name}`}
      hitSlop={8}
      style={[styles.follow, large && styles.followLarge, following ? { borderColor: t.tint } : { backgroundColor: t.tint, borderColor: t.tint }]}>
      <Text style={[styles.followText, large && styles.followTextLarge, { color: following ? t.tint : t.onTint }]}>{following ? 'Following' : 'Follow'}</Text>
    </Pressable>
  );
}

/** One club in a list: its name and sport, a line about its games, and the follow button. Opens the club's page. */
export function ClubRow({ club, detail }: { club: FollowedClub; detail: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/club/[name]', params: { name: club.name, sport: club.group } })}
      accessibilityRole="link"
      accessibilityLabel={`${club.name}, ${groupLabel(club.group)}. ${detail}`}
      style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.text}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{club.name}</Text>
        <Text style={[styles.detail, { color: t.muted }]} numberOfLines={2}>{groupLabel(club.group)} · {detail}</Text>
      </View>
      <FollowButton club={club} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  text: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '800' },
  detail: { fontSize: 13, marginTop: 2 },
  follow: { borderWidth: 1.5, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  followLarge: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 24, alignSelf: 'flex-start', marginTop: 14 },
  followText: { fontSize: 14, fontWeight: '800' },
  followTextLarge: { fontSize: 16 },
});
