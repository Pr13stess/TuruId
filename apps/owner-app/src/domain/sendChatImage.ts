// Image-only orchestration. Text continues to use communication.send directly.
export async function sendChatImage(
  upload: () => Promise<string>,
  send: (path: string) => Promise<void>,
  committed: (path: string) => Promise<boolean>,
) {
  const path = await upload();
  try { await send(path); }
  catch (error) { if (!await committed(path)) throw error; }
}
