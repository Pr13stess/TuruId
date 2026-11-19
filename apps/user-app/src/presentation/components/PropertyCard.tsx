import { Pressable, Text, View } from "react-native";
import type { Listing, DurationUnit } from "../../domain/models";
import { PropertyImage } from "./PropertyImage";
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lihat ${item.name}`}
      onPress={onPress}
      className="w-full rounded-card border border-line bg-surface shadow-card"
    >
      <View className="overflow-hidden rounded-t-card">
        <PropertyImage uri={item.images[0]} style={{ width: "100%", aspectRatio: 16 / 10 }} />
        <View className="absolute left-[12px] top-[12px] rounded-chip bg-surface px-[10px] py-[6px]">
          <Text className="text-caption font-bold text-primary">{genderLabel(item.gender_type)}</Text>
        </View>
      </View>
      <View className="gap-[10px] p-[14px]">
        <View className="flex-row items-start justify-between gap-[12px]">
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
            <Text className="shrink rounded-chip bg-soft px-[8px] py-[6px] text-caption text-muted" key={x}>
              {x}
            </Text>
          ))}
          <Text className={`rounded-chip bg-soft px-[8px] py-[6px] text-caption ${item.matching_available === 0 ? "text-muted" : "text-success"}`}>
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
  );
}
