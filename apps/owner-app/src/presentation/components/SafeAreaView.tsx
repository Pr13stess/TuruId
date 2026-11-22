import { styled } from "react-native-css";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

// The safe-area-context native view does not resolve className itself.
// Map it to style so flex and background tokens reach the native container.
export const SafeAreaView = styled(NativeSafeAreaView, { className: "style" });
