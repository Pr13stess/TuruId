import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useRepositories } from '../../application/RepositoriesProvider';
import { chooseImage } from '../media';
import { ProfileButton } from './ProfileUi';
import { colors } from '../theme';

export function ProfilePhotoEditor() {
  const { profile, refresh } = useRepositories();
  const [draft, setDraft] = useState<Awaited<ReturnType<typeof chooseImage>>>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const run = async (save: boolean) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (save && draft) {
        await profile.uploadAvatar(draft);
        setDraft(null); refresh(); setNotice('Foto profil berhasil diperbarui.');
      } else {
        const selected = await chooseImage();
        if (selected) setDraft(selected);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Foto belum berhasil diperbarui.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    {draft && <Image source={{ uri: `data:${draft.mime};base64,${draft.base64}` }} style={{ width: 100, height: 100, borderRadius: 50, alignSelf: 'center' }} accessibilityLabel="Pratinjau foto profil baru" />}
    <ProfileButton title={draft ? 'Pilih foto lain' : 'Ubah foto profil'} variant="outline" busy={busy} onPress={() => void run(false)} />
    {draft && <>
      <ProfileButton title="Simpan foto" busy={busy} onPress={() => void run(true)} />
      <ProfileButton title="Batal" variant="outline" busy={busy} onPress={() => { setDraft(null); setError(''); }} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={{ color: colors.green }}>{notice}</Text>}
  </View>;
}
