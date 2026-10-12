export type Target = "OWNER" | "PROPERTY";
export type Status = "PENDING" | "APPROVED" | "REJECTED";
export type Decision = Exclude<Status, "PENDING">;
export type Submission = {
  id: string; target_type: Target; status: Status; name: string;
  owner_name: string; address: string; city: string; description: string;
  evidence_path: string; submitted_at: string; reviewed_at: string | null;
  review_reason: string | null; target_updated_at: string;
  current_status: string; owner_status: string; publication_status: string | null;
  is_latest: boolean;
};
export type Queue = { items: Submission[]; total: number };
export const statusLabel: Record<string, string> = {
  PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak", DRAFT: "Draf",
  ACTIVE: "Aktif", INACTIVE: "Nonaktif", SUSPENDED: "Ditangguhkan", ARCHIVED: "Diarsipkan",
};
export function decisionReason(decision: Decision, reason: string) {
  if (decision !== "APPROVED" && decision !== "REJECTED") throw new Error("Keputusan tidak valid.");
  const clean = reason.trim();
  if (clean.length > 2000) throw new Error("Catatan maksimal 2.000 karakter.");
  if (decision === "REJECTED" && clean.length < 5) throw new Error("Tuliskan alasan penolakan minimal 5 karakter.");
  return clean;
}
export const canReview = (s: Submission) => s.status === "PENDING" && s.current_status === "PENDING" && s.is_latest;
export function evidenceObject(path: string) {
  if (!/^owner-media\/[0-9a-f-]{36}\/verification\/[0-9a-f-]{36}\.(jpg|jpeg|png)$/i.test(path))
    throw new Error("Format bukti belum didukung. Jangan mengambil keputusan sebelum bukti dapat diperiksa.");
  return path.slice("owner-media/".length);
}
export function parseQueue(value: unknown): Queue {
  if (!value || typeof value !== "object") throw new Error("Data pengajuan tidak valid.");
  const v = value as Queue;
  if (!Number.isInteger(v.total) || v.total < 0 || !Array.isArray(v.items) || v.items.some(s =>
    !s || typeof s.id !== "string" || !["OWNER", "PROPERTY"].includes(s.target_type) ||
    !["PENDING", "APPROVED", "REJECTED"].includes(s.status) || typeof s.evidence_path !== "string" ||
    [s.name,s.owner_name,s.address,s.city,s.description,s.submitted_at,s.target_updated_at,s.current_status,s.owner_status].some(field => typeof field !== "string") ||
    [s.reviewed_at,s.review_reason,s.publication_status].some(field => field !== null && typeof field !== "string") || typeof s.is_latest !== "boolean"))
    throw new Error("Data pengajuan tidak valid.");
  return v;
}
