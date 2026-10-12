import type { SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

export function avatarBytes(base64: string, mime: string): ArrayBuffer {
  if (mime !== 'image/jpeg' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error('Foto harus berupa JPEG yang valid.');
  if (base64.length > Math.ceil(5 * 1024 * 1024 / 3) * 4) throw new Error('Ukuran foto maksimal 5 MB.');
  const body = decode(base64);
  const bytes = new Uint8Array(body);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB.');
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error('Foto JPEG tidak valid.');
  return body;
}

export async function uploadProfileAvatar(client: SupabaseClient, input: { base64: string; mime: string }, uploadId: string) {
  const body = avatarBytes(input.base64, input.mime);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Silakan masuk kembali.');
  const path = `${data.user.id}/${uploadId}.jpg`;
  const { error: uploadError } = await client.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error('Foto gagal diunggah. Coba lagi.');
  const { data: saved, error: saveError } = await client.from('profiles').update({ avatar_path: path }).eq('id', data.user.id).select('id');
  // Keep all Storage objects, including an unreferenced upload after a failed save.
  if (saveError || !saved?.length) throw new Error('Foto sudah diunggah, tetapi profil belum tersimpan. Coba lagi.');
}
