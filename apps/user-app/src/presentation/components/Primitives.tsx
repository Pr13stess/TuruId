import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";
import { useMotionPreference } from "../motion";
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  tone = "accent",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  tone?: "accent" | "primary";
}) {
  const reducedMotion = useMotionPreference();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      className={`min-h-[48px] items-center justify-center rounded-control px-[18px] py-[13px] ${secondary ? "bg-soft" : tone === "primary" ? "bg-primary" : "bg-accent"} ${disabled ? "opacity-40" : "active:opacity-80"} ${reducedMotion || disabled ? "" : "transition-transform duration-[120ms] ease-out active:scale-[0.97]"}`}
    >
      <Text className={`text-body font-bold ${secondary ? "text-primary" : tone === "primary" ? "text-surface" : "text-ink"}`}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      className={`rounded-chip border px-[12px] py-[10px] ${selected ? "border-accent-strong bg-accent-soft" : "border-line bg-surface"}`}
    >
      <Text className={`text-label font-semibold ${selected ? "text-accent-strong" : "text-primary"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Section({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View className="mb-[26px] gap-[12px]">
      <Text className="text-section font-bold text-ink">{title}</Text>
      {children}
    </View>
  );
}
export function Status({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center gap-[16px] p-[32px]">
      {loading ? (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text className="text-label leading-muted text-muted">Memuat kos pilihanmu…</Text>
        </>
      ) : (
        <>
          <Text className="text-section font-bold text-ink">
            {error ? "Belum bisa memuat data" : (empty ?? "Belum ada data")}
          </Text>
          {error && <Text className="text-label leading-muted text-muted">{error}</Text>}
          {onRetry && <Button title="Coba lagi" onPress={onRetry} secondary />}
        </>
      )}
    </View>
  );
}
export function FeatureGrid({ items }: { items: string[] }) {
  return (
    <View className="flex-row flex-wrap gap-[12px]">
      {items.map((item) => (
        <View key={item} className="w-[47%] flex-row items-center gap-[8px]">
          <View className="h-[27px] w-[27px] items-center justify-center rounded-chip bg-soft">
            <Text className="text-label text-primary">✓</Text>
          </View>
          <Text className="flex-1 text-caption text-ink">{item}</Text>
        </View>
      ))}
    </View>
  );
}
/** @deprecated Use theme-backed className utilities. Retained until all consumers migrate. */
export const s = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondary: { backgroundColor: colors.soft },
  disabled: { opacity: 0.4 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  section: { gap: 12, marginBottom: 26 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 12, lineHeight: 19, color: colors.muted },
  status: { padding: 32, gap: 16, alignItems: "center" },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  feature: { width: "47%", flexDirection: "row", gap: 8, alignItems: "center" },
  featureMark: {
    height: 27,
    width: 27,
    borderRadius: 6,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 11, color: colors.ink, flex: 1 },
});
