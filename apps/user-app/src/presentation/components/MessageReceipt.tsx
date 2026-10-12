import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export function MessageReceipt({ read, sentColor }: { read: boolean; sentColor: string }) {
  return <View accessible accessibilityLabel={read ? 'Sudah dibaca' : 'Terkirim'}>
    <Ionicons name={read ? 'checkmark-done' : 'checkmark'} size={16} color={read ? '#38BDF8' : sentColor} />
  </View>;
}
