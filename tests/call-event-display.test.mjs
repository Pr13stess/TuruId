import test from "node:test";
import assert from "node:assert/strict";
import { callEventDisplay as user } from "../apps/user-app/src/domain/callEventDisplay.ts";
import { callEventDisplay as owner } from "../apps/owner-app/src/domain/callEventDisplay.ts";

for (const [name, display] of [["User", user], ["Owner", owner]]) {
  test(`${name}: old call events get localized status and hide unconnected duration`, () => {
    assert.equal(display("Panggilan VOICE • CANCELLED • 0 detik").detail, "Dibatalkan");
    assert.equal(display("Panggilan VOICE • MISSED • 0 detik").detail, "Tidak terjawab");
    assert.equal(display("Panggilan suara • DECLINED (demo)").detail, "Ditolak · Demo");
    const completed = display("Panggilan VIDEO • COMPLETED • 125 detik");
    assert.equal(completed.title, "Panggilan video");
    assert.equal(completed.detail, "Selesai · 2 menit 5 detik");
    assert.equal(display("Panggilan VOICE • COMPLETED • 0 detik").detail, "Selesai");
  });
  test(`${name}: unknown historical content is preserved`, () => {
    assert.equal(display("Catatan lama").detail, "Catatan lama");
    assert.equal(display(null).title, "Panggilan");
  });
}
