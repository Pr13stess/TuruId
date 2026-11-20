import { fonts } from "./fonts";
// Keep shared values in sync with the @theme block in global.css.
export const colors = {
  primary: "#2A2D45",
  ink: "#202131",
  muted: "#6B6B76",
  background: "#FAF7F1",
  surface: "#FFFFFF",
  line: "#E9E6E1",
  soft: "#F3F1EE",
  accent: "#F58A00",
  accentStrong: "#9E5400",
  accentSoft: "#FFF0D9",
  success: "#418263",
  // Compatibility aliases for screens that still use StyleSheet.
  orange: "#F58A00",
  orangeSoft: "#FFF0D9",
  selected: "#EEEDF5",
  blue: "#37BFE9",
  pink: "#EB4ACB",
  green: "#418263",
  danger: "#AA4141",
  overlay: "#15162777",
  media: "#080808",
  mediaControl: "#08080888",
  mediaCanvas: "#000000",
};
export const radius = { chip: 8, control: 12, card: 16, button: 12 };

export const typography = {
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, fontWeight: "normal" as const, color: colors.primary },
};
