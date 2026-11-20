import { Input } from "../components/Input";
import { AuthLayout } from "../components/AuthLayout";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Text } from "../components/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { Button } from "../components/Primitives";
import { colors } from "../theme";


export function RegisterScreen({ navigation }: ScreenProps<"Register">) {
  const { auth, mode } = useRepositories();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [campus, setCampus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setError(null);
    setNotice(null);
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSubmitting(true);
    try {
      await auth.signUp(email, password, {
        full_name: fullName.trim(),
        phone: phone.replace(/[\s-]/g, ""),
        campus: campus.trim(),
      });

      if (mode === "supabase") {
        // Supabase may require email confirmation depending on project
        // settings; either way there is no session to react to yet.
        setNotice(
          "Pendaftaran berhasil. Periksa email untuk verifikasi, lalu masuk.",
        );
      }
      // In mock mode, signUp already opens a session; RootNavigator
      // swaps to the app stack on its own.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftar.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.accentSoft }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <AuthLayout
          compact
          title="Buat akun Turu.Id"
          subtitle="Dipakai untuk menyimpan pilihan sewa dan riwayat booking."
          footer={
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")} className="min-h-[48px] items-center justify-center px-[8px]">
              <Text className="text-center text-label text-muted">Sudah punya akun? <Text className="font-semibold text-accent-strong">Masuk</Text></Text>
            </Pressable>
          }
        >
          <Input
            appearance="pill"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="nama@email.com"
            placeholderTextColor={colors.muted}
          />
          <Input
            appearance="pill"
            label="Kata sandi"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimal 6 karakter"
            placeholderTextColor={colors.muted}
          />
          <Input
            appearance="pill"
            label="Ulangi kata sandi"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />
          {error && <Text className="text-label leading-muted text-danger">{error}</Text>}
          {notice && <Text className="text-label leading-muted text-success">{notice}</Text>}
          <View className="mt-[8px] overflow-hidden rounded-pill">
            <Button
              title={submitting ? "Memproses…" : "Daftar"}
              onPress={submit}
              disabled={submitting || !email || !password || !confirm}
            />
          </View>
        </AuthLayout>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
