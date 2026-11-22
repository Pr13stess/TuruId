import { useState, type PropsWithChildren } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { Text } from "./Typography";
import { colors } from "../theme";

// Presentational components: navigation, repository calls and state stay in the screen.
export function ProfileAvatar({ name, uri }: { name: string; uri?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (uri && uri !== failed) return <Image source={{ uri }} className="h-16 w-16 rounded-pill bg-accent-soft items-center justify-center" accessibilityLabel={`Foto profil ${name}`} onError={() => setFailed(uri)} />;
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <View className="h-16 w-16 rounded-pill bg-accent-soft items-center justify-center" accessibilityLabel={`Inisial ${name || "pemilik kos"}`}>
      <Text className="text-title font-bold text-accent-strong">{initials}</Text>
    </View>
  );
}

export function MenuSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View className="mt-5">
      <Text className="text-label font-semibold text-muted mb-2 ml-1">{title}</Text>
      <View className="bg-surface rounded-card border border-line overflow-hidden">{children}</View>
    </View>
  );
}

export function MenuRow({ title, onPress, danger = false, last = false }: {
  title: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      className={"min-h-14 flex-row items-center justify-between px-4 py-3 gap-3 " + (!last ? "border-b border-line" : "")}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.soft : colors.surface })}>
      <Text className={danger ? "flex-1 text-body text-danger" : "flex-1 text-body text-ink"}>{title}</Text>
      <Text className="text-symbol text-muted" accessibilityElementsHidden importantForAccessibility="no">›</Text>
    </Pressable>
  );
}

export function ProfileButton({ title, onPress, busy = false, variant = "primary" }: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  variant?: "primary" | "outline" | "danger";
}) {
  const tint = variant === "primary" ? colors.surface : variant === "danger" ? colors.danger : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress}
      className={"min-h-12 rounded-control px-4 py-3 flex-row gap-2 items-center justify-center " + (variant === "outline" ? "bg-soft border border-line" : variant === "danger" ? "bg-danger-soft border border-danger-line" : "bg-accent")}
      style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}>
      {busy && <ActivityIndicator color={tint} size="small" />}
      <Text className="text-body font-bold text-center shrink" style={{ color: tint }}>{title}</Text>
    </Pressable>
  );
}

