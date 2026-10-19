import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function OwnerBrand() {
  return <View style={styles.brand} accessible accessibilityLabel="Turu.Id Owner">
    <Image source={require("../../../assets/owner-logo.png")} resizeMode="contain" style={styles.logo} />
    <Text style={styles.name}>Turu.Id</Text>
  </View>;
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 4 },
  logo: { width: 48, height: 48 },
  name: { color: colors.primary, fontSize: 23, fontWeight: "900", letterSpacing: -0.7 },
});
