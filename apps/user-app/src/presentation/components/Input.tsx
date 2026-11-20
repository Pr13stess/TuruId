import { View, type TextInputProps } from "react-native";
import { Text, TextInput } from "./Typography";
import { colors } from "../theme";

export function Input({
  label,
  error,
  style,
  appearance = "default",
  ...input
}: TextInputProps & { label: string; error?: string; appearance?: "default" | "pill" }) {
  return (
    <View className="gap-[6px]">
      <Text className={appearance === "pill" ? "ml-[2px] text-label font-medium text-ink" : "text-body font-semibold text-ink"}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        className={`min-h-[48px] border text-body text-ink ${appearance === "pill" ? "rounded-pill bg-soft px-[16px] py-[13px]" : "rounded-control bg-surface px-[14px] py-[12px]"} ${error ? "border-danger" : appearance === "pill" ? "border-soft" : "border-line"}`}
        style={style}
        {...input}
      />
      {error ? <Text className="text-label leading-muted text-danger">{error}</Text> : null}
    </View>
  );
}
