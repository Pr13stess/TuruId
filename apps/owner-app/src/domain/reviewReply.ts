export function reviewReplyText(value: string): string {
  const text = value.trim();
  if ([...text].length < 1 || [...text].length > 2000)
    throw new Error("Balasan harus berisi 1–2000 karakter.");
  return text;
}

/** Preserve an uncertain submission; retry must never silently change its body. */
export function createReplySubmission(send: (text: string) => Promise<void>) {
  let body: string | undefined;
  let pending: Promise<void> | undefined;
  return (input: string): Promise<void> => {
    if (pending) return pending;
    body ??= reviewReplyText(input);
    pending = Promise.resolve().then(() => send(body!)).finally(() => { pending = undefined; });
    return pending;
  };
}
