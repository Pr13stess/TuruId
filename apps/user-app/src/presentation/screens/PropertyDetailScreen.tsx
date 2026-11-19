import { useCallback, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { useResource } from "../hooks/useResource";
import { colors } from "../theme";
import { genderLabel } from "../format";
import { PropertyMediaGallery } from "../components/PropertyMediaGallery";
import {
  Button,
  FeatureGrid,
  Section,
  Status,
} from "../components/Primitives";
import { RoomCard } from "../components/RoomCard";
import { Sheet } from "../components/Sheet";
import { FavoriteButton } from '../components/FavoriteButton';
import { propertyShareText } from '../../domain/propertyFeedback';
import { LocationIcon } from "../Icons/Icons";
import { ShareIcon } from '../Icons/ShareIcon';
import { PropertyReviewsPreview } from '../components/PropertyReviewsPreview';
import { useStartVoiceCall } from '../hooks/useStartVoiceCall';
export function PropertyDetailScreen({
  route,
  navigation,
}: ScreenProps<"PropertyDetail">) {
  const { propertyId } = route.params;
  const { properties, rooms, chat } = useRepositories();
  const voice = useStartVoiceCall(id => navigation.navigate('VoiceCall', { id }));
  const videoUrl = useCallback((path: string) => properties.videoUrl(path), [properties]);
  const [openingChat, setOpeningChat] = useState(false);
  const loader = useCallback(
    async () => ({
      property: await properties.get(propertyId),
      rooms: await rooms.listByProperty(propertyId),
    }),
    [properties, rooms, propertyId],
  );
  const state = useResource(loader);
  const [notice, setNotice] = useState<string | null>(null);
  if (state.loading || state.error)
    return (
      <Status
        loading={state.loading}
        error={state.error}
        onRetry={state.error ? state.retry : undefined}
      />
    );
  const p = state.data?.property;
  if (!p) return <Status empty="Kos tidak tersedia atau sudah diarsipkan" />;
  const roomList = state.data?.rooms ?? [];
  const canChoose = roomList.some((r) => r.available > 0 && r.plans.length > 0);
  const openChat = async () => {
    if (openingChat) return;
    setOpeningChat(true);
    try {
      const conversation = await chat.startConversation(propertyId, p.name);
      navigation.navigate("Chat", {
        conversationId: conversation.id,
        propertyId,
        propertyName: conversation.property_name,
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chat gagal dibuka.");
    } finally {
      setOpeningChat(false);
    }
  };
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 600, alignSelf: "center" }}>
        <PropertyMediaGallery key={p.id} photos={p.images} video={p.video_path} resolve={videoUrl} />
        <View className="p-[20px]">
          <View className="mb-[8px] flex-row items-center gap-[10px]">
            <Text className="flex-1 text-title font-bold text-ink">{p.name}</Text>
            <Text className="rounded-chip bg-soft p-[8px] text-caption text-primary">{genderLabel(p.gender_type)}</Text>
          </View>
          <Text className="text-label leading-muted text-muted">{p.address}</Text>
          <Text className="mt-[10px] text-label font-semibold text-accent-strong">
            ★ {p.review_count ? p.rating.toFixed(1) : "Belum ada rating"}{" "}
            <Text className="text-label leading-muted text-muted">({p.review_count} ulasan)</Text>
          </Text>
          <Text className="mt-[12px] self-start rounded-chip bg-accent-soft px-[10px] py-[6px] text-caption font-bold text-accent-strong">✓ Kos terverifikasi</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Lihat lokasi di OpenStreetMap"
            onPress={() => {
              if (p.latitude === null || p.longitude === null) {
                setNotice("Koordinat belum tersedia.");
                return;
              }
              void Linking.openURL(
                `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`,
              ).catch(() => setNotice("Peta tidak dapat dibuka."));
            }}
            className="my-[20px] min-h-[128px] items-center justify-center gap-[8px] rounded-card border border-line bg-surface p-[16px]"
          >
            <LocationIcon color={colors.accentStrong} size={32} />
            <Text className="text-body font-bold text-primary">Lihat lokasi di peta ↗</Text>
            <Text className="text-caption text-muted">OpenStreetMap · buka peta</Text>
          </Pressable>
          <Text className="mb-[24px] text-body leading-body text-muted">{p.description}</Text>
          <View className="my-[12px] flex-row flex-wrap items-start gap-[10px]">
            <FavoriteButton propertyId={propertyId} />
            <Pressable accessibilityRole="button" accessibilityLabel="Bagikan kos" onPress={() => {
              void Share.share({ message: propertyShareText(p) }).catch(() => setNotice('Kos belum bisa dibagikan. Coba lagi.'));
            }} className="min-h-[44px] flex-row items-center gap-[8px] rounded-pill border border-line bg-surface px-[14px] active:bg-soft">
              <ShareIcon color={colors.primary} />
              <Text className="text-label font-semibold text-primary">Bagikan</Text>
            </Pressable>
          </View>
          <PropertyReviewsPreview propertyId={propertyId} onViewAll={() => navigation.navigate('Reviews', { propertyId })} />
          <Section title="Fasilitas umum">
            <View className="rounded-card border border-line bg-surface p-[14px]">
              <FeatureGrid items={p.facilities} />
            </View>
          </Section>
          <Section title="Tipe kamar yang tersedia">
            {roomList.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                onPress={() =>
                  navigation.navigate("RoomSelection", { propertyId })
                }
              />
            ))}
          </Section>
          <Section title="Peraturan kos">
            <Text className="mb-[24px] text-body leading-body text-muted">
              {p.rules || "Hubungi pemilik untuk peraturan kos."}
            </Text>
          </Section>
          <View className="flex-row items-center gap-[12px] pb-[12px]">
            <View className="h-[44px] w-[44px] items-center justify-center rounded-pill bg-soft">
              <Text className="text-symbol text-primary">◎</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-body font-bold text-ink">{p.owner_name}</Text>
              <Text className="text-label leading-muted text-muted">Owner terverifikasi · demo akademik</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View className="w-full max-w-[600px] self-center flex-row flex-wrap items-center gap-[8px] border-t border-line bg-surface px-[16px] py-[12px]">
        <Pressable
          accessibilityRole="button"
          onPress={openChat}
          disabled={openingChat}
          className="min-h-[48px] min-w-[64px] flex-1 items-center justify-center rounded-control bg-soft px-[8px] active:opacity-70"
        >
          <Text className="text-label font-bold text-ink" numberOfLines={1}>
            {openingChat ? "Membuka…" : "Chat"}
          </Text>
        </Pressable>
                <Pressable
          accessibilityRole="button"
          disabled={voice.busy}
          onPress={() => { void voice.start(async () => (await chat.startConversation(propertyId, p.name)).id); }}
          className="min-h-[48px] min-w-[64px] flex-1 items-center justify-center rounded-control bg-soft px-[8px] active:opacity-70"
        >
          <Text className="text-label font-bold text-ink" numberOfLines={1}>
            Call
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate("Note", { propertyId, propertyName: p.name })
          }
          className="min-h-[48px] min-w-[64px] flex-1 items-center justify-center rounded-control bg-soft px-[8px] active:opacity-70"
        >
          <Text className="text-label font-bold text-ink" numberOfLines={1}>
            Catatan
          </Text>
        </Pressable>
        <View className="min-w-[140px] flex-[1.5]">
          <Button
            title="Lihat kamar"
            disabled={!canChoose}
            onPress={() => navigation.navigate("RoomSelection", { propertyId })}
          />
        </View>
      </View>
      <Sheet
        visible={notice !== null}
        title="Informasi"
        onClose={() => setNotice(null)}
      >
        <Text className="mb-[24px] text-body leading-body text-muted">{notice}</Text>
        <Button title="Mengerti" onPress={() => setNotice(null)} />
      </Sheet>
    </SafeAreaView>
  );
}
