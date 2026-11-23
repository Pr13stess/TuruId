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
  const field = (
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={colors.muted}
      className={appearance === "pill"
        ? "min-h-[48px] flex-1 px-0 py-[13px] text-body text-ink"
        : "min-h-[48px] flex-1 px-0 py-[12px] text-body text-ink"}
      style={style}
      {...input}
    />
  );
  return (
    <View className="gap-[6px]">
      <Text className={appearance === "pill" ? "ml-[2px] text-label font-medium text-ink" : "text-body font-semibold text-ink"}>{label}</Text>
      {appearance === "pill" ? (
        <View className={`flex-row items-center rounded-pill bg-soft px-[20px] ${error ? "border border-danger" : "border-0"}`}>
          {field}
        </View>
      ) : (
        <View className={`flex-row items-center rounded-control border bg-surface px-[16px] ${error ? "border-danger" : "border-line"}`}>
          {field}
        </View>
      )}
      {error ? <Text className="text-label leading-muted text-danger">{error}</Text> : null}
    </View>
  );
}
