import React, { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Props } from "../navigation";
import { useAction, useLoad } from "../hooks";
import CallMedia from "../components/CallMedia";
import { Load, T, Toggle } from "../components/UI";
import { CallButton, CallControls, CallLayout, CallNotice } from "../components/CallUi";
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
  const contacts = useLoad(useCallback(() => communication.conversations(), [communication]), 0, true);
  const [speaker, setSpeaker] = useState(false);
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
  const name = contacts.data?.find(c => c.id === call?.conversation_id)?.tenant || "Penghuni";
  const incoming = call?.status === "RINGING" && !backgroundEnded && (call.receiver_id === session?.id || mode === "demo");
  const status = backgroundEnded ? "Panggilan dihentikan saat aplikasi masuk latar belakang."
    : incoming ? "Panggilan suara masuk" : !call ? q.data ? "Panggilan tidak ditemukan." : "Memuat panggilan…"
    : ({ RINGING: "Menunggu jawaban…", CONNECTED: "Panggilan berlangsung", COMPLETED: "Panggilan selesai",
      MISSED: "Tidak terjawab", DECLINED: "Panggilan ditolak", CANCELLED: "Panggilan dibatalkan", FAILED: "Panggilan terputus" }[call.status]);
  const act = (action: "accept" | "decline" | "end") => {
    if (call) void a.run(() => communication.updateCall(call.id, action));
  };
  return <CallLayout name={name} status={status} video={call?.call_type === "VIDEO"} onBack={() => navigation.goBack()}>
    <Load {...q} loading={q.loading && !q.data} />
    {mode === "demo" && <T muted style={{ textAlign: "center" }}>Simulasi tampilan · Tidak mengirim audio</T>}
    {call?.status === "CONNECTED" && !mediaError && !backgroundEnded && (mode === "demo"
      ? <>
          <CallControls>
            <CallButton icon={muted ? "mic-off" : "mic"} label={muted ? "Aktifkan mic" : "Bisukan"} selected={muted} onPress={() => setMuted(!muted)} />
            <CallButton icon={speaker ? "volume-high" : "ear"} label="Speaker" selected={speaker} onPress={() => setSpeaker(!speaker)} />
          </CallControls>
          {call.call_type === "VIDEO" && <Toggle label="Kamera demo" value={video} onChange={setVideo} />}
        </>
      : <CallMedia callId={call.id} video={call.call_type === "VIDEO"} onError={setMediaError} />)}
    <CallControls>
      {incoming ? <>
        <CallButton icon="call" label="Tolak" tone="end" disabled={a.busy} onPress={() => act("decline")} />
        <CallButton icon="call" label={mode === "demo" ? "Simulasi terima" : "Terima"} tone="accept" disabled={a.busy} onPress={() => act("accept")} />
      </> : call && ["RINGING", "CONNECTED"].includes(call.status) && !backgroundEnded
        ? <CallButton icon="call" label={call.status === "RINGING" ? "Batalkan" : "Akhiri"} tone="end" disabled={a.busy} onPress={() => act("end")} />
        : <CallButton icon="close" label="Tutup" onPress={() => navigation.goBack()} />}
    </CallControls>
    {!!(a.error || mediaError) && <CallNotice>{mediaError || a.error}</CallNotice>}
  </CallLayout>;
}
