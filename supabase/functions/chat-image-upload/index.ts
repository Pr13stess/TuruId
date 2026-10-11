import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { Jimp } from "npm:jimp@1.6.0";
import { env } from "../_shared/http.ts";
import { parseInput, readBody, storeImage, UploadError, validateImage } from "./core.ts";
import { jpegCodec } from "./codec.ts";
import { uploadStore } from "./store.ts";
import { requireParticipant } from "./access.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return response({ error: "POST diperlukan." }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) throw new UploadError(401, "Sesi tidak valid.");
    const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: who, error: authError } = await client.auth.getUser();
    if (authError || !who.user) throw new UploadError(401, "Sesi tidak valid.");
    const input = parseInput(await readBody(req));
    const { data: profile, error: profileError } = await client.from("profiles").select("status").eq("id", who.user.id).single();
    if (profileError || profile?.status !== "ACTIVE") throw new UploadError(403, "Akun tidak aktif.");
    const { data: conversation, error: conversationError } = await client.from("conversations").select("user_id,owner_id").eq("id", input.conversation_id).single();
    const { data: participant, error: participantError } = await client.from("conversation_participants").select("user_id").eq("conversation_id", input.conversation_id).eq("user_id", who.user.id).maybeSingle();
    if (conversationError || participantError)
      throw new UploadError(403, "Percakapan tidak dapat diakses.");
    requireParticipant(who.user.id, profile, conversation, participant);
    const clean = await validateImage(input, jpegCodec(bytes => Jimp.read(bytes.buffer as ArrayBuffer)));
    // Only after JWT, active profile, participation and image validation succeed.
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    return response(await storeImage(uploadStore(admin), who.user.id, input, clean));
  } catch (error) {
    return error instanceof UploadError ? response({ error: error.message }, error.status) : response({ error: "Unggahan belum berhasil. Coba lagi." }, 503);
  }
});
