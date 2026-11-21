import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRepositories } from "../../providers/RepositoryProvider";
import type { BookingItem } from "../../domain/bookings";
import { useResource } from "../hooks/useResource";
import { colors } from "../theme";
import { Text } from "./Typography";
import { PropertyImage } from "./PropertyImage";
import { Sheet } from "./Sheet";
import { Status } from "./Primitives";

function stayDate(value: string | null) {
  if (!value) return "Tanggal masuk belum tersedia";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Tanggal masuk belum tersedia"
    : `Sejak ${date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
}

function StayCard({ booking, onPress }: { booking: BookingItem; onPress: () => void }) {
  const { properties } = useRepositories();
  const load = useCallback(() => booking.propertyId ? properties.get(booking.propertyId) : Promise.resolve(null), [properties, booking.propertyId]);
  const photo = useResource(load);
  const uri = photo.data?.images[0];
  return <Pressable accessibilityRole="button" accessibilityLabel={`Detail hunian ${booking.propertyName}, ${booking.roomName}`}
    onPress={onPress} className="overflow-hidden rounded-card bg-soft active:opacity-80">
    <PropertyImage key={uri ?? "empty"} uri={uri} style={{ width: "100%", height: 180 }} />
    <View className="absolute bottom-0 left-0 right-0 gap-[4px] bg-media-control p-[12px]">
      <Text numberOfLines={2} className="text-body font-bold text-surface">{booking.propertyName}</Text>
      <Text numberOfLines={1} className="text-caption text-surface">{booking.roomName}</Text>
      <Text className="text-caption text-surface">{stayDate(booking.checkedIn ?? booking.moveIn)}</Text>
    </View>
  </Pressable>;
}

export function CurrentStaysSection({ onOpen }: { onOpen: (bookingId: string) => void }) {
  const { checkout } = useRepositories();
  const { width } = useWindowDimensions();
  const [showAll, setShowAll] = useState(false);
  const load = useCallback(async () => {
    const stays: BookingItem[] = [];
    for (let page = 0; ; page += 1) {
      const batch = await checkout.listBookings("ACTIVE", page);
      stays.push(...batch.items.filter(item => item.status === "ACTIVE"));
      if (!batch.hasMore) break;
    }
    return [...new Map(stays.map(item => [item.id, item])).values()];
  }, [checkout]);
  const state = useResource(load);
  const reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const stays = state.data ?? [];
  const cardWidth = Math.max(160, Math.min(width, 600) - 40 - (stays.length > 1 ? 28 : 0));
  const open = (id: string) => { setShowAll(false); onOpen(id); };
  return <View className="mt-[16px]">
    <View className="min-h-[48px] flex-row items-center justify-between gap-[8px]">
      <Text className="flex-1 text-body font-bold text-ink">Kos yang sedang dihuni</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Lihat semua kos yang sedang dihuni"
        onPress={() => setShowAll(true)} className="min-h-[48px] justify-center px-[4px] active:opacity-60">
        <Text className="text-label font-semibold text-accent-strong">Lihat semua</Text>
      </Pressable>
    </View>
    {state.loading ? <ActivityIndicator color={colors.primary} /> : state.error ? (
      <Status error={state.error} onRetry={reload} />
    ) : stays.length ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled
        snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12 }}>
        {stays.map(booking => <View key={booking.id} style={{ width: cardWidth }}>
          <StayCard booking={booking} onPress={() => open(booking.id)} />
        </View>)}
      </ScrollView>
    ) : <Text className="rounded-card bg-soft p-[16px] text-label leading-muted text-muted">Belum ada kos yang sedang dihuni.</Text>}
    <Sheet visible={showAll} title="Kos yang sedang dihuni" onClose={() => setShowAll(false)}>
      {(state.loading || state.error || !stays.length) && <Status loading={state.loading} error={state.error} onRetry={state.error ? reload : undefined}
        empty="Belum ada kos yang sedang dihuni." />}
      {stays.map(booking => <StayCard key={booking.id} booking={booking} onPress={() => open(booking.id)} />)}
    </Sheet>
  </View>;
}
