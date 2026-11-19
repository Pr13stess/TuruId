import { Pressable, Text, View } from "react-native";
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
      className="absolute inset-x-0 bottom-0 px-[20px]"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="flex-row items-center justify-around rounded-pill border border-line bg-surface p-[8px] shadow-dock">
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
              className={`min-h-[52px] flex-1 items-center justify-center gap-[2px] rounded-pill px-[4px] py-[5px] ${focused ? "bg-accent-soft" : "bg-surface"}`}
            >
              <item.Icon size={22} color={focused ? colors.accentStrong : colors.primary} />
              <Text className={`text-caption font-semibold ${focused ? "text-accent-strong" : "text-primary"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
