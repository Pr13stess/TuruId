import { Pressable, Text, View } from "react-native";
import type { Room } from "../../domain/models";
import { rupiah, periodLabel } from "../format";
import { FeatureGrid } from "./Primitives";
export function RoomCard({
  room,
  selected = false,
  onPress,
  compact = false,
}: {
  room: Room;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const available = room.available > 0;
  const plan =
    room.plans.find(
      (p) => p.duration_unit === "MONTH" && p.duration_value === 1,
    ) ?? room.plans[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${available ? `${room.available} tersedia` : "penuh"}`}
      accessibilityState={{ disabled: !available, selected }}
      disabled={!available || !onPress}
      onPress={onPress}
      className={`mb-[12px] gap-[14px] rounded-card ${selected ? "border-2 border-accent-strong bg-accent-soft p-[13px]" : "border border-line bg-surface p-[14px]"} ${!available ? "opacity-[0.48]" : ""}`}
    >
      <View className="flex-row items-center gap-[12px]">
        {compact && (
          <View className="h-[62px] w-[62px] items-center justify-center rounded-control bg-soft">
            <Text className="text-room-symbol text-muted">⌂</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 5 }}>
          <Text className="text-header font-bold text-ink">{room.name}</Text>
          <Text className="text-label leading-muted text-muted">
            {room.room_size_m2} m² ·{" "}
            {room.bathroom_type === "PRIVATE"
              ? "Kamar mandi dalam"
              : "Kamar mandi luar"}
          </Text>
          <Text className="text-body font-bold text-accent-strong">
            {plan
              ? `${rupiah(plan.price)} / ${periodLabel(plan.duration_unit, plan.duration_value)}`
              : "Paket belum tersedia"}
          </Text>
        </View>
        {selected && <Text className="text-section text-accent-strong">●</Text>}
      </View>
      {!compact && <FeatureGrid items={room.facilities} />}
      <Text className={`text-right text-caption ${!available ? "text-muted" : "text-success"}`}>
        {available
          ? `Tersedia ${room.available} unit`
          : "Penuh · belum bisa dipilih"}
      </Text>
    </Pressable>
  );
}
