import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "../components/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { useResource } from "../hooks/useResource";
import { Button, Status } from "../components/Primitives";
import { RoomCard } from "../components/RoomCard";
import { colors } from "../theme";
export function RoomSelectionScreen({
  route,
  navigation,
}: ScreenProps<"RoomSelection">) {
  const { propertyId } = route.params;
  const { rooms } = useRepositories();
  const [selected, setSelected] = useState<string | null>(null);
  const loader = useCallback(
    () => rooms.listByProperty(propertyId),
    [rooms, propertyId],
  );
  const state = useResource(loader);
  const room = state.data?.find(
    (r) => r.id === selected && r.available > 0 && r.plans.length > 0,
  );
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="w-full max-w-[600px] flex-1 self-center">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text className="mb-[20px] text-body leading-body text-muted">Pilih ruang yang paling pas untukmu.</Text>
          {state.loading || state.error ? (
            <Status
              loading={state.loading}
              error={state.error}
              onRetry={state.error ? state.retry : undefined}
            />
          ) : state.data?.length ? (
            state.data.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                selected={r.id === selected}
                compact
                onPress={() => setSelected(r.id)}
              />
            ))
          ) : (
            <Status empty="Belum ada tipe kamar" />
          )}
        </ScrollView>
        <View className="gap-[12px] border-t border-line bg-surface p-[20px]">
          <Text className="text-center text-caption leading-muted text-muted">
            Ketersediaan dapat berubah hingga proses checkout.
          </Text>
          <Button
            title="Lanjut pilih paket sewa"
            disabled={!room}
            onPress={() => {
              if (room)
                navigation.navigate("PlanSelection", {
                  propertyId,
                  roomId: room.id,
                });
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
