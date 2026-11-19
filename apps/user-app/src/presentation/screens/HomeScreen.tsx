import { UserBrand } from "../components/UserBrand";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { FilterIcon, NotifIcon, LocationIcon } from "../Icons/Icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultQuery } from "../../domain/models";
import { useRepositories } from "../../providers/RepositoryProvider";
import type { TabScreenProps } from "../../navigation/types";
import { useResource } from "../hooks/useResource";
import { useAuthSession } from "../hooks/useAuthSession";
import { colors } from "../theme";
import { PropertyCard } from "../components/PropertyCard";
import { Status, Button } from "../components/Primitives";
import { FilterSheet } from "../components/FilterSheet";
import { LocationSheet } from "../components/LocationSheet";
import { Sheet } from "../components/Sheet";

export function HomeScreen({ navigation }: TabScreenProps<"HomeTab">) {
  const insets = useSafeAreaInsets();
  const { properties, auth, mode } = useRepositories();
  const { session } = useAuthSession();
  const [query, setQuery] = useState(defaultQuery),
    [text, setText] = useState(""),
    [sheet, setSheet] = useState<
      "filter" | "location" | "future" | "profile" | null
    >(null);
  const loader = useCallback(
    () => properties.search(query),
    [properties, query],
  );
  const { data, loading, error, retry } = useResource(loader);
  const active = !!(
    query.gender ||
    query.minRating ||
    query.roomFacilities.length ||
    query.propertyFacilities.length ||
    query.minPrice ||
    query.maxPrice < 1e9 ||
    query.maxDistance ||
    query.durationUnit !== "MONTH" ||
    query.durationValue !== 1
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 w-full max-w-[600px] self-center">
        <View className="flex-row items-center justify-between px-[20px] pt-[16px] pb-[20px]">
          <UserBrand />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
            onPress={() => navigation.navigate("Notifications")}
            className="h-[44px] w-[44px] items-center justify-center rounded-control border border-line bg-surface"
          >
            <NotifIcon color={colors.primary} />
          </Pressable>
        </View>
        <View className="mx-[20px] flex-row items-center rounded-control border border-line bg-surface">
          <TextInput
            accessibilityLabel="Cari nama kos atau area"
            className="min-h-[48px] flex-1 p-[14px] text-body text-ink"
            placeholder="Cari nama kos atau area…"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() =>
              setQuery({ ...query, text: text.trim(), page: 0 })
            }
            returnKeyType="search"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cari"
            onPress={() => setQuery({ ...query, text: text.trim(), page: 0 })}
            className="min-h-[48px] justify-center rounded-control bg-accent-soft px-[16px]"
          >
            <Text className="text-body font-bold text-accent-strong">Cari</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-[12px] px-[20px] py-[12px]">
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheet("location")}
            className="min-h-[48px] flex-1 flex-row items-center gap-[8px]"
          >
            <LocationIcon color={colors.primary} />
            <Text numberOfLines={1} className="flex-1 text-label font-semibold text-muted">
              {query.reference?.label ?? "Pilih lokasi acuanmu"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka filter"
            onPress={() => setSheet("filter")}
            className="h-[48px] w-[48px] shrink-0 items-center justify-center rounded-control border border-line bg-surface"
          >
            <FilterIcon color={colors.primary} />
            {active && <View className="absolute right-[4px] top-[4px] h-[7px] w-[7px] rounded-pill bg-accent" />}
          </Pressable>
        </View>
        {mode === "mock" && <Text className="mb-[12px] px-[20px] text-right text-caption font-semibold tracking-wide text-muted">DATA DEMO</Text>}
        <FlatList
          key="home-single-column"
          style={{ flex: 1 }}
          refreshing={loading}
          onRefresh={() => { if (!loading) retry(); }}
          alwaysBounceVertical
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 120 + insets.bottom, gap: 16 }}
          renderItem={({ item }) => (
            <PropertyCard
              item={item}
              unit={query.durationUnit}
              value={query.durationValue}
              onPress={() =>
                navigation.navigate("PropertyDetail", { propertyId: item.id })
              }
            />
          )}
          ListEmptyComponent={
            <Status
              loading={loading}
              error={error}
              empty="Belum ada kos yang cocok"
              onRetry={loading ? undefined : error ? retry : () => {
                setQuery(defaultQuery);
                setText("");
              }}
            />
          }
          ListFooterComponent={
            !loading && !error ? <View className="flex-row flex-wrap items-center justify-center gap-[12px] py-[18px]">
              {query.page > 0 && (
                <Button
                  secondary
                  title="Sebelumnya"
                  onPress={() => setQuery({ ...query, page: query.page - 1 })}
                />
              )}
              <Text className="text-caption text-muted">Halaman {query.page + 1}</Text>
              {data?.length === 20 && (
                <Button
                  secondary
                  title="Berikutnya"
                  onPress={() => setQuery({ ...query, page: query.page + 1 })}
                />
              )}
            </View> : null
          }
        />

        {sheet === "filter" && (
          <FilterSheet
            query={query}
            onClose={() => setSheet(null)}
            onApply={(q) => {
              setQuery(q);
              setSheet(null);
            }}
          />
        )}
        {sheet === "location" && (
          <LocationSheet
            current={query.reference}
            onClose={() => setSheet(null)}
            onSelect={(reference) => {
              setQuery({
                ...query,
                reference,
                page: 0,
                maxDistance: reference ? query.maxDistance : null,
                sort:
                  !reference && query.sort === "nearest"
                    ? "recommended"
                    : query.sort,
              });
              setSheet(null);
            }}
          />
        )}
        <Sheet
          visible={sheet === "profile"}
          title="Akun"
          onClose={() => setSheet(null)}
        >
          <Text className="text-body leading-body text-muted">
            Masuk sebagai {session?.user.email ?? "-"}.
          </Text>
          <Button
            title="Keluar"
            onPress={() => {
              setSheet(null);
              auth.signOut();
            }}
            secondary
          />
        </Sheet>
        <Sheet
          visible={sheet === "future"}
          title="Segera hadir"
          onClose={() => setSheet(null)}
        >
          <Text className="text-body leading-body text-muted">
            Fitur ini tersedia pada tahap berikutnya. Saat ini kamu bisa
            menjelajahi kos, memilih tipe kamar, dan melihat paket sewa.
          </Text>
          <Button title="Kembali menjelajah" onPress={() => setSheet(null)} />
        </Sheet>
      </View>
    </SafeAreaView>
  );
}
