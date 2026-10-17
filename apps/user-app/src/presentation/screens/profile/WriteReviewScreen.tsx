import { useCallback, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { ScreenProps } from '../../../navigation/types';
import { useRepositories } from '../../../providers/RepositoryProvider';
import { reviewText } from '../../../domain/repositories/ReviewRepository';
import { useResource } from '../../hooks/useResource';
import { Button, Status } from '../../components/Primitives';
import { colors } from '../../theme';

const labels = { PENDING: 'Menunggu moderasi', APPROVED: 'Ditayangkan', HIDDEN: 'Disembunyikan', REJECTED: 'Tidak disetujui' };
export function WriteReviewScreen({ route, navigation }: ScreenProps<'WriteReview'>) {
  const { reviews, checkout, mode } = useRepositories();
  const id = route.params.bookingId;
  const load = useCallback(async () => ({ detail: await checkout.getBookingDetail(id), review: await reviews.get(id) }), [checkout, reviews, id]);
  const state = useResource(load);
  const [rating, setRating] = useState(0), [text, setText] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const lock = useRef(false);
  // Preserve the exact payload after an uncertain response: retry sends it again.
  const attempted = useRef<{ rating: number; text: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const dirty = !sent && !state.data?.review && (rating > 0 || !!text);
  usePreventRemove(dirty || busy, ({ data }) => {
    if (lock.current) return;
    Alert.alert('Keluar dari ulasan?', 'Isian di halaman ini belum tersimpan. Jika pengiriman sempat gagal, ulasan mungkin sudah diterima server.', [
      { text: 'Tetap di sini', style: 'cancel' }, { text: 'Keluar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  async function submit() {
    if (lock.current) return;
    try {
      const payload = attempted.current ?? { rating, text: reviewText(rating, text) };
      lock.current = true; setBusy(true); setError(null);
      attempted.current = payload;
      await reviews.submit(id, payload.rating, payload.text);
      setSent(true); setRetrying(false); state.retry();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ulasan gagal dikirim.'); setRetrying(!!attempted.current); }
    finally { lock.current = false; setBusy(false); }
  }
  const existing = state.data?.review;
  const chosen = existing?.rating ?? rating;
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
        {mode === 'mock' && <Text style={{ color: colors.muted }}>Mode demo · ulasan tidak dikirim ke server</Text>}
        {sent && <Text accessibilityRole="alert" style={{ color: colors.green }}>Ulasan terkirim. Menunggu moderasi sebelum ditayangkan.</Text>}
        {!state.data ? <Status loading={state.loading} error={state.error} onRetry={state.retry} /> : <>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>{state.data.detail.booking.propertyName}</Text>
          {existing ? <Text style={{ color: colors.primary }}>{labels[existing.moderation_status]}</Text> :
            <Text style={{ color: colors.muted }}>Satu ulasan per booking. Ulasan ditampilkan setelah disetujui.</Text>}
          {existing || state.data.detail.booking.status === 'COMPLETED' ? <>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} bintang`}
                accessibilityState={{ checked: chosen === value, disabled: !!existing || busy || sent || retrying }}
                disabled={!!existing || busy || sent || retrying} onPress={() => setRating(value)}
                style={{ width: 46, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={32} height={32} viewBox="0 0 24 24" accessible={false}>
                  <Path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z" stroke={colors.orange}
                    fill={value <= chosen ? colors.orange : 'none'} strokeLinejoin="round" />
                </Svg>
              </Pressable>)}
            </View>
            {existing ? <Text style={{ color: colors.ink, lineHeight: 22 }}>{existing.review_text}</Text> : <>
              <TextInput accessibilityLabel="Isi ulasan" placeholder="Ceritakan pengalaman tinggalmu…" multiline
                value={text} onChangeText={setText} editable={!busy && !sent && !retrying} maxLength={4000}
                style={{ minHeight: 150, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 12,
                  padding: 14, textAlignVertical: 'top', color: colors.ink, fontSize: 15 }} />
              <Text style={{ color: colors.muted }}>{[...text.trim()].length}/2000 karakter</Text>
              {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
              {!sent && <Button title={busy ? 'Mengirim…' : retrying ? 'Coba kirim lagi' : 'Kirim ulasan'} disabled={busy || (!retrying && (rating === 0 || [...text.trim()].length < 5 || [...text.trim()].length > 2000))} onPress={submit} />}
              {retrying && <Button secondary title="Periksa status ulasan" disabled={busy} onPress={state.retry} />}
            </>}
          </> : <Text style={{ color: colors.muted }}>Ulasan baru bisa diberikan setelah masa tinggal selesai.</Text>}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
