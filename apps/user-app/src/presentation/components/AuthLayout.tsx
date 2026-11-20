import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors } from "../theme";
import { Text } from "./Typography";
import { UserBrand } from "./UserBrand";

export function AuthLayout({ title, subtitle, compact = false, children, footer }: PropsWithChildren<{
  title: string;
  subtitle: string;
  compact?: boolean;
  footer: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const headerHeight = (compact ? 172 : 200) + insets.top;
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
    >
      <View className="w-full max-w-[480px] flex-1 self-center bg-surface">
        <View className="shrink-0 bg-accent-soft" style={{ height: headerHeight }}>
          <Svg width="100%" height={headerHeight} viewBox="0 0 480 200" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }} accessible={false} pointerEvents="none">
            <Defs>
              <LinearGradient id="auth-background" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accentSoft} />
                <Stop offset="1" stopColor={colors.accent} />
              </LinearGradient>
            </Defs>
            <Rect width={480} height={200} fill="url(#auth-background)" />
            <Path d="M-40 12C20-42 105-12 130 35C158 89 89 92 78 143C65 199-13 185-40 149Z" fill={colors.surface} opacity={0.32} />
            <Path d="M365-32C422-51 518-4 514 63C509 124 452 139 413 109C379 82 319 76 328 28C332 4 346-18 365-32Z" fill={colors.accent} opacity={0.2} />
            <Path d="M372 145C405 108 460 117 502 145L510 215H302C302 180 343 177 372 145Z" fill={colors.accentSoft} opacity={0.45} />
          </Svg>
          <View className="flex-1 items-center justify-center pb-[24px]" style={{ paddingTop: insets.top }}>
            <View className="rounded-pill bg-surface px-[18px] py-[10px]">
              <UserBrand />
            </View>
          </View>
        </View>
        <View className="-mt-[32px] flex-1 overflow-hidden rounded-t-auth bg-surface">
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <View className="flex-1 px-[24px] pt-[30px] pb-[20px]">
            <View className="mb-[30px] items-center gap-[10px]">
              <Text className="text-center text-title font-semibold text-ink">{title}</Text>
              <Text className="max-w-[300px] text-center text-label leading-muted text-muted">{subtitle}</Text>
            </View>
            <View className="gap-[18px]">{children}</View>
            <View className="mt-auto items-center pt-[32px]">{footer}</View>
          </View>
        </SafeAreaView>
        </View>
      </View>
    </ScrollView>
  );
}
