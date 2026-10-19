import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { requireOwnerBackendConfig } from "../src/application/ownerBackendConfig.ts";
import { SupabaseAuthRepository } from "../src/data/supabase/Repositories.ts";

test("missing or partial backend configuration cannot select a demo account", () => {
  for (const args of [[], ["", ""], ["https://example.test"], [undefined, "public-test-key"], ["  ", "public-test-key"]]) {
    assert.throws(() => requireOwnerBackendConfig(...args), /Konfigurasi login belum lengkap/);
  }
});

test("configured app uses its public key and supports legacy anon configuration", () => {
  assert.deepEqual(requireOwnerBackendConfig(" https://example.test ", " public-test-key ", "legacy"), {
    url: "https://example.test", key: "public-test-key",
  });
  assert.equal(requireOwnerBackendConfig("https://example.test", " ", "legacy").key, "legacy");
});

test("runtime provider cannot instantiate demo repositories", () => {
  const source = readFileSync(new URL("../src/application/RepositoriesProvider.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data\/mock|new Mock|mode:\s*["']demo["']\s*,/);
  assert.match(source, /requireOwnerBackendConfig\(/);
});

test("auth returns no identity without a session and preserves each signed-in identity", async () => {
  let session = null;
  const repository = new SupabaseAuthRepository({
    auth: { getSession: async () => ({ data: { session }, error: null }) },
  }, "test-installation");
  assert.equal(await repository.session(), null);
  for (const id of ["owner-one", "owner-two"]) {
    session = { user: { id, email: `${id}@example.test` } };
    assert.deepEqual(await repository.session(), session.user);
  }
  session = null;
  assert.equal(await repository.session(), null);
});
