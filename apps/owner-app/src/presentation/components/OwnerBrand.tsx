import { Image, View } from "react-native";
import { Text } from "./Typography";

export function OwnerBrand() {
  return <View className="flex-row items-center gap-1" accessible accessibilityLabel="Turu.Id Owner">
    <Image source={require("../../../assets/owner-logo.png")} resizeMode="contain" className="h-8 w-8" />
    <Text className="text-brand font-black tracking-[-0.7px] text-primary">Turu.Id</Text>
  </View>;
}
