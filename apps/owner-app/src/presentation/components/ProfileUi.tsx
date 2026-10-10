import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

// Presentational components: navigation, repository calls and state stay in the screen.
export function ProfileAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <View style={s.avatar} accessibilityLabel={`Inisial ${name || "pemilik kos"}`}>
      <Text style={s.avatarText}>{initials}</Text>
    </View>
  );
}

export function MenuSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.menuCard}>{children}</View>
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
      style={({ pressed }) => [s.row, !last && s.divider, pressed && s.pressed]}>
      <Text style={[s.rowText, danger && { color: colors.danger }]}>{title}</Text>
      <Text style={s.chevron} accessibilityElementsHidden importantForAccessibility="no">›</Text>
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
      style={({ pressed }) => [s.button, variant === "outline" && s.outline,
        variant === "danger" && s.danger, (pressed || busy) && { opacity: 0.7 }]}>
      {busy && <ActivityIndicator color={tint} size="small" />}
      <Text style={[s.buttonText, { color: tint }]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 27, fontWeight: "700", color: colors.surface },
  section: { marginTop: spacing.section },
  sectionTitle: { ...typography.caption, color: colors.muted, marginBottom: spacing.sm, marginLeft: spacing.xs },
  menuCard: { backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    minHeight: 48, paddingHorizontal: spacing.page, paddingVertical: 15, gap: spacing.md },
  rowText: { ...typography.menu, color: colors.ink, flex: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  chevron: { fontSize: 22, color: colors.muted },
  pressed: { backgroundColor: colors.soft },
  button: { minHeight: 48, borderRadius: radius.button, backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: spacing.page, flexDirection: "row",
    gap: spacing.sm, alignItems: "center", justifyContent: "center" },
  buttonText: { ...typography.menu, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerLine },
});
