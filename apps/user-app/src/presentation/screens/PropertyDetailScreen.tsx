import { useCallback, useState } from "react";
import { Animated, Linking, Platform, Pressable, Share, View } from "react-native";
import { Text } from "../components/Typography";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
import { Avatar } from "../components/ProfileUi";
import { RoomCard } from "../components/RoomCard";
import { Sheet } from "../components/Sheet";
import { FavoriteButton } from '../components/FavoriteButton';
import { propertyShareText } from '../../domain/propertyFeedback';
import { LocationIcon } from "../Icons/Icons";
import { ShareIcon } from '../Icons/ShareIcon';
import { PropertyReviewsPreview } from '../components/PropertyReviewsPreview';
import { useStartVoiceCall } from '../hooks/useStartVoiceCall';
import { useMotionPreference } from '../motion';
export function PropertyDetailScreen({
  route,
  navigation,
}: ScreenProps<"PropertyDetail">) {
  const { propertyId } = route.params;
  const insets = useSafeAreaInsets();
  const backButton = (
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 10, left: 0, right: 0, zIndex: 20 }}>
      <View pointerEvents="box-none" className="w-full max-w-[600px] self-center px-[16px]">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => navigation.goBack()}
          className="h-[48px] w-[48px] items-center justify-center self-start rounded-pill border border-line bg-surface shadow-card active:bg-soft"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
  const { properties, rooms, chat } = useRepositories();
  const voice = useStartVoiceCall(id => navigation.navigate('VoiceCall', { id }));
  const videoUrl = useCallback((path: string) => properties.videoUrl(path), [properties]);
  const [openingChat, setOpeningChat] = useState(false);
  const [scrollY] = useState(() => new Animated.Value(0));
  const reducedMotion = useMotionPreference();
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
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
      <View className="flex-1 justify-center">
      <Status
        loading={state.loading}
        error={state.error}
        onRetry={state.error ? state.retry : undefined}
      />
      </View>
      {backButton}
      </SafeAreaView>
    );
  const p = state.data?.property;
  if (!p) return <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
    <View className="flex-1 justify-center"><Status empty="Kos tidak tersedia atau sudah diarsipkan" /></View>
    {backButton}
  </SafeAreaView>;
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
      <Animated.ScrollView
        contentContainerStyle={{ width: "100%", maxWidth: 600, alignSelf: "center" }}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: Platform.OS !== "web",
        })}
      >
        <Animated.View style={{ transform: [{ translateY: reducedMotion ? 0 : scrollY.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolateLeft: "clamp",
          extrapolateRight: "extend",
        }) }] }}>
          <PropertyMediaGallery key={p.id} photos={p.images} video={p.video_path} resolve={videoUrl} />
        </Animated.View>
        <View className="relative z-10 -mt-[32px] rounded-t-card bg-surface px-[16px] pt-[16px] pb-[28px]">
          <View className="rounded-control bg-soft p-[14px]">
          <View className="mb-[8px] flex-row items-center gap-[10px]">
            <Text className="flex-1 text-title font-bold text-ink">{p.name}</Text>
            <Text className="rounded-chip bg-surface p-[8px] text-caption text-primary">{genderLabel(p.gender_type)}</Text>
          </View>
          <Text className="text-label leading-muted text-muted">{p.address}</Text>
          <Text className="mt-[10px] text-label font-semibold text-accent-strong">
            ★ {p.review_count ? p.rating.toFixed(1) : "Belum ada rating"}{" "}
            <Text className="text-label leading-muted text-muted">({p.review_count} ulasan)</Text>
          </Text>
          <Text className="mt-[12px] self-start rounded-chip bg-accent-soft px-[10px] py-[6px] text-caption font-bold text-accent-strong">✓ Kos terverifikasi</Text>
          </View>
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
            className="my-[16px] min-h-[112px] items-center justify-center gap-[8px] rounded-control border border-line bg-soft p-[16px]"
          >
            <LocationIcon color={colors.accentStrong} size={32} />
            <Text className="text-body font-bold text-primary">Lihat lokasi di peta ↗</Text>
            <Text className="text-caption text-muted">OpenStreetMap · buka peta</Text>
          </Pressable>
          <Text className="mb-[16px] rounded-control bg-soft p-[14px] text-body leading-body text-muted">{p.description}</Text>
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
            <View className="rounded-control bg-soft p-[14px]">
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
            <Avatar key={p.id} uri={p.owner_avatar_url ?? null} name={p.owner_name} size={44} />
            <View style={{ flex: 1 }}>
              <Text className="text-body font-bold text-ink">{p.owner_name}</Text>
              <Text className="text-label leading-muted text-muted">Owner terverifikasi</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
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
      {backButton}
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
