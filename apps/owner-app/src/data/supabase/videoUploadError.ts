/** Distinguish transport/gateway failures from a validated Function rejection. */
export async function videoUploadError(error: { name?: string; context?: Response }): Promise<string> {
  if (error.name === "FunctionsFetchError")
    return "Video belum terkirim ke server. Periksa koneksi dan akses file video, lalu coba unggah sisanya. (VIDEO_NETWORK)";
  const response = error.context;
  const status = response?.status;
  let detail = "";
  try {
    const body = await response?.clone().json();
    // Function-authored messages, not raw HTML or gateway internals.
    if (typeof body?.error === "string") detail = body.error.slice(0, 250);
  } catch { /* Non-JSON gateway responses still retain their HTTP status. */ }
  if (!detail) {
    if (status === 401) detail = "Sesi unggah ditolak. Masuk ulang lalu coba lagi.";
    else if (status === 403) detail = "Akun tidak mendapat izin mengunggah video.";
    else if (status === 404) detail = "Layanan upload video tidak ditemukan pada server aplikasi.";
    else if (status === 413) detail = "Server menolak ukuran unggahan video.";
    else if (status === 546) detail = "Layanan video mencapai batas pemrosesan server.";
    else if (status === 504) detail = "Waktu pemrosesan video di server habis. Coba unggah sisanya.";
    else detail = "Layanan video belum berhasil memproses unggahan. Coba unggah sisanya.";
  }
  return `${detail} (${status ? `HTTP ${status}` : "VIDEO_RESPONSE"})`;
}
