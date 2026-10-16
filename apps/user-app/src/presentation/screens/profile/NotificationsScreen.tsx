import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps } from '../../../navigation/types';
import type { UserNotification } from '../../../domain/repositories/NotificationRepository';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';

export function NotificationsScreen({ navigation }: ScreenProps<'Notifications'>) {
  const { notifications, chat, mode } = useRepositories();
  const [page, setPage] = useState(0), [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lock = useRef(false), focused = useIsFocused();
  const load = useCallback(() => notifications.list(page), [notifications, page]);
  const state = useResource(load, focused ? 15000 : 0), reload = state.retry;
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
      contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12 }} refreshing={state.loading} onRefresh={reload}
      ListHeaderComponent={<View style={{ gap: 10 }}>
        {mode === 'mock' && <Text style={{ color: colors.muted }}>Mode demo: belum ada notifikasi dari server.</Text>}
        {!!feedback && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{feedback}</Text>}
      </View>}
      ListEmptyComponent={<Status loading={state.loading} error={state.error} empty="Belum ada notifikasi di halaman ini." onRetry={state.error ? reload : undefined} />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" disabled={busy}
        accessibilityLabel={`${item.read_at ? '' : 'Belum dibaca: '}${item.title}`}
        accessibilityState={{ disabled: busy }} onPress={() => open(item)}
        style={{ padding: 18, gap: 8, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
          borderColor: item.read_at ? colors.line : colors.primary }}>
        <Text style={{ color: colors.primary, fontWeight: item.read_at ? '500' : '700', fontSize: 16 }}>{item.title}</Text>
        <Text style={{ color: colors.ink, lineHeight: 21 }}>{item.body}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(item.created_at).toLocaleString('id-ID')}</Text>
      </Pressable>}
      ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.length) ? <View style={{ gap: 10 }}>
        <Button secondary title="Sebelumnya" disabled={page === 0 || busy} onPress={() => setPage(p => p - 1)} />
        <Button secondary title="Berikutnya" disabled={busy || (state.data?.length ?? 0) <= 20} onPress={() => setPage(p => p + 1)} />
      </View> : null} />
  </SafeAreaView>;
}
