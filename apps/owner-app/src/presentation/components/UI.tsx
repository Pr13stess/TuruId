import type { ScrollViewInstance } from "react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { SafeAreaView } from "./SafeAreaView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRepositories } from "../../application/RepositoriesProvider";
import { useNav } from "../navigation";
import { Icon, IconName } from "./Icon";
import { OwnerBrand } from "./OwnerBrand";
import { Text, TextInput } from "./Typography";
import { colors, radius as themeRadius } from "../theme";

export const C = {
  navy: colors.primary,
  orange: colors.accent,
  cream: colors.background,
  white: colors.surface,
  peach: colors.accentSoft,
  orangeDark: colors.accentStrong,
  muted: colors.muted,
  line: colors.line,
  soft: colors.soft,
  green: colors.success,
  red: colors.danger,
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
  return (
    <Text className={muted ? "text-body leading-body text-muted" : "text-body leading-body text-ink"} style={style}>
      {children}
    </Text>
  );
}
export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-title font-extrabold text-ink">{children}</Text>
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
  return <View className="rounded-card border border-line bg-surface p-4 gap-3" style={style}>{children}</View>;
}
export function Badge({
  children,
  tone = "orange",
}: {
  children: React.ReactNode;
  tone?: "orange" | "green" | "navy";
}) {
  return (
    <View className={tone === "orange" ? "self-start rounded-pill px-3.5 py-1 bg-accent-soft" : "self-start rounded-pill px-3.5 py-1 bg-soft"}>
      <Text className={tone === "orange" ? "text-label font-semibold text-accent-strong" : tone === "green" ? "text-label font-semibold text-success" : "text-label font-semibold text-primary"}>{children}</Text>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      className={"min-h-12 justify-center rounded-control px-4 py-3 " + (secondary ? "bg-soft border border-line" : danger ? "bg-danger" : "bg-accent")}
      style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}
    >
      <Text className={secondary ? "text-body font-extrabold text-center text-primary" : "text-body font-extrabold text-center text-surface"}>{title}</Text>
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
      <View className="rounded-card border border-line bg-surface overflow-hidden">{children}</View>
    </View>
  );
}
export function Link({
  title,
  onPress,
  danger = false,
  last = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  icon?: IconName;
}) {
  // Older call sites bake a trailing arrow into the label string; strip
  // it so the row can draw its own chevron consistently.
  const label = title.replace(/\s*(→|->)\s*$/, "");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.linkRow, last ? null : styles.linkRowDivider]}
    >
      <Row style={{ flex: 1, justifyContent: "flex-start", gap: 12 }}>
        {icon && (
          <Icon name={icon} size={20} color={danger ? C.red : C.orangeDark} />
        )}
        <T style={{ flex: 1, color: danger ? C.red : C.navy, fontSize: 14 }}>
          {label}
        </T>
      </Row>
      <Icon name="chevron" color={C.muted} size={17} />
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  numeric?: boolean;
  secure?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <View className="gap-2 mb-4">
      <Text className="px-1 text-label font-semibold text-ink">{label}</Text>
      <View className="rounded-control border border-line bg-soft px-4">
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        editable={!disabled}
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
        className="min-h-12 py-3 text-body text-ink"
        style={{ paddingHorizontal: 0, ...(multiline ? { minHeight: 90, textAlignVertical: "top" as const } : {}) }}
      />
      </View>
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
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <T style={{ fontSize: 12, fontWeight: "600" }}>{label}</T>
      <Row style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === o.value }}
            onPress={() => onChange(o.value)}
            className={"min-h-12 justify-center rounded-chip border px-4 py-3 " + (value === o.value ? "bg-accent-soft border-accent" : "bg-surface border-line")}
          >
            <Text className={value === o.value ? "text-label font-semibold text-accent-strong" : "text-label text-primary"}>
              {o.label}
            </Text>
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
  if (!text) return null;
  return (
    <View
      accessibilityRole="alert"
      className={"p-3 rounded-control my-2 " + (error ? "bg-danger-soft" : "bg-accent-soft")}
    >
      <T style={{ fontSize: 12, color: error ? C.red : C.navy }}>{text}</T>
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
  return (
    <Card style={{ alignItems: "center", paddingVertical: 35, gap: 13 }}>
      <T style={{ fontSize: 30, color: C.orange }}>⌂</T>
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
  return loading ? (
    <ActivityIndicator color={C.orange} style={{ margin: 40 }} />
  ) : error ? (
    <Card>
      <Feedback text={error} error />
      <Button title="Coba lagi" onPress={retry} />
    </Card>
  ) : null;
}
export function Photo({
  path,
  height = 160,
  radius = themeRadius.card,
}: {
  path?: string;
  height?: number;
  radius?: number;
}) {
  const { support } = useRepositories();
  const [resolved, setResolved] = useState({ path: "", url: "" });
  useEffect(() => {
    let active = true;
    if (path && !path.startsWith("demo://"))
      void support
        .mediaUrl(path)
        .then((url) => {
          if (active) setResolved({ path, url });
        })
        .catch(() => {
          if (active) setResolved({ path, url: "" });
        });
    return () => {
      active = false;
    };
  }, [path, support]);
  const url = resolved.path === path ? resolved.url : "";
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
        borderRadius: radius,
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
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icon name="photo" size={28} color={C.muted} />
          <T muted style={{ fontSize: 12 }}>
            Foto kos belum tersedia
          </T>
        </View>
      )}
    </View>
  );
}
export function TextLink({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Row style={{ gap: 5 }}>
        <T style={{ fontSize: 11, fontWeight: "700", color: C.orangeDark }}>
          {title}
        </T>
        <Icon name="arrow" size={13} color={C.orangeDark} />
      </Row>
    </Pressable>
  );
}
export function Segments<TValue extends string>({
  value,
  options,
  onChange,
  scrollable = false,
}: {
  value: TValue;
  options: readonly { value: TValue; label: string }[];
  onChange: (value: TValue) => void;
  scrollable?: boolean;
}) {
  const items = options.map((option) => (
    <Pressable
      key={option.value}
      accessibilityRole="tab"
      accessibilityLabel={option.label}
      accessibilityState={{ selected: option.value === value }}
      onPress={() => onChange(option.value)}
      className={"min-h-12 items-center justify-center rounded-pill " + (option.value === value ? "bg-primary" : "bg-soft")}
      style={{ flex: scrollable ? undefined : 1, paddingHorizontal: scrollable ? 17 : 0 }}
    >
      <Text className={option.value === value ? "text-label font-bold text-surface" : "text-label font-medium text-primary"}>
        {option.label}
      </Text>
    </Pressable>
  ));
  return (
    <View
      accessibilityRole="tablist"
      className="bg-soft rounded-pill p-1 overflow-hidden flex-row"
    >
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
        >
          {items}
        </ScrollView>
      ) : (
        items
      )}
    </View>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  color = C.navy,
  disabled = false,
  selected = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={name} size={21} color={color} />
    </Pressable>
  );
}
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E3E3E6",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <T
        style={{
          color: "#737581",
          fontWeight: "700",
          fontSize: size / 3,
          lineHeight: size / 2,
        }}
      >
        {initials}
      </T>
    </View>
  );
}
export function ChatLayout({
  children,
  title,
  heading,
  footer,
  tab,
  scrollRef,
  onContentSizeChange,
}: {
  children: React.ReactNode;
  title: string;
  heading?: React.ReactNode;
  footer?: React.ReactNode;
  tab?: "ChatList";
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
  onContentSizeChange?: () => void;
}) {
  const nav = useNav();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.orange }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Row
          style={{
            height: 62,
            paddingHorizontal: 10,
            justifyContent: "flex-start",
          }}
        >
          <IconButton
            name="back"
            label="Kembali"
            color={C.white}
            onPress={() =>
              nav.canGoBack() ? nav.goBack() : nav.navigate("Home")
            }
          />
          <T style={{ color: C.white, fontSize: 18, fontWeight: "700" }}>
            {title}
          </T>
        </Row>
        <View
          style={{
            flex: 1,
            borderTopLeftRadius: 35,
            borderTopRightRadius: 35,
            backgroundColor: C.white,
            paddingTop: 16,
            overflow: "hidden",
          }}
        >
          {heading && <View style={{ paddingHorizontal: 20 }}>{heading}</View>}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={onContentSizeChange}
            contentContainerStyle={{
              padding: 18,
              gap: 16,
              paddingBottom: tab ? 115 : 18,
            }}
          >
            {children}
          </ScrollView>
          {footer && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 16,
                backgroundColor: C.white,
              }}
            >
              {footer}
            </View>
          )}
          {tab && <Dock active={tab} role="owner" />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Brand() {
  return <OwnerBrand />;
}
export function Page({
  children,
  title,
  tab,
  back = true,
  action,
  brand = false,
  header = true,
  fullBleed = false,
  contentStyle,
  navigationRole = "owner",
  onRefresh,
  refreshing = false,
}: {
  children: React.ReactNode;
  title: string;
  tab?: "Home" | "ChatList" | "Bookings" | "Profile";
  back?: boolean;
  action?: React.ReactNode;
  brand?: boolean;
  header?: boolean;
  fullBleed?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  navigationRole?: "owner" | "customer";
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView className="flex-1 bg-background">
      {header && !brand && <View pointerEvents="none" className="absolute left-0 right-0 top-0 bg-surface" style={{ height: insets.top }} />}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {header && (
          <View className={brand
            ? "flex-row items-center justify-between bg-background px-5 pt-4 pb-5"
            : "min-h-16 flex-row items-center justify-between bg-surface px-4 py-2 border-b border-line"}>
            {brand ? (
              <Brand />
            ) : (
              <>
                {back ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Kembali"
                    onPress={() =>
                      nav.canGoBack() ? nav.goBack() : nav.navigate("Home")
                    }
                    className="h-12 w-12 items-center justify-center rounded-pill bg-soft"
                  >
                    <Icon name="back" color={C.navy} />
                  </Pressable>
                ) : (
                  <View className="w-12" />
                )}
                <Text className="flex-1 px-3 text-center text-header font-bold text-primary">
                  {title}
                </Text>
              </>
            )}
            <View className={brand ? "min-w-11 items-end" : "min-w-12 items-end"}>
              {action}
            </View>
          </View>
        )}
        <ScrollView
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} accessibilityLabel="Muat ulang booking" /> : undefined}
          alwaysBounceVertical={onRefresh ? true : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              padding: fullBleed ? 0 : 22,
              gap: fullBleed ? 0 : 18,
              paddingBottom: tab ? 118 : 36,
            },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
        {tab && <Dock active={tab} role={navigationRole} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Dock({
  active,
  role,
}: {
  active: "Home" | "ChatList" | "Bookings" | "Profile";
  role: "owner" | "customer";
}) {
  const nav = useNav();
  const items = [
    ["Home", "home", "Beranda"],
    ["ChatList", "chat", "Chat"],
    ["add", "plus", "Tambahkan properti"],
    ["Bookings", "bookings", "Pemesanan"],
    ["Profile", "user", "Profil"],
  ] as const;
  return (
    <View className="absolute bottom-3 left-4 right-4 flex-row items-center rounded-pill border border-line bg-surface p-2 shadow-dock">
      {items
        .filter(([route]) => route !== "add" || role === "owner")
        .map(([route, icon, label]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: route === active }}
            key={route}
            onPress={() =>
              route === "add"
                ? nav.navigate("PropertyForm", {})
                : nav.navigate(route)
            }
            className="min-h-14 flex-1 items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              className={"h-12 w-12 items-center justify-center rounded-pill " +
                (route === "add" ? "bg-accent" : active === route ? "bg-primary" : "bg-surface")}
            >
              <Icon
                name={icon}
                size={route === "add" ? 28 : 23}
                color={route === "add" || active === route ? C.white : C.navy}
              />
            </View>
          </Pressable>
        ))}
    </View>
  );
}
/** @deprecated Legacy styles remain available until screen consumers are migrated. */
export const styles = StyleSheet.create({
  text: { fontSize: 14, color: C.navy, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 17,
    gap: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
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
    backgroundColor: C.white,
    color: C.navy,
    borderRadius: 11,
    padding: 13,
    fontSize: 14,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#CACBD4",
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
  },
  header: {
    minHeight: 76,
    backgroundColor: C.white,
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
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 40,
    backgroundColor: C.orange,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    boxShadow: "0 3px 8px #0000001A",
  },
});
