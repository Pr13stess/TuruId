import type { Property, Room, Verification } from "./models";

export function publicationReadiness(property: Property, ownerVerification: Verification, rooms: Room[], hasActivePlan: boolean): string[] {
  const issues: string[] = [];
  if (ownerVerification !== "APPROVED") issues.push("Verifikasi owner belum disetujui.");
  if (property.verification_status !== "APPROVED") issues.push("Verifikasi kos belum disetujui.");
  if (property.publication_status !== "ACTIVE") issues.push("Status tayang kos belum aktif.");
  if (!rooms.some(room => room.is_active)) issues.push("Belum ada tipe kamar aktif.");
  else if (!hasActivePlan) issues.push("Belum ada paket sewa aktif pada tipe kamar aktif.");
  return issues;
}
