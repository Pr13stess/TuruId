import { Linking } from "react-native";
import { WebView } from "react-native-webview";

export function PropertyMapSurface({ html, onEvent }: { html: string; onEvent: (raw: string) => void }) {
  const failed = () => onEvent('{"type":"error"}');
  return <WebView source={{ html, baseUrl: "https://turuid.local/" }} style={{ flex: 1 }}
    applicationNameForUserAgent="TuruIdOwner/0.1" cacheEnabled
    originWhitelist={["*"]} javaScriptEnabled allowFileAccess={false} mixedContentMode="never"
    onMessage={event => onEvent(event.nativeEvent.data)} onError={failed} onHttpError={failed}
    onContentProcessDidTerminate={failed} onRenderProcessGone={failed}
    onShouldStartLoadWithRequest={request => {
      if (request.url === "about:blank" || request.url === "https://turuid.local/") return true;
      if (request.url === "https://www.openstreetmap.org/copyright") void Linking.openURL(request.url).catch(() => {});
      return false;
    }}
    onOpenWindow={({ nativeEvent }) => {
      if (nativeEvent.targetUrl === "https://www.openstreetmap.org/copyright") void Linking.openURL(nativeEvent.targetUrl).catch(() => {});
    }} />;
}
