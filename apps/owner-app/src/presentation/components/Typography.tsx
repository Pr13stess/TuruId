import { createContext, forwardRef, useContext } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { fonts } from "../fonts";

const WeightContext = createContext<TextStyle["fontWeight"]>("400");
const weights: Record<string, TextStyle["fontWeight"]> = {
  "font-normal": "400",
  "font-medium": "500",
  "font-semibold": "600",
  "font-bold": "700",
  "font-extrabold": "800",
  "font-black": "900",
};
const faces = {
  "400": { family: fonts.regular, className: "font-jakarta" },
  "500": { family: fonts.medium, className: "font-jakarta-medium" },
  "600": { family: fonts.semibold, className: "font-jakarta-semibold" },
  "700": { family: fonts.bold, className: "font-jakarta-bold" },
  "800": { family: fonts.extrabold, className: "font-jakarta-extrabold" },
};

function textFont(className: string, style: TextStyle | undefined, inherited: TextStyle["fontWeight"]) {
  const classes = className.split(/\s+/);
  const classWeight = classes.reduce<TextStyle["fontWeight"]>((weight, name) => weights[name] ?? weight, undefined);
  const weight = style?.fontWeight ?? classWeight ?? inherited ?? "400";
  const numeric = weight === "bold" ? 700 : weight === "normal" ? 400 : Number(weight);
  // Jakarta's heaviest face is ExtraBold (800); map the former Black brand to it.
  const key = String(Math.max(400, Math.min(800, Math.round(numeric / 100) * 100))) as keyof typeof faces;
  return { weight, face: faces[key], className: classes.filter(name => !weights[name]).join(" ") };
}

/** Native Text props and refs are forwarded unchanged; only typography is supplied. */
export const Text = forwardRef<NativeText, TextProps>(function Text({ className = "", style, ...props }, ref) {
  const inherited = useContext(WeightContext);
  const flat = StyleSheet.flatten(style);
  const font = textFont(className, flat, inherited);
  return (
    <WeightContext.Provider value={font.weight}>
      <NativeText {...props} ref={ref} className={`${font.face.className} ${font.className}`}
        style={[style, { fontFamily: flat?.fontFamily ?? font.face.family, fontWeight: "normal" }]} />
    </WeightContext.Provider>
  );
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ className = "", style, ...props }, ref) {
  const flat = StyleSheet.flatten(style);
  const font = textFont(className, flat, "400");
  return <NativeTextInput {...props} ref={ref} className={`${font.face.className} ${font.className}`}
    style={[style, { fontFamily: flat?.fontFamily ?? font.face.family, fontWeight: "normal" }]} />;
});
