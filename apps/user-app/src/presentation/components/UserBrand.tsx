import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function UserBrand() {
  return (
    <View style={styles.brand} accessible accessibilityLabel="TuruId">
      <Image
        source={require("../../../assets/turuid-logo.png")}
        resizeMode="contain"
        style={styles.logo}
      />
      <Text style={styles.name}>TuruId</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 4 },
  logo: { width: 48, height: 48 },
  name: {
    color: colors.primary,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
});
