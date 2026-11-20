import { useCallback } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from "./Typography";
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useRepositories } from '../../providers/RepositoryProvider';
import { useResource } from '../hooks/useResource';
import { colors } from '../theme';
import { Status } from './Primitives';
import { PropertyImage } from './PropertyImage';
import { OwnerReviewReply } from './OwnerReviewReply';

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
  return <View className="my-[20px] gap-[12px]">
    <View className="flex-row flex-wrap items-center justify-between gap-[8px]">
      <Text className="text-header font-bold text-ink">Ulasan penghuni</Text>
      <Pressable accessibilityRole="button" onPress={onViewAll} className="min-h-[44px] justify-center px-[4px]">
        <Text className="text-label font-semibold text-accent-strong">Lihat ulasan</Text>
      </Pressable>
    </View>
    {state.loading || state.error ? <Status loading={state.loading} error={state.error} onRetry={reload} /> :
      !state.data?.length ? <Text className="text-caption leading-muted text-muted">Belum ada ulasan ditayangkan.</Text> :
      <FlatList horizontal data={state.data.slice(0, 5)} keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
        renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={onViewAll}
          accessibilityLabel={`Ulasan ${item.rating} dari 5. ${item.review_text ?? ''}. Lihat semua ulasan.`}
          className="overflow-hidden rounded-card border border-line bg-surface" style={{ width: cardWidth }}>
          {!!images.length && <View>
            <View className="h-[140px] flex-row gap-[3px]">
              <PropertyImage uri={images[0]} style={{ flex: 2, height: 140 }} />
              {images.length > 1 && <View style={{ flex: 1, gap: 3 }}>
                {images.slice(1).map(uri => <PropertyImage key={uri} uri={uri} style={{ flex: 1, width: '100%' }} />)}
              </View>}
            </View>
            <Text className="absolute bottom-[8px] left-[8px] rounded-chip bg-surface px-[8px] py-[5px] text-caption text-ink">Foto kos</Text>
          </View>}
          <View className="gap-[10px] p-[14px]">
            <View className="flex-row items-center gap-[3px]">
              {[1, 2, 3, 4, 5].map(n => <Svg key={n} width={16} height={16} viewBox="0 0 24 24" accessible={false}>
                <Path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"
                  stroke={colors.accentStrong} fill={n <= item.rating ? colors.accentStrong : 'none'} strokeLinejoin="round" />
              </Svg>)}
              <Text className="ml-[5px] text-label font-semibold text-accent-strong">{item.rating}/5</Text>
            </View>
            <Text className="text-body leading-body text-ink" numberOfLines={3}>{item.review_text || 'Penyewa memberikan rating tanpa komentar.'}</Text>
            <Text className="text-caption leading-muted text-muted">Penyewa terverifikasi</Text>
            <OwnerReviewReply text={item.owner_reply} preview />
          </View>
        </Pressable>} />}
  </View>;
}
