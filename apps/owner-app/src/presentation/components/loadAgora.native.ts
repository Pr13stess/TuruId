import { TurboModuleRegistry } from 'react-native';

// Check before importing Agora: its module initialization can throw in Expo Go
// or an older development build, before our engine lifecycle can catch it.
export async function loadAgora() {
  if (!TurboModuleRegistry.get('AgoraRtcNg')) {
    throw new Error('Agora belum tersedia di aplikasi ini. Build dan install ulang aplikasi dengan Agora; reload saja tidak cukup. Jangan gunakan Expo Go.');
  }
  return import('react-native-agora');
}
