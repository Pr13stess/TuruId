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
export function LoginScreen({ navigation }: ScreenProps<"Login">) {
  const { auth, mode } = useRepositories();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await auth.signIn(email, password);
      // No navigation.navigate() here: RootNavigator swaps stacks the
      // moment useAuthSession picks up the new session.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1, backgroundColor: colors.accentSoft }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <AuthLayout
          title="Masuk ke Turu.Id"
          subtitle={mode === "mock"
            ? "Mode demo: daftar akun baru dulu jika belum punya, data tidak tersimpan permanen."
            : "Gunakan email dan kata sandi akunmu."}
          footer={
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Register")} className="min-h-[48px] items-center justify-center px-[8px]">
              <Text className="text-center text-label text-muted">Belum punya akun? <Text className="font-semibold text-accent-strong">Daftar</Text></Text>
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
            autoComplete="password"
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />
          {error && <Text className="text-label leading-muted text-danger">{error}</Text>}
          <View className="mt-[8px] overflow-hidden rounded-pill">
            <Button
              title={submitting ? "Memproses…" : "Masuk"}
              onPress={submit}
              disabled={submitting || !email || !password}
            />
          </View>
        </AuthLayout>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
