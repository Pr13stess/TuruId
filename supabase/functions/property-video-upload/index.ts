import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { env } from "../_shared/http.ts";
import { digest, inspectMp4, isMissingVideo, MAX_VIDEO_BYTES, storeVideo, VideoError, type VideoMetadata } from "./core.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST diperlukan." }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) throw new VideoError(401, "Sesi tidak valid.");
    const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: who, error: authError } = await client.auth.getUser();
    if (authError || !who.user) throw new VideoError(401, "Sesi tidak valid.");
    const [{ data: profile }, { data: role }] = await Promise.all([
      client.from("profiles").select("status").eq("id", who.user.id).single(),
      client.from("user_roles").select("role").eq("user_id", who.user.id).eq("role", "OWNER").maybeSingle(),
    ]);
    if (profile?.status !== "ACTIVE" || !role) throw new VideoError(403, "Hanya owner aktif yang dapat mengunggah video kos.");
    if (!req.body || !req.headers.get("content-type")?.startsWith("multipart/form-data")) throw new VideoError(400, "Format unggahan tidak valid.");
    let total = 0;
    const limited = req.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.length;
        if (total > MAX_VIDEO_BYTES + 64 * 1024) throw new VideoError(413, "Ukuran video maksimal 50 MB.");
        controller.enqueue(chunk);
      },
    }));
    const form = await new Response(limited, { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
    const id = form.get("upload_id"), file = form.get("file");
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !(file instanceof File))
      throw new VideoError(400, "Identitas atau berkas unggahan tidak valid.");
    if (file.size > MAX_VIDEO_BYTES) throw new VideoError(413, "Ukuran video maksimal 50 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = inspectMp4(bytes, file.type);
    const meta: VideoMetadata = { path: `property-videos/${who.user.id}/${id}.mp4`, owner_id: who.user.id, sha256: await digest(bytes), byte_size: info.size, duration_seconds: info.duration };
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const objectName = (path: string) => path.slice("property-videos/".length);
    const result = await storeVideo({
      async metadata(path) {
        const { data, error } = await admin.from("property_video_uploads").select("*").eq("path", path).maybeSingle();
        if (error) throw error;
        return data as VideoMetadata | null;
      },
      async reserve(value) {
        const { error } = await admin.from("property_video_uploads").insert(value);
        if (error) throw error;
      },
      async download(path) {
        const { data, error } = await admin.storage.from("property-videos").download(objectName(path));
        if (error) {
          if (isMissingVideo(error as { statusCode?: string; code?: string })) return null;
          throw error;
        }
        return new Uint8Array(await data.arrayBuffer());
      },
      async upload(path, value) {
        const { error } = await admin.storage.from("property-videos").upload(objectName(path), value, { contentType: "video/mp4", upsert: false });
        if (error) throw error;
      },
    }, meta, bytes);
    return reply(result);
  } catch (error) {
    return error instanceof VideoError ? reply({ error: error.message }, error.status) : reply({ error: "Video belum berhasil diunggah. Coba lagi." }, 503);
  }
});
