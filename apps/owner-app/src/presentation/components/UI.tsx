import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  type StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRepositories } from "../../application/RepositoriesProvider";
import { useNav } from "../navigation";
import { colors, radius, spacing, typography } from "../theme";

// Opt in per page while the remaining forms and transactional screens are reviewed.
// The scope covers content only, leaving navigation and other screens unchanged.
const AlignedContent = createContext(false);
export const C = {
  navy: "#2A2D45",
  orange: "#F58A00",
  cream: "#FAF7F1",
  white: "#FFFFFF",
  muted: "#8C8D9C",
  line: "#E7E3DD",
  soft: "#F4EFED",
  green: "#34705B",
  red: "#B54838",
};
export const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const date = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export function T({
  children,
  style,
  muted = false,
}: {
  children: React.ReactNode;
  style?: object;
  muted?: boolean;
}) {
  const aligned = useContext(AlignedContent);
  return (
    <Text style={[
      styles.text,
      aligned && { color: colors.ink, flexShrink: 1 },
      muted && { color: aligned ? colors.muted : C.muted },
      style,
    ]}>
      {children}
    </Text>
  );
}
export function Title({ children }: { children: React.ReactNode }) {
  const aligned = useContext(AlignedContent);
  return (
    <T style={aligned ? typography.heading : { fontSize: 21, fontWeight: "800", letterSpacing: -0.6 }}>
      {children}
    </T>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const aligned = useContext(AlignedContent);
  return <View style={[styles.card, aligned && alignedStyles.card, style]}>{children}</View>;
}
export function Badge({
  children,
  tone = "orange",
}: {
  children: React.ReactNode;
  tone?: "orange" | "green" | "navy";
}) {
  const aligned = useContext(AlignedContent);
  return (
    <View
      style={[{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 4,
        backgroundColor:
          tone === "orange"
            ? "#FFF0DA"
            : tone === "green"
              ? "#E8F4EE"
              : "#ECECF2",
      }, aligned && {
        maxWidth: "100%",
        paddingHorizontal: 10,
        backgroundColor: tone === "orange" ? colors.orangeSoft : colors.soft,
      }]}
    >
      <T style={{ fontSize: 12, fontWeight: "600", color: aligned && tone === "green" ? colors.green : C.navy }}>
        {children}
      </T>
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  const aligned = useContext(AlignedContent);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        aligned && { borderRadius: radius.button, minHeight: 48 },
        {
          backgroundColor: secondary
            ? "transparent"
            : danger
              ? (aligned ? colors.danger : C.red)
              : (aligned ? colors.primary : C.orange),
          borderWidth: secondary ? 1 : 0,
          borderColor: aligned ? colors.primary : C.line,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <T
        style={{
          fontWeight: aligned ? "700" : "800",
          fontSize: aligned ? 15 : 13,
          color: secondary ? C.navy : C.white,
          textAlign: "center",
        }}
      >
        {title}
      </T>
    </Pressable>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <T muted style={{ fontSize: 13, fontWeight: "600", marginLeft: 4 }}>
        {title}
      </T>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}
export function Link({
  title,
  onPress,
  danger = false,
  last = false,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const aligned = useContext(AlignedContent);
  // Older call sites bake a trailing arrow into the label string; strip
  // it so the row can draw its own chevron consistently.
  const label = title.replace(/\s*(→|->)\s*$/, "");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.linkRow, last ? null : styles.linkRowDivider, aligned && alignedStyles.inlineLink]}
    >
      <T style={{ color: danger ? C.red : C.navy, fontSize: 15 }}>{label}</T>
      <T style={{ color: C.muted, fontSize: 22 }}>›</T>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  numeric = false,
  secure = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  numeric?: boolean;
  secure?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 7, marginBottom: 15 }}>
      <T style={{ fontSize: 12, fontWeight: "600" }}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        secureTextEntry={secure}
        keyboardType={numeric ? "numeric" : "default"}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoCapitalize={
          secure || label.toLowerCase().includes("email") ? "none" : "sentences"
        }
        style={[
          styles.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Choices<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: readonly { value: TValue; label: string }[];
  onChange: (v: TValue) => void;
}) {
  const aligned = useContext(AlignedContent);
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <T style={{ fontSize: 12, fontWeight: "600" }}>{label}</T>
      <Row style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={aligned ? { checked: value === o.value } : { selected: value === o.value }}
            aria-checked={aligned ? value === o.value : undefined}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              aligned && alignedStyles.chip,
              value === o.value && {
                backgroundColor: C.navy,
                borderColor: C.navy,
              },
            ]}
          >
            <T
              style={{
                fontSize: 12,
                color: value === o.value ? C.white : C.navy,
              }}
            >
              {o.label}
            </T>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.row, { paddingVertical: 13 }]}
    >
      <T style={{ flex: 1 }}>{label}</T>
      <View
        style={{
          width: 42,
          height: 25,
          borderRadius: 14,
          padding: 3,
          backgroundColor: value ? C.orange : C.line,
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: 19,
            height: 19,
            borderRadius: 10,
            backgroundColor: C.white,
          }}
        />
      </View>
    </Pressable>
  );
}
export function Feedback({
  text,
  error = false,
}: {
  text?: string;
  error?: boolean;
}) {
  const aligned = useContext(AlignedContent);
  if (!text) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: error ? (aligned ? colors.dangerSoft : "#FCECE8") : (aligned ? colors.orangeSoft : "#FFF0DA"),
        marginVertical: 8,
      }}
    >
      <T style={{ fontSize: aligned ? 14 : 12, color: error ? (aligned ? colors.danger : C.red) : C.navy }}>{text}</T>
    </View>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const aligned = useContext(AlignedContent);
  return (
    <Card style={{ alignItems: "center", paddingVertical: 35, gap: 13 }}>
      {!aligned && <T style={{ fontSize: 30, color: C.orange }}>⌂</T>}
      <Title>{title}</Title>
      <T muted style={{ textAlign: "center", lineHeight: 21 }}>
        {body}
      </T>
      {action}
    </Card>
  );
}
export function Load({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  const aligned = useContext(AlignedContent);
  if (aligned && loading) return (
    <Card style={{ alignItems: "center", paddingVertical: 32 }}>
      <ActivityIndicator color={colors.primary} accessibilityLabel="Memuat data" />
      <T muted>Memuat data…</T>
    </Card>
  );
  return loading ? (
    <ActivityIndicator color={C.orange} style={{ margin: 40 }} />
  ) : error ? (
    <Card>
      {aligned && <Title>Belum bisa memuat data</Title>}
      <Feedback text={error} error />
      <Button title="Coba lagi" onPress={retry} />
    </Card>
  ) : null;
}
export function Photo({
  path,
  height = 160,
}: {
  path?: string;
  height?: number;
}) {
  const aligned = useContext(AlignedContent);
  const { support } = useRepositories();
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    if (path && !path.startsWith("demo://"))
      void support
        .mediaUrl(path)
        .then((v) => {
          if (active) setUrl(v);
        })
        .catch(() => {
          if (active) setUrl("");
        });
    return () => {
      active = false;
    };
  }, [path, support]);
  const local =
    path === "demo://kos-2"
      ? require("../../../assets/kos-2.png")
      : path === "demo://kos-3"
        ? require("../../../assets/kos-3.png")
        : require("../../../assets/kos-1.png");
  return (
    <View
      style={{
        height,
        backgroundColor: C.soft,
        overflow: "hidden",
        borderRadius: aligned ? radius.card : 14,
      }}
    >
      {path && (path.startsWith("demo://") || url) ? (
        <Image
          source={path.startsWith("demo://") ? local : { uri: url }}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        />
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <T muted>⌂ Foto kos</T>
        </View>
      )}
    </View>
  );
}
export function Page({
  children,
  title,
  tab,
  back = true,
  action,
  contentContainerStyle,
  aligned = false,
}: {
  children: React.ReactNode;
  title: string;
  tab?: "Home" | "ChatList" | "Bookings" | "Profile";
  back?: boolean;
  action?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  aligned?: boolean;
}) {
  const nav = useNav();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              onPress={() => nav.canGoBack() && nav.goBack()}
              style={{ width: 32 }}
            >
              <T style={{ fontSize: 22 }}>‹</T>
            </Pressable>
          ) : (
            <View style={{ width: 32 }} />
          )}
          <T style={{ fontWeight: "800", fontSize: 16 }}>{title}</T>
          <View style={{ minWidth: 32 }}>{action}</View>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[{
            padding: 22,
            gap: 18,
            paddingBottom: tab ? 120 : 36,
          }, aligned && { padding: spacing.page, gap: spacing.page, paddingBottom: tab ? 130 : 36 }, contentContainerStyle]}
        >
          <AlignedContent.Provider value={aligned}>{children}</AlignedContent.Provider>
        </ScrollView>
        {tab && <Dock active={tab} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Dock({
  active,
}: {
  active: "Home" | "ChatList" | "Bookings" | "Profile";
}) {
  const nav = useNav();
  const items = [
    ["Home", "⌂", "Beranda"],
    ["ChatList", "▤", "Chat"],
    ["add", "+", "Tambah"],
    ["Bookings", "▦", "Booking"],
    ["Profile", "◎", "Profil"],
  ] as const;
  return (
    <View style={styles.dock}>
      {items.map(([route, icon, label]) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          key={route}
          onPress={() =>
            route === "add"
              ? nav.navigate("PropertyForm", {})
              : nav.navigate(route)
          }
          style={{ alignItems: "center", minWidth: 44, gap: 3 }}
        >
          <View
            style={{
              width: route === "add" ? 46 : 34,
              height: route === "add" ? 46 : 34,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                route === "add"
                  ? C.orange
                  : active === route
                    ? C.navy
                    : "transparent",
            }}
          >
            <T
              style={{
                fontSize: route === "add" ? 32 : 23,
                color: route === "add" || active === route ? C.white : C.navy,
                lineHeight: route === "add" ? 37 : 29,
              }}
            >
              {icon}
            </T>
          </View>
          {route !== "add" && (
            <T style={{ fontSize: 9, fontWeight: "700" }}>{label}</T>
          )}
        </Pressable>
      ))}
    </View>
  );
}
export const styles = StyleSheet.create({
  text: { fontSize: 14, color: C.navy, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 17, gap: 12 },
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  linkRowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    minHeight: 46,
    justifyContent: "center",
  },
  input: {
    backgroundColor: C.soft,
    color: C.navy,
    borderRadius: 11,
    padding: 13,
    fontSize: 14,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
  },
  header: {
    height: 68,
    backgroundColor: C.white,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
  },
  dock: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 40,
    backgroundColor: C.white,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    boxShadow: "0 3px 8px #0000001A",
  },
});

const alignedStyles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.page,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inlineLink: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    minHeight: 44,
    borderBottomWidth: 0,
    gap: spacing.sm,
    flexShrink: 1,
  },
  chip: {
    borderRadius: 8,
    minHeight: 44,
    paddingVertical: 10,
    justifyContent: "center",
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
