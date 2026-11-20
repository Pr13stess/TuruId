import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "./Typography";
import type { Listing, DurationUnit } from "../../domain/models";
import { PropertyImage } from "./PropertyImage";
import { FavoriteButton } from "./FavoriteButton";
import { rupiah, genderLabel, periodLabel, distanceLabel } from "../format";

export function PropertyCard({
  item,
  unit,
  value,
  onPress,
}: {
  item: Listing;
  unit: DurationUnit;
  value: number;
  onPress: () => void;
}) {
  return (
    <View className="w-full rounded-card border border-line bg-surface shadow-card">
      <View className="relative overflow-hidden rounded-t-card">
        <CardPhotos key={JSON.stringify(item.images)} images={item.images} name={item.name} onPress={onPress} />
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 1 }}
          className="flex-row items-start justify-between"
        >
          <View pointerEvents="none" className="rounded-chip bg-surface px-[8px] py-[4px]">
            <Text className="text-caption font-bold text-primary">{genderLabel(item.gender_type)}</Text>
          </View>
          <View className="max-w-[200px] items-end">
            <FavoriteButton propertyId={item.id} compact />
          </View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Lihat ${item.name}`}
        onPress={onPress}
        className="w-full rounded-b-card"
      >
        <View className="gap-[6px] p-[12px]">
          <View className="flex-row items-start gap-[8px]">
            <Text numberOfLines={2} className="flex-1 text-header font-bold leading-body text-ink">
              {item.name}
            </Text>
            <Text className="shrink text-label font-bold text-accent-strong">
              ★ {item.review_count ? item.rating.toFixed(1) : "Baru"}{" "}
              <Text className="text-caption font-normal text-muted">({item.review_count})</Text>
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-x-[8px] gap-y-[4px]">
            <Text className="text-label leading-muted text-muted">{item.city}</Text>
            <Text className="shrink text-label leading-muted text-muted" numberOfLines={2}>
              {distanceLabel(item.distance_km)}
            </Text>
          </View>
          <Text numberOfLines={2} className="text-label leading-muted text-muted">
            {item.description}
          </Text>
          <View className="flex-row flex-wrap items-center gap-[6px]">
            {item.facilities.slice(0, 2).map((x) => (
              <Text className="shrink rounded-chip bg-soft px-[8px] py-[4px] text-caption text-muted" key={x}>
                {x}
              </Text>
            ))}
            <Text className={`rounded-chip bg-soft px-[8px] py-[4px] text-caption ${item.matching_available === 0 ? "text-muted" : "text-success"}`}>
              {item.matching_available
                ? `${item.matching_available} tersedia`
                : "Penuh"}
            </Text>
          </View>
          <View className="border-t border-line" />
          <View className="flex-row flex-wrap items-baseline gap-x-[8px] gap-y-[4px]">
            <Text className="text-price font-bold text-accent-strong">{rupiah(item.starting_price)}</Text>
            <Text className="text-caption text-muted">Mulai dari / {periodLabel(unit, value)}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function CardPhotos({ images, name, onPress }: { images: string[]; name: string; onPress: () => void }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const photos = images.length ? images : [undefined];

  return (
    <View
      style={{ width: "100%", aspectRatio: 2 }}
      onLayout={({ nativeEvent }) => {
        const nextWidth = nativeEvent.layout.width;
        if (nextWidth !== width) {
          setWidth(nextWidth);
          setPage(0);
        }
      }}
    >
      {width > 0 && <ScrollView
        key={width}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={photos.length > 1}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          setPage(Math.max(0, Math.min(photos.length - 1, Math.round(nativeEvent.contentOffset.x / width))));
        }}
      >
        {photos.map((uri, index) => (
          <Pressable
            key={`${index}:${uri ?? "empty"}`}
            accessibilityRole="button"
            accessibilityLabel={`Lihat ${name}`}
            onPress={onPress}
            style={{ width, height: "100%" }}
          >
            <PropertyImage uri={uri} style={{ width: "100%", height: "100%" }} />
          </Pressable>
        ))}
      </ScrollView>}
      {images.length > 0 && <View
        pointerEvents="none"
        style={{ position: "absolute", bottom: 10, right: 10 }}
        className="rounded-pill bg-surface px-[8px] py-[4px]"
      >
        <Text accessibilityLabel={`Gambar ${page + 1} dari ${images.length}`} className="text-caption font-semibold text-ink">
          {page + 1} / {images.length}
        </Text>
      </View>}
    </View>
  );
}
