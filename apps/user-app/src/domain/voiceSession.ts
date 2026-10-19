import type { IRtcEngine } from 'react-native-agora';
import type { CallCredentials } from './repositories/CallRepository';

type Sdk = typeof import('react-native-agora');
type Options = {
  sdk: () => Promise<Sdk>;
  permission: () => Promise<void>;
  token: () => Promise<CallCredentials>;
  status: (text: string) => void;
  failed: (message: string) => void;
};

/** Owns one native engine; late async work must never touch a released engine. */
export function voiceSession(options: Options) {
  let active = true, started = false, renewing = false;
  let engine: IRtcEngine | undefined;
  const check = (code: number) => { if (code < 0) throw new Error(`Perangkat audio gagal (${code}).`); };
  const stop = () => {
    active = false;
    const current = engine;
    engine = undefined;
    if (current) {
      try { current.leaveChannel(); } catch { /* Release must still run after a native disconnect. */ }
      try { current.release(); } catch { /* Already released native object must not crash navigation. */ }
    }
  };
  const fail = (e: unknown) => {
    if (!active) return;
    const text = e instanceof Error ? e.message : 'Panggilan gagal terhubung.';
    try { stop(); } finally { options.failed(text.includes('AgoraRtcNg') ? 'Gunakan development build yang menyertakan Agora, bukan Expo Go.' : text); }
  };
  const renew = async () => {
    if (!active || renewing) return;
    renewing = true;
    try {
      const credentials = await options.token();
      if (active && engine) check(engine.renewToken(credentials.token));
    } catch (e) { fail(e); }
    finally { renewing = false; }
  };
  return {
    async start() {
      if (started || !active) return;
      started = true;
      try {
        const sdk = await options.sdk();
        if (!active) return;
        await options.permission();
        if (!active) return;
        const credentials = await options.token();
        if (!active) return;
        const rtc = sdk.createAgoraRtcEngine();
        engine = rtc;
        check(rtc.initialize({ appId: credentials.appId }));
        rtc.registerEventHandler({
          onJoinChannelSuccess: () => { if (active) options.status('Menunggu audio lawan bicara…'); },
          onUserJoined: () => { if (active) options.status('Suara terhubung'); },
          onUserOffline: () => { if (active) options.status('Menunggu lawan bicara tersambung kembali…'); },
          onConnectionStateChanged: (_connection, state) => {
            if (!active) return;
            if (state === sdk.ConnectionStateType.ConnectionStateFailed) fail(new Error('Koneksi panggilan terputus.'));
            else if (state === sdk.ConnectionStateType.ConnectionStateReconnecting) options.status('Menghubungkan kembali…');
          },
          onError: (code, message) => fail(new Error(`Agora ${code}: ${message || 'Audio gagal.'}`)),
          onTokenPrivilegeWillExpire: () => { void renew(); },
          onRequestToken: () => { void renew(); },
        });
        check(rtc.enableAudio());
        check(rtc.setDefaultAudioRouteToSpeakerphone(false));
        check(rtc.joinChannel(credentials.token, credentials.channel, credentials.uid, {
          channelProfile: sdk.ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: sdk.ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true, publishCameraTrack: false,
          autoSubscribeAudio: true, autoSubscribeVideo: false,
        }));
      } catch (e) { fail(e); }
    },
    stop,
    mute(value: boolean) { if (!active || !engine) return false; try { check(engine.muteLocalAudioStream(value)); return true; } catch (e) { fail(e); return false; } },
    speaker(value: boolean) { if (!active || !engine) return false; try { check(engine.setEnableSpeakerphone(value)); return true; } catch (e) { fail(e); return false; } },
  };
}
