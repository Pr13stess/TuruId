import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export function CallButton({ icon, label, onPress, selected = false, tone = 'neutral', disabled = false }: {
  icon: 'mic' | 'mic-off' | 'volume-high' | 'ear' | 'call' | 'close' | 'refresh';
  label: string; onPress: () => void; selected?: boolean; tone?: 'neutral' | 'accept' | 'end'; disabled?: boolean;
}) {
  const strong = selected || tone !== 'neutral';
  const backgroundColor = tone === 'end' ? '#D94343' : tone === 'accept' ? '#29845E' : selected ? ACCENT : colors.soft;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [s.action, (disabled || pressed) && { opacity: 0.45 }]}>
    <View style={[s.circle, { backgroundColor }]}>
      <Ionicons name={icon} size={27} color={strong ? '#fff' : colors.primary}
        style={tone === 'end' && icon === 'call' ? { transform: [{ rotate: '135deg' }] } : undefined} />
    </View>
    <Text style={s.actionLabel}>{label}</Text>
  </Pressable>;
}
export function CallControls({ children }: { children: ReactNode }) {
  return <View style={s.controls}>{children}</View>;
}
export function CallNotice({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="alert" style={s.notice}>{children}</Text>;
}
export function CallLayout({ name, status, onBack, children, video = false }: {
  name: string; status: string; onBack: () => void; children: ReactNode; video?: boolean;
}) {
  return <SafeAreaView style={s.root}>
    <View style={s.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali dan tutup panggilan" style={s.back}>
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </Pressable>
      <Text style={s.brand}>Turu.Id</Text>
      <View style={s.back} />
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.identity}>
        <View style={s.kind}><Ionicons name={video ? 'videocam-outline' : 'call-outline'} size={15} color={ACCENT} />
          <Text style={s.kindText}>{video ? 'PANGGILAN VIDEO' : 'PANGGILAN SUARA'}</Text></View>
        <View style={s.halo}><View style={s.avatar}>
          <Text style={s.initial}>{name.trim().split(/\s+/).slice(0,2).map(n => n[0]?.toUpperCase()).join('') || '?'}</Text>
        </View></View>
        <Text style={s.name} numberOfLines={2}>{name}</Text>
        <Text style={s.status} accessibilityLiveRegion="polite">{status}</Text>
      </View>
      <View style={s.panel}>{children}</View>
      <Text style={s.footnote}>Tetap buka aplikasi selama panggilan</Text>
    </ScrollView>
  </SafeAreaView>;
}
const ACCENT = colors.orange;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  brand: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 20, gap: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  identity: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32, gap: 16, minHeight: 300 },
  kind: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 14 },
  kindText: { fontSize: 11, letterSpacing: 1.6, fontWeight: '700', color: ACCENT },
  halo: { padding: 10, borderRadius: 90, borderWidth: 1, borderColor: colors.line },
  avatar: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  initial: { color: '#fff', fontSize: 42, fontWeight: '600' },
  name: { fontSize: 27, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  status: { fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  panel: { backgroundColor: colors.surface, borderRadius: 28, paddingVertical: 24, paddingHorizontal: 12, gap: 20, borderWidth: 1, borderColor: colors.line },
  controls: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-evenly', gap: 12, flexWrap: 'wrap' },
  action: { alignItems: 'center', gap: 9, width: 92, minHeight: 92 },
  circle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.primary, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  notice: { color: colors.danger, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 },
  footnote: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
