import { Text, View } from 'react-native';
import { colors } from '../theme';

export function OwnerReviewReply({ text, preview = false }: { text?: string | null; preview?: boolean }) {
  if (!text) return null;
  return <View style={{ padding: 12, gap: 6, backgroundColor: colors.soft, borderRadius: 10 }}>
    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Balasan pemilik</Text>
    <Text numberOfLines={preview ? 2 : undefined} style={{ color: colors.ink, fontSize: 13, lineHeight: 20 }}>{text}</Text>
  </View>;
}
