import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { canReview, decisionReason, evidenceObject, parseQueue, type Decision, type Status, type Submission, type Target } from "./verification";

export function adminConfig(url?: string, key?: string) {
  if (!url || !key) throw new Error("Konfigurasi Admin belum lengkap. Ikuti README untuk menyiapkan env DEV.");
  if (url !== "https://fhapolumdqqewwhxnjcb.supabase.co") throw new Error("Admin ini hanya boleh terhubung ke project DEV yang disetujui.");
  // Only publicly distributable keys; never accept backend credentials in the web build.
  if (!key.startsWith("sb_publishable_")) {
    try {
      const part = key.split(".")[1];
      const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon") throw new Error();
    } catch { throw new Error("Gunakan publishable key atau anon key DEV, bukan secret/service-role key."); }
  }
  return { url, key };
}
export function createAdminClient(url?: string, key?: string) {
  const config = adminConfig(url, key);
  return createClient(config.url, config.key, { auth: {
    storageKey: "turuid-admin-dev-session", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
  } });
}
export class VerificationRepository {
  constructor(readonly client: SupabaseClient) {}
  async requireAdmin() {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
    const [{ data: role, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
      this.client.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "ADMIN").maybeSingle(),
      this.client.from("profiles").select("status").eq("id", data.user.id).single(),
    ]);
    if (roleError || profileError || !role || profile?.status !== "ACTIVE") throw new Error("Akun ini tidak memiliki akses admin aktif.");
    return data.user.id;
  }
  async list(target: Target, status: Status, page: number) {
    await this.requireAdmin();
    const { data, error } = await this.client.rpc("admin_verification_queue", { kind: target, filter_status: status, page_number: page });
    if (error) {
      if (error.code === "PGRST202") throw new Error("Layanan verifikasi belum diaktifkan di DEV. Hubungi pengelola.");
      throw new Error("Daftar pengajuan gagal dimuat. Coba lagi.");
    }
    return parseQueue(data);
  }
  async evidence(path: string) {
    await this.requireAdmin();
    const { data, error } = await this.client.storage.from("owner-media").createSignedUrl(evidenceObject(path), 300);
    if (error || !data?.signedUrl) throw new Error("Bukti tidak dapat dibuka. Coba muat ulang.");
    return data.signedUrl;
  }
  async decide(submission: Submission, decision: Decision, reason: string) {
    if (!canReview(submission)) throw new Error("Pengajuan ini tidak lagi dapat diproses. Muat ulang daftar.");
    const clean = decisionReason(decision, reason);
    await this.requireAdmin();
    const { data, error } = await this.client.rpc("admin_review_verification", {
      submission_id: submission.id, decision, reason: clean, expected_updated_at: submission.target_updated_at,
    });
    if (error) {
      if (error.code === "PGRST202") throw new Error("Layanan keputusan belum diaktifkan di DEV. Hubungi pengelola.");
      if (error.code === "40001") throw new Error("Data berubah atau sudah diproses admin lain. Muat ulang daftar sebelum memutuskan.");
      throw new Error("Keputusan belum dapat dikonfirmasi. Coba lagi dengan keputusan yang sama atau muat ulang daftar.");
    }
    if (data !== submission.id) throw new Error("Hasil keputusan tidak valid. Muat ulang daftar untuk memeriksa status.");
  }
}
