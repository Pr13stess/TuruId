import { Modal, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { isAllowedPaymentUrl } from "../../domain/paymentUrl";
import { colors } from "../theme";
/**
 * Xendit's Invoice checkout page. What happens here never confirms a
 * booking: the screen behind it re-reads server state after this closes.
 */
export function PaymentWebView({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <View className="flex-row items-center justify-between gap-[12px] border-b border-line bg-surface p-[16px]">
          <Text className="flex-1 text-header font-bold text-primary">Pembayaran (uji coba)</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose} className="min-h-[44px] justify-center rounded-control bg-soft px-[12px]">
            <Text className="text-body font-bold text-primary">Selesai</Text>
          </Pressable>
        </View>
        <WebView
          source={{ uri: url }}
          originWhitelist={["https://*"]}
          onShouldStartLoadWithRequest={(req) => isAllowedPaymentUrl(req.url)}
          javaScriptEnabled
          domStorageEnabled
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </Modal>
  );
}
