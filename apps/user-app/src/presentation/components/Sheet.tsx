import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Easing, Platform, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMotionPreference } from "../motion";
import { colors, radius } from "../theme";
export function Sheet({
  visible,
  title,
  onClose,
  children,
  animationType = "slide",
  panelClassName,
  interactive = true,
  separateBackdropAnimation = false,
  onAfterClose,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  animationType?: "none" | "slide" | "fade";
  panelClassName?: string;
  interactive?: boolean;
  separateBackdropAnimation?: boolean;
  onAfterClose?: () => void;
}>) {
  const reducedMotion = useMotionPreference();
  const [presented, setPresented] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const afterClose = useRef(onAfterClose);
  useEffect(() => { afterClose.current = onAfterClose; }, [onAfterClose]);
  useEffect(() => {
    if (!separateBackdropAnimation) return;
    if (!presented || (visible && !panelHeight)) return;
    // Match the navbar's 220ms circular ease-out; animate only opacity and transform.
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reducedMotion ? 0 : 220,
      easing: Easing.out(Easing.circle),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setPresented(false);
        afterClose.current?.();
      }
    });
    return () => animation.stop();
  }, [visible, presented, panelHeight, progress, reducedMotion, separateBackdropAnimation]);
  const Panel = separateBackdropAnimation ? Animated.View : View;
  return (
    <Modal
      visible={separateBackdropAnimation ? visible || presented : visible}
      onShow={separateBackdropAnimation ? () => setPresented(true) : undefined}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={separateBackdropAnimation ? "none" : animationType}
      onRequestClose={onClose}
    >
      <View className={`flex-1 items-center justify-end ${separateBackdropAnimation ? "" : "bg-overlay"}`}>
        {separateBackdropAnimation && <Animated.View pointerEvents="none" className="bg-overlay"
          style={[StyleSheet.absoluteFill, { opacity: progress }]} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup panel"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Panel className={panelClassName} pointerEvents={interactive && (!separateBackdropAnimation || visible) ? "auto" : "none"}
          onLayout={separateBackdropAnimation ? event => setPanelHeight(event.nativeEvent.layout.height) : undefined}
          style={{ opacity: separateBackdropAnimation && !panelHeight ? 0 : 1, transform: separateBackdropAnimation ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [panelHeight, 0] }) }] : undefined, width: "100%", maxWidth: 600, maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>
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
        </Panel>
      </View>
    </Modal>
  );
}
