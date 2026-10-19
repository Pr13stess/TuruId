import test from "node:test";
import assert from "node:assert/strict";
import { currentLocation } from "../src/domain/currentLocation.ts";
import { initialMapState, receiveMapEvent, canConfirmLocation } from "../src/domain/propertyLocation.ts";

const device = (overrides = {}) => ({
  permission: async () => true,
  enabled: async () => true,
  position: async () => ({ latitude: 0, longitude: 0 }),
  ...overrides,
});

test("location permission denial or disabled GPS never requests coordinates", async () => {
  let reads = 0;
  const position = async () => { reads++; return {}; };
  await assert.rejects(currentLocation(device({ permission: async () => false, position })), /Izin lokasi ditolak/);
  await assert.rejects(currentLocation(device({ enabled: async () => false, position })), /Nyalakan GPS/);
  assert.equal(reads, 0);
});

test("GPS result is a draft requiring a ready map and can still be moved manually", async () => {
  const point = await currentLocation(device());
  assert.deepEqual(point, { latitude: 0, longitude: 0 });
  const draft = initialMapState(point);
  assert.equal(canConfirmLocation(draft), false);
  const ready = receiveMapEvent(draft, '{"type":"ready"}');
  assert.equal(canConfirmLocation(ready), true);
  const moved = receiveMapEvent(ready, '{"type":"point","latitude":-6.2,"longitude":106.8}');
  assert.deepEqual(moved.point, { latitude: -6.2, longitude: 106.8 });
  assert.deepEqual(point, { latitude: 0, longitude: 0 });
});

test("invalid GPS, SDK errors and timeouts reject without inventing a location", async () => {
  await assert.rejects(currentLocation(device({ position: async () => ({ latitude: 999, longitude: 0 }) })), /tidak valid/);
  await assert.rejects(currentLocation(device({ position: async () => { throw new Error("GPS error"); } })), /GPS error/);
  await assert.rejects(currentLocation(device({ position: () => new Promise(() => {}) }), 5), /Lokasi belum ditemukan/);
});
