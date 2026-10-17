import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useRepositories } from '../../providers/RepositoryProvider';
import { useResource } from '../hooks/useResource';
import { colors } from '../theme';
import { Status } from './Primitives';
import { PropertyImage } from './PropertyImage';

export function PropertyReviewsPreview({ propertyId, photos = [], onViewAll }: {
  propertyId: string; photos?: string[]; onViewAll: () => void;
}) {
  const { properties } = useRepositories();
  const load = useCallback(() => properties.listReviews(propertyId, 0), [properties, propertyId]);
  const state = useResource(load), reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(200, Math.min(300, width - 80));
  const images = [...new Set(photos)].slice(0, 3);
  return <View style={s.section}>
    <View style={s.heading}>
      <Text style={s.title}>Ulasan penghuni</Text>
      <Pressable accessibilityRole="button" onPress={onViewAll} style={s.more}>
        <Text style={s.link}>Lihat ulasan</Text>
      </Pressable>
    </View>
    {state.loading || state.error ? <Status loading={state.loading} error={state.error} onRetry={reload} /> :
      !state.data?.length ? <Text style={s.muted}>Belum ada ulasan ditayangkan.</Text> :
      <FlatList horizontal data={state.data.slice(0, 5)} keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
        renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={onViewAll}
          accessibilityLabel={`Ulasan ${item.rating} dari 5. ${item.review_text ?? ''}. Lihat semua ulasan.`}
          style={[s.card, { width: cardWidth }]}>
          {!!images.length && <View>
            <View style={s.collage}>
              <PropertyImage uri={images[0]} style={{ flex: 2, height: 140 }} />
              {images.length > 1 && <View style={{ flex: 1, gap: 3 }}>
                {images.slice(1).map(uri => <PropertyImage key={uri} uri={uri} style={{ flex: 1, width: '100%' }} />)}
              </View>}
            </View>
            <Text style={s.photoLabel}>Foto kos</Text>
          </View>}
          <View style={s.body}>
            <View style={s.rating}>
              {[1, 2, 3, 4, 5].map(n => <Svg key={n} width={16} height={16} viewBox="0 0 24 24" accessible={false}>
                <Path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"
                  stroke={colors.orange} fill={n <= item.rating ? colors.orange : 'none'} strokeLinejoin="round" />
              </Svg>)}
              <Text style={s.score}>{item.rating}/5</Text>
            </View>
            <Text style={s.description} numberOfLines={3}>{item.review_text || 'Penyewa memberikan rating tanpa komentar.'}</Text>
            <Text style={s.muted}>Penyewa terverifikasi</Text>
          </View>
        </Pressable>} />}
  </View>;
}
const s = StyleSheet.create({
  section: { gap: 12, marginVertical: 20 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  title: { color: colors.primary, fontSize: 16, fontWeight: '700' }, more: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' }, muted: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  card: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  collage: { height: 140, flexDirection: 'row', gap: 3 }, photoLabel: { position: 'absolute', bottom: 8, left: 8, color: colors.ink, backgroundColor: colors.surface, fontSize: 10, padding: 5, borderRadius: 5 },
  body: { padding: 14, gap: 10 }, rating: { flexDirection: 'row', alignItems: 'center', gap: 3 }, score: { color: colors.primary, fontWeight: '600', fontSize: 12, marginLeft: 5 },
  description: { color: colors.ink, fontSize: 13, lineHeight: 20 },
});
