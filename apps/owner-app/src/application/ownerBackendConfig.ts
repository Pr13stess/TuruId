/** Runtime must never fall back to a shared local demo identity. */
export function requireOwnerBackendConfig(
  backendUrl: string | undefined,
  publishableKey: string | undefined,
  anonKey?: string,
): { url: string; key: string } {
  const url = backendUrl?.trim();
  const key = publishableKey?.trim() || anonKey?.trim();
  if (!url || !key) {
    throw new Error(
      "Konfigurasi login belum lengkap. Isi EXPO_PUBLIC_SUPABASE_URL dan public key Supabase pada environment aplikasi, lalu mulai ulang Expo atau build ulang APK. Akun demo otomatis sudah dinonaktifkan.",
    );
  }
  return { url, key };
}
