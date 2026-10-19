import React, { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Props } from "../navigation";
import { useAction, useLoad } from "../hooks";
import CallMedia from "../components/CallMedia";
import {
  Badge,
  Button,
  C,
  Card,
  Feedback,
  Load,
  Page,
  T,
  Title,
  Toggle,
} from "../components/UI";
export function CallScreen(props: Props<"Call">) {
  return <CallContent key={props.route.params.id} {...props} />;
}
function CallContent({ route, navigation }: Props<"Call">) {
  const { communication, session, mode } = useRepositories();
  const a = useAction();
  const q = useLoad(
    useCallback(() => communication.calls(), [communication]),
    3000,
    true,
  );
  const call = q.data?.find((c) => c.id === route.params.id);
  const [muted, setMuted] = useState(false);
  const [video, setVideo] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [backgroundEnded, setBackgroundEnded] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        setBackgroundEnded(true);
        void communication.updateCall(route.params.id, 'end').catch(() => {});
      }
    });
    return () => sub.remove();
  }, [communication, route.params.id]);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", () => {
        void communication.updateCall(route.params.id, "end").catch(() => {});
      }),
    [navigation, communication, route.params.id],
  );
  useEffect(() => {
    if (call?.status !== "CONNECTED" || backgroundEnded || mediaError) return;
    const timer = setInterval(() => {
      void communication.heartbeat(route.params.id).catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [communication, route.params.id, call?.status, backgroundEnded, mediaError]);
  return (
    <Page title="Panggilan survei">
      <Load {...q} loading={q.loading && !q.data} />
      {call && (
        <>
          <Badge tone="navy">
            {call.call_type === "VIDEO" ? "PANGGILAN VIDEO" : "PANGGILAN SUARA"}
          </Badge>
          <Title>
            {backgroundEnded ? "Panggilan dihentikan saat aplikasi masuk latar belakang." : call.status === "RINGING"
              ? call.receiver_id === session?.id ? "Panggilan masuk" : "Menunggu jawaban…"
              : call.status === "CONNECTED"
                ? "Panggilan berlangsung"
                : ({ COMPLETED: 'Panggilan selesai', MISSED: 'Tidak terjawab', DECLINED: 'Panggilan ditolak', CANCELLED: 'Panggilan dibatalkan', FAILED: 'Panggilan terputus' }[call.status])}
          </Title>
          {mode === "demo" ? (
            <Card
              style={{
                backgroundColor: C.navy,
                minHeight: 210,
                justifyContent: "center",
              }}
            >
              <T style={{ color: C.white, textAlign: "center", fontSize: 23 }}>
                ◎
              </T>
              <T style={{ color: C.white, textAlign: "center" }}>
                Simulasi panggilan
              </T>
              <T
                style={{ color: "#C8C9D5", textAlign: "center", fontSize: 13 }}
              >
                Tidak mengirim audio/video atau menghubungi orang lain.
              </T>
            </Card>
          ) : (
            call.status === "CONNECTED" && !mediaError && !backgroundEnded && (
              <CallMedia
                callId={call.id}
                video={call.call_type === "VIDEO"}
                onError={setMediaError}
              />
            )
          )}
          {call.status === "RINGING" && !backgroundEnded &&
            (call.receiver_id === session?.id || mode === "demo") && (
              <>
                <Button
                  title={
                    mode === "demo"
                      ? "Simulasikan lawan bicara menerima"
                      : "Terima panggilan"
                  }
                  disabled={a.busy}
                  onPress={() =>
                    void a.run(() =>
                      communication.updateCall(call.id, "accept"),
                    )
                  }
                />
                <Button
                  title="Tolak"
                  secondary
                  disabled={a.busy}
                  onPress={() =>
                    void a.run(() =>
                      communication.updateCall(call.id, "decline"),
                    )
                  }
                />
              </>
            )}
          {mode === "demo" && call.status === "CONNECTED" && (
            <Card>
              <Toggle
                label="Mikrofon demo"
                value={!muted}
                onChange={(v) => setMuted(!v)}
              />
              {call.call_type === "VIDEO" && (
                <Toggle label="Kamera demo" value={video} onChange={setVideo} />
              )}
            </Card>
          )}
          {["RINGING", "CONNECTED"].includes(call.status) && (
            <Button
              title="Akhiri panggilan"
              danger
              disabled={a.busy}
              onPress={() =>
                void a.run(() => communication.updateCall(call.id, "end"))
              }
            />
          )}
          <T muted style={{ fontSize: 13 }}>
            Panggilan tidak direkam. Catatan pribadi pencari kos tetap privat
            dan tidak ditampilkan kepada owner.
            {' '}Untuk tahap ini, kedua aplikasi harus tetap terbuka.
          </T>
        </>
      )}
      <Feedback text={a.error} error />
      <Feedback text={mediaError} error />
      {q.data && !call && (
        <T>Panggilan tidak ditemukan atau tidak dapat diakses.</T>
      )}
    </Page>
  );
}
