import React, { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform, View } from "react-native";
import type { IRtcEngine } from "react-native-agora";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Button, C, Card, Feedback, Row, T } from "./UI";
import { CallMediaProps } from "./CallMedia.types";
import { radius } from "../theme";
import { loadAgora } from './loadAgora.native';
export default function CallMedia({ callId, video, onError }: CallMediaProps) {
  const { communication } = useRepositories();
  const engine = useRef<IRtcEngine | null>(null);
  const [sdk, setSdk] = useState<typeof import("react-native-agora") | null>(
    null,
  );
  const Surface = sdk?.RtcSurfaceView;
  const [remote, setRemote] = useState(0);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(video);
  const [speaker, setSpeaker] = useState(video);
  useEffect(() => {
    let active = true;
    let failed = false;
    let renewing = false;
    let rtc: IRtcEngine | undefined;
    const fail = (message: string) => {
      if (active && !failed) {
        failed = true;
        if (message.includes("AgoraRtcNg"))
          message =
            "Panggilan asli memerlukan Expo Development Build yang menyertakan Agora.";
        setError(message);
        onError?.(message);
        void communication.updateCall(callId, "fail").catch(() => {});
      }
    };
    void (async () => {
      const Agora = await loadAgora();
      if (!active) return;
      setSdk(Agora);
      if (Platform.OS === "android") {
        const required = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ...(video ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
        ];
        const results = await PermissionsAndroid.requestMultiple(required);
        if (
          required.some(
            (p) => results[p] !== PermissionsAndroid.RESULTS.GRANTED,
          )
        )
          throw new Error(
            "Izin kamera/mikrofon ditolak. Coba panggilan suara atau ubah izin perangkat.",
          );
      } else {
        const Audio = await import("expo-audio");
        if (!(await Audio.requestRecordingPermissionsAsync()).granted)
          throw new Error("Izin mikrofon ditolak.");
        if (video) {
          const Picker = await import("expo-image-picker");
          if (!(await Picker.requestCameraPermissionsAsync()).granted)
            throw new Error("Izin kamera ditolak. Gunakan panggilan suara.");
        }
      }
      if (!active) return;
      const credentials = await communication.token(callId);
      if (!active) return;
      rtc = Agora.createAgoraRtcEngine();
      engine.current = rtc;
      rtc.initialize({ appId: credentials.appId });
      const renew = async () => {
        if (!active || failed || renewing) return;
        renewing = true;
        try {
          const c = await communication.token(callId);
          if (active && !failed && rtc) {
            const result = rtc.renewToken(c.token);
            if (result < 0) fail('Token panggilan gagal diperbarui.');
          }
        } catch (e) { fail(e instanceof Error ? e.message : 'Token gagal diperbarui.'); }
        finally { renewing = false; }
      };
      rtc.registerEventHandler({
        onJoinChannelSuccess: () => {
          if (active) setJoined(true);
        },
        onUserJoined: (_connection, uid) => {
          if (active) setRemote(uid);
        },
        onUserOffline: () => {
          if (active) setRemote(0);
        },
        onError: (code, message) =>
          fail(`Agora ${code}: ${message || "Gagal terhubung."}`),
        onConnectionStateChanged: (_connection, state) => {
          if (state === Agora.ConnectionStateType.ConnectionStateFailed)
            fail("Jaringan panggilan terputus.");
        },
        onTokenPrivilegeWillExpire: () => {
          void renew();
        },
        onRequestToken: () => { void renew(); },
      });
      rtc.enableAudio();
      rtc.setDefaultAudioRouteToSpeakerphone(video);
      if (video) {
        rtc.enableVideo();
        rtc.startPreview();
      }
      const result = rtc.joinChannel(
        credentials.token,
        credentials.channel,
        credentials.uid,
        {
          channelProfile: Agora.ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: Agora.ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: video,
          autoSubscribeAudio: true,
          autoSubscribeVideo: video,
        },
      );
      if (result < 0) throw new Error(`Gagal masuk channel (${result}).`);
    })().catch((e) => fail(e.message));
    return () => {
      active = false;
      try {
        rtc?.leaveChannel();
        if (video) rtc?.stopPreview();
      } finally { rtc?.release(); rtc = undefined; }
      engine.current = null;
    };
  }, [communication, callId, video, onError]);
  return (
    <>
      <View
        style={{
          height: video ? 340 : 180,
          borderRadius: radius.card,
          overflow: "hidden",
          backgroundColor: C.navy,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {video && Surface && remote > 0 ? (
          <Surface
            style={{ width: "100%", height: "100%" }}
            canvas={{ uid: remote }}
          />
        ) : (
          <T style={{ color: C.white }}>
            {joined
              ? remote
                ? "Panggilan suara terhubung"
                : "Menunggu media lawan bicara…"
              : "Menghubungkan…"}
          </T>
        )}
        {video && camera && Surface && (
          <Surface
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              width: 95,
              height: 130,
            }}
            canvas={{ uid: 0 }}
            zOrderMediaOverlay
          />
        )}
      </View>
      <Feedback text={error} error />
      <Card>
        <Row style={{ flexWrap: "wrap" }}>
          <Button
            title={muted ? "Aktifkan mic" : "Matikan mic"}
            disabled={!joined || !!error}
            secondary
            onPress={() => {
              engine.current?.muteLocalAudioStream(!muted);
              setMuted(!muted);
            }}
          />
          <Button
            title={speaker ? "Gunakan earpiece" : "Gunakan speaker"}
            disabled={!joined || !!error}
            secondary
            onPress={() => {
              engine.current?.setEnableSpeakerphone(!speaker);
              setSpeaker(!speaker);
            }}
          />
        </Row>
        {video && (
          <Row style={{ flexWrap: "wrap" }}>
            <Button
              title={camera ? "Matikan kamera" : "Aktifkan kamera"}
              secondary
              onPress={() => {
                engine.current?.muteLocalVideoStream(camera);
                setCamera(!camera);
              }}
            />
            <Button
              title="Putar kamera"
              secondary
              onPress={() => engine.current?.switchCamera()}
            />
          </Row>
        )}
      </Card>
    </>
  );
}
