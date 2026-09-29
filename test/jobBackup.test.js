import { describe, it, expect, vi } from "vitest";
import {
  parseJobBackup,
  exportJobBackup,
  commitJobBackup,
  MAX_BACKUP_BYTES,
} from "../src/jobBackup.js";
const record = {
  id: "a",
  company: "Acme",
  role: "Junior SWE",
  location: "",
  url: "https://example.com/job",
  status: "applied",
  stack: "JS",
  date: "2026-09-08",
  notes: "Ask about mentoring",
};
describe("application backups", () => {
  it("exports and restores records without inventing new identities", () => {
    expect(parseJobBackup(exportJobBackup([record]))).toEqual([record]);
  });
  it.each([
    null,
    {},
    [],
    { format: "daybook.jobs", version: 2, applications: [] },
  ])("rejects an invalid envelope without writing: %j", async (payload) => {
    const storage = { set: vi.fn() };
    await expect(
      commitJobBackup(storage, JSON.stringify(payload)),
    ).rejects.toThrow();
    expect(storage.set).not.toHaveBeenCalled();
  });
  it.each([
    { id: "a" },
    { company: "" },
    { status: "unknown" },
    { date: "2026-02-30" },
    { url: "javascript:alert(1)" },
    { notes: 123 },
  ])("rejects an entire batch with a bad record: %j", async (change) => {
    const storage = { set: vi.fn() };
    const text = JSON.stringify({
      format: "daybook.jobs",
      version: 1,
      applications: [record, { ...record, id: "b", ...change }],
    });
    await expect(commitJobBackup(storage, text)).rejects.toThrow();
    expect(storage.set).not.toHaveBeenCalled();
  });
  it("rejects an oversized payload before parsing it, and writes nothing", async () => {
    const storage = { set: vi.fn() };
    // Padding inside a notes field, so the document is well-formed JSON and the
    // only thing wrong with it is its size. The bound is checked before JSON.parse.
    const padded = JSON.stringify({
      format: "daybook.jobs",
      version: 1,
      applications: [{ ...record, notes: "x".repeat(MAX_BACKUP_BYTES) }],
    });
    expect(new TextEncoder().encode(padded).length).toBeGreaterThan(
      MAX_BACKUP_BYTES,
    );
    await expect(commitJobBackup(storage, padded)).rejects.toThrow(
      /no larger than 2 MB/,
    );
    expect(storage.set).not.toHaveBeenCalled();
  });
  it("rejects more than 10,000 applications without validating each one", async () => {
    const storage = { set: vi.fn() };
    const applications = Array.from({ length: 10001 }, (_, index) => ({
      ...record,
      id: `a${index}`,
    }));
    await expect(
      commitJobBackup(
        storage,
        JSON.stringify({ format: "daybook.jobs", version: 1, applications }),
      ),
    ).rejects.toThrow(/at most 10,000 applications/);
    expect(storage.set).not.toHaveBeenCalled();
    // Exactly at the bound the batch is accepted, so the limit is inclusive.
    const atLimit = applications.slice(0, 10000);
    expect(
      parseJobBackup(
        JSON.stringify({
          format: "daybook.jobs",
          version: 1,
          applications: atLimit,
        }),
      ),
    ).toHaveLength(10000);
  });
  it("writes exactly one complete value; a failing host write never returns replacement state", async () => {
    const storage = { set: vi.fn().mockResolvedValue({}) };
    expect(await commitJobBackup(storage, exportJobBackup([record]))).toEqual([
      record,
    ]);
    expect(storage.set).toHaveBeenCalledExactlyOnceWith(
      "jobtracker:data",
      JSON.stringify([record]),
    );
    storage.set.mockRejectedValue(new Error("quota"));
    await expect(commitJobBackup(storage, exportJobBackup([]))).rejects.toThrow(
      "quota",
    );
  });
});
