import { Image, View } from "react-native";
import { Text } from "./Typography";

export function UserBrand() {
  return (
    <View className="flex-row items-center gap-[4px]" accessible accessibilityLabel="Turu.Id">
      <Image
        source={require("../../../assets/turuid-logo.png")}
        resizeMode="contain"
        className="h-[32px] w-[32px]"
      />
      <Text className="text-brand font-black tracking-[-0.7px] text-primary">Turu.Id</Text>
    </View>
  );
}
