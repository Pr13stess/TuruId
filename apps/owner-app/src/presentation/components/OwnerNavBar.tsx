import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useNav } from "../navigation";
import { colors } from "../theme";
import { HomeIcon, ChatIcon, BookmarkIcon, ProfileIcon } from "./NavIcons";

export type OwnerTab = "Home" | "ChatList" | "Bookings" | "Profile";

const items = [
  { route: "Home", label: "Beranda", Icon: HomeIcon },
  { route: "ChatList", label: "Chat", Icon: ChatIcon },
  { route: "add", label: "Tambah", Icon: PlusIcon },
  { route: "Bookings", label: "Booking", Icon: BookmarkIcon },
  { route: "Profile", label: "Profil", Icon: ProfileIcon },
] as const;

function PlusIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth={2}
        strokeLinecap="round" />
    </Svg>
  );
}

export function OwnerNavBar({ active }: { active: OwnerTab }) {
  const nav = useNav();
  return (
    // Page already places the dock inside SafeAreaView, including the bottom inset.
    <View pointerEvents="box-none" style={s.wrap}>
      <View style={s.dock}>
        {items.map(({ route, label, Icon }) => {
          const add = route === "add";
          const selected = route === active;
          return (
            <Pressable
              key={route}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={add ? "Tambahkan properti kos" : undefined}
              accessibilityState={{ selected }}
              aria-current={selected ? "page" : undefined}
              onPress={() => {
                if (add) nav.navigate("PropertyForm", {});
                else if (!selected) nav.navigate(route);
              }}
              style={({ pressed }) => [
                s.item,
                selected && s.active,
                add && s.add,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Icon size={add ? 28 : 22}
                color={selected || add ? colors.surface : colors.primary} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    paddingHorizontal: 20,
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 8,
    borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: "0px 4px 14px #00000015",
  },
  item: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  active: { backgroundColor: colors.primary },
  add: { backgroundColor: colors.orange },
});
