// Static faces keep weight selection consistent on Android, iOS, and web.
export const fonts = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  extrabold: "PlusJakartaSans-ExtraBold",
} as const;

export const fontAssets = {
  [fonts.regular]: require("../../assets/fonts/PlusJakartaSans-Regular.otf"),
  [fonts.medium]: require("../../assets/fonts/PlusJakartaSans-Medium.otf"),
  [fonts.semibold]: require("../../assets/fonts/PlusJakartaSans-SemiBold.otf"),
  [fonts.bold]: require("../../assets/fonts/PlusJakartaSans-Bold.otf"),
  [fonts.extrabold]: require("../../assets/fonts/PlusJakartaSans-ExtraBold.otf"),
};
