import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors } from "../theme";
import { Text } from "./Typography";
import { UserBrand } from "./UserBrand";

export function AuthLayout({ title, subtitle, compact = false, children, footer }: PropsWithChildren<{
  title: string;
  subtitle: string;
  compact?: boolean;
  footer: ReactNode;
}>) {
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full max-w-[480px] flex-1 self-center bg-surface">
        <View className={`items-center justify-center pb-[24px] ${compact ? "h-[124px]" : "h-[200px]"}`}>
          <Svg width="100%" height="100%" style={{ position: "absolute" }} accessible={false}>
            <Defs>
              <LinearGradient id="auth-background" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accentSoft} />
                <Stop offset="1" stopColor={colors.accent} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#auth-background)" />
          </Svg>
          <View className="rounded-pill bg-surface px-[18px] py-[10px]">
            <UserBrand />
          </View>
        </View>
        <SafeAreaView edges={["bottom"]} className="-mt-[24px] flex-1 rounded-t-card bg-surface">
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
    </ScrollView>
  );
}
