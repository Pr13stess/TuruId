import { useState, type PropsWithChildren } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { Text } from "./Typography";
import { colors } from "../theme";
import { Icon, type IconName } from "./Icon";
import Svg, { Path, Rect } from "react-native-svg";

function ProfileMenuIcon({ name, color }: { name: IconName; color: string }) {
  if (name === "key") return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} accessible={false}>
      <Rect x={5} y={10} width={14} height={12} rx={2} />
      <Path d="M8 10V6a4 4 0 0 1 8 0v4" />
    </Svg>
  );
  if (name === "bell") return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21a2 2 0 0 0 4 0" />
    </Svg>
  );
  return <Icon name={name} size={20} color={color} />;
}

// Presentational components: navigation, repository calls and state stay in the screen.
export function ProfileAvatar({ name, uri, size = 64 }: { name: string; uri?: string | null; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (uri && uri !== failed) return <Image source={{ uri }} className="rounded-pill bg-accent-soft items-center justify-center" style={{ width: size, height: size }} accessibilityLabel={`Foto profil ${name}`} onError={() => setFailed(uri)} />;
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <View className="rounded-pill bg-accent-soft items-center justify-center" style={{ width: size, height: size }} accessibilityLabel={`Inisial ${name || "pemilik kos"}`}>
      <Text className="text-title font-bold text-accent-strong">{initials}</Text>
    </View>
  );
}

export function MenuSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View className="mt-[24px]" style={{ marginTop: 24 }}>
      <Text className="text-body font-bold text-ink mb-[6px]" style={{ marginBottom: 6 }}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

export function MenuRow({ title, onPress, danger = false, last = false, icon }: {
  title: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      className={"min-h-[52px] flex-row items-center justify-between py-[12px] gap-[12px] " + (!last ? "border-b border-line" : "")}
      style={({ pressed }) => ({ minHeight: 52, paddingVertical: 12, columnGap: 12, backgroundColor: pressed ? colors.soft : colors.surface })}>
      {icon && <View className="w-6 items-center" style={{ width: 24, flexShrink: 0 }} accessible={false}><ProfileMenuIcon name={icon} color={danger ? colors.danger : colors.primary} /></View>}
      <Text className={danger ? "flex-1 text-body text-danger" : "flex-1 text-body text-ink"}>{title}</Text>
      <Icon name="chevron" size={16} color={colors.muted} />
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

