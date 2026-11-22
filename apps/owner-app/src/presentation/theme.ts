// Shared visual tokens. Keep color and radius values in sync with global.css.
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
  orange: "#F58A00",
  orangeSoft: "#FFF0D9",
  selected: "#EEEDF5",
  green: "#418263",
  danger: "#AA4141",
  dangerSoft: "#FBEDED",
  dangerLine: "#EBCACA",
};
export const radius = { chip: 8, control: 12, card: 16, button: 12, badge: 9999, pill: 9999 };
export const spacing = { xs: 4, sm: 8, md: 12, page: 16, section: 20 };
export const typography = {
  name: { fontSize: 20, fontWeight: "700" as const },
  heading: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 14, lineHeight: 20 },
  menu: { fontSize: 15 },
  caption: { fontSize: 13, fontWeight: "600" as const },
  badge: { fontSize: 12, fontWeight: "600" as const },
};

export const textSize = { caption: 11, label: 12, body: 14, header: 16, section: 17, price: 18, title: 24, timer: 30, symbol: 22, display: 42 } as const;
