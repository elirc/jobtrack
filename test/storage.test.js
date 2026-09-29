import { afterEach, describe, expect, it } from "vitest";
import { installStorage } from "../src/storage.js";

afterEach(() => {
  delete window.storage;
  window.localStorage.clear();
});

describe("window.storage shim", () => {
  it("rejects on a missing key — the signal the app reads as 'first run'", async () => {
    const storage = installStorage();
    await expect(storage.get("nope")).rejects.toThrow(/no value/);
  });

  it("round-trips a value", async () => {
    const storage = installStorage();
    await storage.set("k", JSON.stringify([1, 2]));
    await expect(storage.get("k")).resolves.toMatchObject({ value: "[1,2]" });
  });

  it("deletes", async () => {
    const storage = installStorage();
    await storage.set("k", "v");
    await storage.delete("k");
    await expect(storage.get("k")).rejects.toThrow();
  });

  it("leaves a host-provided storage alone", () => {
    const host = { get: () => {}, set: () => {} };
    window.storage = host;
    installStorage();
    expect(window.storage).toBe(host);
  });
});
