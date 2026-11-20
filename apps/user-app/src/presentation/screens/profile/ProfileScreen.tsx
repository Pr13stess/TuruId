import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/Typography";
import type { TabScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useProfile } from "../../hooks/useProfile";
import {
  DangerButton,
  DangerZone,
  Avatar,
  ErrorState,
  MenuRow,
  MenuSection,
} from "../../components/ProfileUi";
import type { UserRole } from "../../../domain/profile";
import { colors } from "../../theme";

const ROLE_LABEL: Record<UserRole, string> = {
  USER: "Pencari kos",
  OWNER: "Pemilik kos",
  ADMIN: "Admin",
};

export function ProfileScreen({ navigation }: TabScreenProps<"ProfileTab">) {
  const insets = useSafeAreaInsets();
  const { auth } = useRepositories();
  const { profile, loading, error, reload } = useProfile();
  const [signingOut, setSigningOut] = useState(false);

  const soon = (title: string, description: string) =>
    navigation.navigate("ComingSoon", { title, description });

  const confirmLogout = () =>
    Alert.alert("Keluar dari akun?", "Kamu perlu masuk lagi untuk melanjutkan.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await auth.signOut();
          } catch {
            setSigningOut(false);
            Alert.alert("Gagal keluar", "Periksa koneksi lalu coba lagi.");
          }
        },
      },
    ]);

  if (loading && !profile)
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (error && !profile) return <ErrorState message={error} onRetry={reload} />;
  if (!profile) return null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 20, paddingBottom: 130 + insets.bottom, width: "100%", maxWidth: 600, alignSelf: "center" }}
    >
      <View className="flex-row items-start gap-[12px] py-[8px]">
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={48} />
        <View className="flex-1">
          <Text className="text-header font-semibold text-ink">{profile.full_name || "Nama belum diisi"}</Text>
          {profile.email ? <Text className="mt-[3px] text-label leading-muted text-muted">{profile.email}</Text> : null}
          <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
            {profile.roles.map((r) => (
              <Text key={r} className="overflow-hidden rounded-chip bg-soft px-[8px] py-[3px] text-caption text-muted">
                {ROLE_LABEL[r]}
              </Text>
            ))}
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ubah profil" onPress={() => navigation.navigate("EditProfile")}
          className="min-h-[48px] justify-center active:opacity-60">
          <View className="rounded-chip bg-accent-soft px-[10px] py-[6px]">
            <Text className="text-caption font-semibold text-accent-strong">Ubah profil</Text>
          </View>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Booking Saya" onPress={() => navigation.navigate("BookingTab")}
        className="mt-[20px] overflow-hidden rounded-card bg-soft active:opacity-80">
        <ImageBackground source={require("../../../../assets/kos-1.png")} resizeMode="cover"
          style={{ height: 144 }} accessible={false}>
          <View className="mt-auto flex-row items-center gap-[10px] bg-media-control px-[14px] py-[14px]">
            <Ionicons name="calendar-outline" size={20} color={colors.surface} accessible={false} />
            <Text className="flex-1 text-body font-semibold text-surface">Booking Saya</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.surface} accessible={false} />
          </View>
        </ImageBackground>
      </Pressable>

      <MenuSection title="Akun">
        <MenuRow
          label="Ubah password"
          last
          onPress={() => navigation.navigate("ChangePassword")}
        />
      </MenuSection>

      <MenuSection title="Aktivitas">
        <MenuRow
          label="Favorit"
          onPress={() => navigation.navigate("Favorites")}
        />
        <MenuRow
          label="Catatan Saya"
          onPress={() => navigation.navigate("Notes")}
        />
        <MenuRow
          label="Riwayat pembayaran"
          onPress={() => navigation.navigate("PaymentHistory")}
        />
        <MenuRow
          label="Notifikasi"
          last
          onPress={() => navigation.navigate("Notifications")}
        />
      </MenuSection>

      <MenuSection title="Bantuan dan kebijakan">
        <MenuRow label="Bantuan dan FAQ" onPress={() => navigation.navigate("Info", { kind: "help" })} />
        <MenuRow label="Tentang aplikasi" onPress={() => navigation.navigate("Info", { kind: "about" })} />
        <MenuRow label="Privacy Policy" onPress={() => navigation.navigate("Policy", { kind: "privacy" })} />
        <MenuRow
          label="Terms and Conditions"
          last
          onPress={() => navigation.navigate("Policy", { kind: "terms" })}
        />
      </MenuSection>


      <View className="mt-[28px]">
        <DangerButton
          title="Keluar"
          icon="log-out-outline"
          loading={signingOut}
          onPress={confirmLogout}
        />
      </View>

      <DangerZone description="Catatan, favorit, dan foto profilmu akan ikut dihapus secara permanen.">
        <DangerButton
          title="Hapus akun"
          icon="trash-outline"
          variant="solid"
          onPress={() =>
            soon(
              "Hapus akun",
              "Penghapusan akun akan tersedia di versi berikutnya. Catatan, favorit, dan foto profilmu akan ikut dihapus, sedangkan riwayat transaksi dianonimkan.",
            )
          }
        />
      </DangerZone>
    </ScrollView>
  );
}
