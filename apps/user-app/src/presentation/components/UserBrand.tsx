import { Image, Text, View } from "react-native";

export function UserBrand() {
  return (
    <View className="flex-row items-center gap-[4px]" accessible accessibilityLabel="Turu.Id">
      <Image
        source={require("../../../assets/turuid-logo.png")}
        resizeMode="contain"
        className="h-[23px] w-[23px]"
      />
      <Text className="text-brand font-black tracking-[-0.7px] text-primary">Turu.Id</Text>
    </View>
  );
}
