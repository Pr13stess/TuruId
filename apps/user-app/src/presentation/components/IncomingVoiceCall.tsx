import { Text, View } from 'react-native';
import { Button } from './Primitives';
import { useVoiceCalls } from '../hooks/useVoiceCalls';
import { colors } from '../theme';

export function IncomingVoiceCall({ userId, onOpen }: { userId: string; onOpen: (id: string) => void }) {
  const { data } = useVoiceCalls();
  const incoming = data?.find(c => c.call_type === 'VOICE' && c.status === 'RINGING' && c.receiver_id === userId);
  if (!incoming) return null;
  return <View style={{ padding: 16, paddingTop: 32, gap: 8, backgroundColor: colors.background }}>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.primary, fontWeight: '700' }}>Panggilan suara masuk</Text>
    <Button title="Lihat panggilan" onPress={() => onOpen(incoming.id)} />
  </View>;
}
