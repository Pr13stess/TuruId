import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function UserBrand() {
  return (
    <View className="flex-row items-center gap-[4px]" accessible accessibilityLabel="Turu.Id">
      <Image
        source={require("../../../assets/turuid-logo.png")}
        resizeMode="contain"
        style={styles.logo}
      />
      <Text style={styles.name}>Turu.Id</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 48, height: 48 },
  name: {
    color: colors.primary,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
});
