import { useEffect, useRef } from "react";

export function PropertyMapSurface({ html, onEvent }: { html: string; onEvent: (raw: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && typeof event.data === "string") onEvent(event.data);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onEvent]);
  return <iframe ref={frame} title="Pilih lokasi kos di OpenStreetMap" srcDoc={html}
    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
    style={{ width: "100%", height: "100%", border: 0, flex: 1 }} />;
}
