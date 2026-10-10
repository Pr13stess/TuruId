// Pilot tokens matched to user-app/src/presentation/theme.ts and ProfileUi.tsx.
// Only the profile pilot consumes these until other screens are reviewed.
export const colors = {
  primary: "#2A2D45",
  ink: "#202131",
  muted: "#767680",
  background: "#FAF7F1",
  surface: "#FFFFFF",
  line: "#E9E6E1",
  soft: "#F3F1EE",
  orange: "#F58A00",
  orangeSoft: "#FFF0D9",
  selected: "#EEEDF5",
  green: "#418263",
  danger: "#AA4141",
  dangerSoft: "#FBEDED",
  dangerLine: "#EBCACA",
};
export const radius = { card: 12, button: 10, badge: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, page: 16, section: 20 };
export const typography = {
  name: { fontSize: 20, fontWeight: "700" as const },
  heading: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 14, lineHeight: 20 },
  menu: { fontSize: 15 },
  caption: { fontSize: 13, fontWeight: "600" as const },
  badge: { fontSize: 12, fontWeight: "600" as const },
};
