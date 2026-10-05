import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import { colors } from "../presentation/theme";
import { HomeIcon, ChatIcon, BookmarkIcon, ProfileIcon } from "./NavIcons";

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
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.dock}>
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
              style={styles.dockItem}
            >
              <View style={[styles.dockIcon, focused && styles.dockActive]}>
                <item.Icon size={22} color={focused ? "#fff" : colors.primary} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const SIZE = 52;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  dock: {
    borderRadius: 40,
    backgroundColor: "#fff",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    boxShadow: "0px 4px 14px #00000015",
    borderWidth: 1,
    borderColor: colors.line,
  },
  dockItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  dockIcon: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  dockActive: { backgroundColor: colors.primary },
});