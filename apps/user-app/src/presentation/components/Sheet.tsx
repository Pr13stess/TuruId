import type { PropsWithChildren } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../theme";
export function Sheet({
  visible,
  title,
  onClose,
  children,
  animationType = "slide",
  panelClassName,
  interactive = true,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  animationType?: "none" | "slide" | "fade";
  panelClassName?: string;
  interactive?: boolean;
}>) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-end bg-overlay">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup panel"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View className={panelClassName} pointerEvents={interactive ? "auto" : "none"} style={{ width: "100%", maxWidth: 600, maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>
          <SafeAreaView edges={["bottom"]} style={{ flexShrink: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>
            <View className="mt-[10px] h-[4px] w-[40px] self-center rounded-pill bg-muted" />
            <View className="flex-row items-center justify-between gap-[12px] p-[20px]">
              <Text className="flex-1 text-price font-bold text-primary">{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={onClose}
                className="h-[44px] w-[44px] items-center justify-center rounded-control bg-soft"
                hitSlop={12}
              >
                <Text className="text-close text-primary">×</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 14 }}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
