import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (error && !profile) return <ErrorState message={error} onRetry={reload} />;
  if (!profile) return null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={76} />
        <View style={s.headerText}>
          <Text style={s.name}>{profile.full_name || "Nama belum diisi"}</Text>
          {profile.email ? <Text style={s.email}>{profile.email}</Text> : null}
          <View style={s.badges}>
            {profile.roles.map((r) => (
              <Text key={r} style={s.badge}>
                {ROLE_LABEL[r]}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <MenuSection title="Akun">
        <MenuRow label="Ubah profil" onPress={() => navigation.navigate("EditProfile")} />
        <MenuRow
          label="Ubah password"
          last
          onPress={() => navigation.navigate("ChangePassword")}
        />
      </MenuSection>

      <MenuSection title="Aktivitas">
        <MenuRow
          label="Favorit"
          onPress={() => soon("Favorit", "Kos yang kamu simpan akan muncul di sini.")}
        />
        <MenuRow
          label="Catatan Saya"
          onPress={() => soon("Catatan Saya", "Catatan tentang kos yang kamu survei akan muncul di sini.")}
        />
        <MenuRow label="Booking Saya" onPress={() => navigation.navigate("BookingTab")} />
        <MenuRow
          label="Riwayat pembayaran"
          onPress={() => soon("Riwayat pembayaran", "Riwayat pembayaran akan muncul di sini setelah fitur pemesanan tersedia.")}
        />
        <MenuRow
          label="Notifikasi"
          last
          onPress={() => soon("Notifikasi", "Pemberitahuan tentang akun dan kos akan muncul di sini.")}
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


      <View style={s.logout}>
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

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 130 },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerText: { flex: 1 },
  name: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  email: { color: colors.muted, fontSize: 14, marginTop: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    backgroundColor: colors.orangeSoft,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  logout: { marginTop: 28 },
});
