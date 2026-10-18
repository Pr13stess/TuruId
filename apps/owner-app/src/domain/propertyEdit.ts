import type { PropertyInput } from "./models";

/** Keep an uncertain request intact until the server confirms it. */
export function createPropertyEditSubmission(
  send: (input: PropertyInput, requestId: string, evidence?: string) => Promise<string>,
  newId: () => string,
) {
  let attempt: { input: PropertyInput; id: string; evidence?: string } | undefined;
  let running: Promise<string> | undefined;
  return {
    get pending() { return !!attempt; },
    submit(prepare: () => Promise<PropertyInput>, evidence?: string): Promise<string> {
      if (running) return running;
      running = (async () => {
        if (!attempt) {
          const input = await prepare();
          attempt = { input: JSON.parse(JSON.stringify(input)) as PropertyInput, id: newId(), evidence };
        }
        const result = await send(attempt.input, attempt.id, attempt.evidence);
        if (result !== attempt.input.id) throw new Error("Hasil simpan belum dapat dikonfirmasi. Coba lagi.");
        attempt = undefined;
        return result;
      })().finally(() => { running = undefined; });
      return running;
    },
  };
}
