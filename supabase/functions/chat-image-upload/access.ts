import { UploadError } from "./core.ts";

export function requireParticipant(
  sender: string,
  profile: { status: string } | null,
  conversation: { user_id: string | null; owner_id: string | null } | null,
  participant: { user_id: string } | null,
) {
  if (profile?.status !== "ACTIVE") throw new UploadError(403, "Akun tidak aktif.");
  if (!conversation || participant?.user_id !== sender || ![conversation.user_id, conversation.owner_id].includes(sender))
    throw new UploadError(403, "Percakapan tidak dapat diakses.");
}
