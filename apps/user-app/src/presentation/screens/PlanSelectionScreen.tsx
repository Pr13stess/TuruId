import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { summarizeCost } from "../../domain/pricing";
import { toCheckoutError } from "../../domain/checkoutErrors";
import { useResource } from "../hooks/useResource";
import { Button, Status } from "../components/Primitives";
import { colors } from "../theme";
import { periodLabel, rupiah } from "../format";
export function PlanSelectionScreen({
  route,
  navigation,
}: ScreenProps<"PlanSelection">) {
  const { propertyId, roomId } = route.params;
  const { pricing, rooms, checkout } = useRepositories();
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const loader = useCallback(
    async () => ({
      plans: await pricing.listByRoom(roomId),
      room: (await rooms.listByProperty(propertyId)).find(
        (r) => r.id === roomId,
      ),
    }),
    [pricing, rooms, propertyId, roomId],
  );
  const state = useResource(loader);
  const room = state.data?.room;
  const plan = state.data?.plans.find((p) => p.id === selected);
  const cost = plan ? summarizeCost(plan) : null;
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="w-full max-w-[600px] flex-1 self-center">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {state.loading || state.error ? (
            <Status
              loading={state.loading}
              error={state.error}
              onRetry={state.error ? state.retry : undefined}
            />
          ) : !room ? (
            <Status empty="Tipe kamar tidak tersedia" />
          ) : (
            <>
              <View className="mb-[24px] gap-[6px] rounded-card border border-line bg-surface p-[16px]">
                <Text className="text-header font-bold text-ink">{room.name}</Text>
                <Text className="shrink text-label leading-muted text-muted">
                  {room.room_size_m2} m² · {room.available} unit tersedia
                </Text>
              </View>
              <Text className="mb-[14px] text-label leading-muted text-muted">Pilih durasi tinggalmu</Text>
              {state.data?.plans.length ? (
                state.data.plans.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: p.id === selected,
                      disabled: room.available === 0,
                    }}
                    accessibilityLabel={`Paket ${p.name}`}
                    disabled={room.available === 0}
                    onPress={() => setSelected(p.id)}
                    className={`mb-[12px] flex-row items-center gap-[12px] rounded-card ${p.id === selected ? "border-2 border-accent-strong bg-accent-soft p-[15px]" : "border border-line bg-surface p-[16px]"}`}
                  >
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text className="text-header font-bold text-ink">{p.name}</Text>
                      <Text className="text-body font-bold text-accent-strong">
                        {rupiah(p.price)} /{" "}
                        {periodLabel(p.duration_unit, p.duration_value)}
                      </Text>
                      <Text className="shrink text-label leading-muted text-muted">
                        DP {rupiah(p.down_payment)} · Deposit{" "}
                        {rupiah(p.security_deposit)}
                      </Text>
                    </View>
                    <View
                      className={`h-[17px] w-[17px] rounded-pill ${p.id === selected ? "border-[5px] border-accent-strong" : "border border-muted"}`}
                    />
                  </Pressable>
                ))
              ) : (
                <Status empty="Belum ada paket sewa aktif" />
              )}
              {room.available === 0 && (
                <Text className="mb-[14px] text-label leading-muted text-muted">
                  Kamar sudah penuh. Silakan pilih tipe lain.
                </Text>
              )}
              {plan && cost && (
                <View className="mt-[16px] gap-[14px] rounded-card border border-line bg-surface p-[16px]">
                  <Text className="text-header font-bold text-ink">Rincian biaya</Text>
                  {[
                    ["Harga sewa", cost.rent],
                    ["DP booking (bagian dari sewa)", cost.downPayment],
                    ["Security deposit", cost.deposit],
                    ["Bayar saat booking", cost.payNow],
                    ["Sisa sewa saat masuk", cost.remainingRent],
                    ["Total sewa + deposit", cost.total],
                  ].map(([label, value]) => (
                    <View key={String(label)} className="flex-row flex-wrap justify-between gap-[10px]">
                      <Text className="shrink text-label leading-muted text-muted">{label}</Text>
                      <Text className="text-body font-semibold text-accent-strong">
                        {rupiah(Number(value))}
                      </Text>
                    </View>
                  ))}
                  <Text className="text-caption leading-muted text-muted">{plan.deposit_terms}</Text>
                  <Text className="text-caption leading-muted text-muted">
                    Deposit{" "}
                    {plan.deposit_refundable
                      ? "dapat dikembalikan sesuai ketentuan"
                      : "tidak dapat dikembalikan"}
                    . Pembatalan sebelum masuk: pengembalian penuh atas jumlah
                    yang dibayar saat booking pada simulasi demo.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        <View className="gap-[12px] border-t border-line bg-surface p-[20px]">
          {cost && cost.payNow <= 0 && (
            <Text className="text-center text-caption leading-muted text-muted">
              Paket ini tidak punya DP atau deposit, jadi belum bisa
              dibayar lewat checkout.
            </Text>
          )}
          {error && (
            <Text className="text-center text-caption leading-muted text-danger">
              {error}
            </Text>
          )}
          <Button
            title={busy ? "Menahan kamar…" : "Lanjut ke checkout"}
            disabled={
              !plan || !room || room.available < 1 || busy || !cost || cost.payNow <= 0
            }
            onPress={async () => {
              if (!plan) return;
              setBusy(true);
              setError(null);
              try {
                const { bookingId } = await checkout.start(plan.id);
                navigation.navigate("Checkout", { bookingId, planId: plan.id });
              } catch (e) {
                setError(toCheckoutError(e).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
