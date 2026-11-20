import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import { colors } from "../presentation/theme";
import { HomeIcon, ChatIcon, BookmarkIcon, ProfileIcon } from "./NavIcons";
import { useMotionPreference } from "../presentation/motion";

type IconProps = { color: string; size?: number };

const ITEMS: Record<
  keyof MainTabParamList,
  { Icon: (p: IconProps) => React.JSX.Element; label: string }
> = {
  HomeTab: { Icon: HomeIcon, label: "Home" },
  ChatTab: { Icon: ChatIcon, label: "Chat" },
  BookingTab: { Icon: BookmarkIcon, label: "Booking" },
  ProfileTab: { Icon: ProfileIcon, label: "Profil" },
};

export function FloatingNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useMotionPreference();
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(0));
  const counterPosition = useMemo(() => Animated.multiply(position, -1), [position]);
  const previousWidth = useRef(0);
  const target = width / state.routes.length * (state.index + 0.5) - 26;
  useLayoutEffect(() => {
    if (!width) return;
    if (reducedMotion || previousWidth.current !== width) {
      position.stopAnimation();
      position.setValue(target);
      previousWidth.current = width;
      return;
    }
    const animation = Animated.timing(position, {
      toValue: target,
      duration: 220,
      easing: Easing.out(Easing.circle),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [position, reducedMotion, target, width]);
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 px-[20px]"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="rounded-pill border border-line bg-surface p-[8px] shadow-dock">
        <View className="relative flex-row items-center" onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
        {state.routes.map((route, index) => {
          const item = ITEMS[route.name as keyof MainTabParamList];
          if (!item) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented)
              navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              className="flex-1 items-center justify-center"
            >
              <View className="h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-pill">
                <item.Icon size={22} color={colors.primary} />
              </View>
            </Pressable>
          );
        })}
        {width > 0 && <Animated.View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: position }] }}
        >
          <View className="h-[52px] w-[52px] overflow-hidden rounded-pill bg-primary">
            {/* Counter-translation keeps the white icons stationary inside the moving mask. */}
            <Animated.View style={{ width, flexDirection: "row", transform: [{ translateX: counterPosition }] }}>
              {state.routes.map((route) => {
                const item = ITEMS[route.name as keyof MainTabParamList];
                return <View key={route.key} className="h-[52px] flex-1 items-center justify-center">
                  {item && <item.Icon size={22} color={colors.surface} />}
                </View>;
              })}
            </Animated.View>
          </View>
        </Animated.View>}
        </View>
      </View>
    </View>
  );
}
