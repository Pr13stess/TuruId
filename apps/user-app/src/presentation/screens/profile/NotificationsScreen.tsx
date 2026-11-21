import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Text } from "../../components/Typography";
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../../navigation/types';
import type { UserNotification } from '../../../domain/repositories/NotificationRepository';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const notificationIcons: Record<string, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  BOOKING: { name: 'calendar-outline', color: colors.success },
  PROPERTY: { name: 'home-outline', color: colors.accentStrong },
  CHAT: { name: 'chatbubble-outline', color: colors.primary },
  CALL: { name: 'call-outline', color: colors.success },
};

export function NotificationsScreen({ navigation }: ScreenProps<'Notifications'>) {
  const { notifications, chat } = useRepositories();
  const [page, setPage] = useState(0), [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lock = useRef(false), focused = useIsFocused();
  const load = useCallback(() => notifications.list(page), [notifications, page]);
  const state = useResource(load, focused ? 15000 : 0), reload = state.retry;
  const hasHeader = !!feedback;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  async function open(item: UserNotification) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFeedback(null);
    try {
      if (!item.read_at) await notifications.markRead(item.id);
      reload();
      if (!item.target_id) return;
      if (item.target_type === 'BOOKING') navigation.navigate('BookingDetail', { bookingId: item.target_id });
      else if (item.target_type === 'PROPERTY') navigation.navigate('PropertyDetail', { propertyId: item.target_id });
      else if (item.target_type === 'CHAT') {
        const conversation = (await chat.listConversations()).find(c => c.id === item.target_id);
        if (!conversation) throw new Error('Percakapan tidak tersedia.');
        navigation.navigate('Chat', { conversationId: conversation.id, propertyId: conversation.property_id, propertyName: conversation.property_name });
      } else if (item.target_type === 'CALL') setFeedback('Detail panggilan belum tersedia di versi ini.');
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Notifikasi gagal dibuka.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={state.data?.slice(0, 20) ?? []} keyExtractor={item => item.id}
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 40, width: "100%", maxWidth: 600, alignSelf: "center" }} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={hasHeader ? <View className="gap-[8px] rounded-t-card border border-line bg-surface px-[16px] py-[14px]">
        {!!feedback && <Text accessibilityRole="alert" className="text-label leading-muted text-danger">{feedback}</Text>}
      </View> : null}
      ListEmptyComponent={<View className={`rounded-b-card border-x border-b border-line bg-surface ${hasHeader ? '' : 'rounded-t-card border-t'}`}><Status loading={state.loading} error={state.error} empty="Belum ada notifikasi di halaman ini." onRetry={state.error ? reload : undefined} /></View>}
      renderItem={({ item, index }) => {
        const icon = notificationIcons[item.target_type ?? ''] ?? { name: 'notifications-outline' as const, color: colors.muted };
        const last = index === Math.min(state.data?.length ?? 0, 20) - 1;
        return <Pressable accessibilityRole="button" disabled={busy}
        accessibilityLabel={`${item.read_at ? '' : 'Belum dibaca: '}${item.title}`}
        accessibilityState={{ disabled: busy }} onPress={() => open(item)}
        className={`min-h-[72px] flex-row items-start gap-[12px] border-x border-b border-line bg-surface px-[16px] py-[16px] active:bg-soft ${index === 0 && !hasHeader ? 'rounded-t-card border-t' : ''} ${last ? 'rounded-b-card' : ''}`}>
        <View className="pt-[2px]" accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View className="flex-1 gap-[6px]">
          <View className="flex-row items-start gap-[12px]">
            <Text numberOfLines={2} className={`flex-1 text-body leading-body text-ink ${item.read_at ? "font-medium" : "font-semibold"}`}>{item.title}</Text>
            <View className="w-[6px] shrink-0 pt-[8px]" accessible={false}>
              {!item.read_at && <View className="h-[6px] w-[6px] rounded-pill bg-success" />}
            </View>
          </View>
          <Text className="text-label leading-muted text-muted">{item.body}</Text>
          <Text className="mt-[2px] text-caption leading-muted text-muted">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
      </Pressable>;
      }}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.length) ? <View className="mt-[16px] gap-[12px]">
        <Button secondary title="Sebelumnya" disabled={page === 0 || busy} onPress={() => setPage(p => p - 1)} />
        <Button secondary title="Berikutnya" disabled={busy || (state.data?.length ?? 0) <= 20} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}
