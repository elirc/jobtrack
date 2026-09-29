# Worked implementation and examples

[Course index](README.md)

## Before and after

**Before:** The local app persisted edits but had no validated application backup flow. A naive importer could replace good data before discovering that a later record was invalid.

**After:** The application section exports a versioned JSON backup and imports it as an explicitly labeled replacement. It validates field types, bounded lengths, ids, status, dates and URLs before writing. A failed parse or rejected host write leaves the displayed applications unchanged.

## Predict this example

A backup with a valid Acme application followed by another record with the same id is rejected as a whole. The storage set function must not be called. A valid two-record backup is written once; importing it again still yields two records with their original ids.

Before running anything, write the exact expected stored values and visible response. Include ids or record counts where they matter. Then run the focused tests and reproduce the matching UI/API action. Do not settle for seeing a success message: inspect the authoritative stored result as well.

## Actual implementation excerpt

The excerpt below comes from [src/jobBackup.js](../src/jobBackup.js) near line 5. It is a teaching snapshot; the linked source is authoritative if you later edit the project. Read surrounding code for callers and setup.

```javascript
export function parseJobBackup(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
        throw new Error('Choose a JSON backup no larger than 2 MB.');
    let backup;
    try {
        backup = JSON.parse(text);
    }
    catch {
        throw new Error('The file is not valid JSON.');
    }
    if (!backup || backup.format !== FORMAT || backup.version !== 1 || !Array.isArray(backup.applications))
        throw new Error('Expected a Daybook applications backup, version 1.');
    if (backup.applications.length > 10000)
        throw new Error('A backup may contain at most 10,000 applications.');
    const ids = new Set();
    return backup.applications.map((record, index) => {
        const fail = (reason) => { throw new Error(`Application ${index + 1}: ${reason}`); };
        if (!record || typeof record !== 'object' || Array.isArray(record))
            fail('expected an object.');
        const value = {};
        for (const field of ['id', 'company', 'role', 'location', 'url', 'status', 'stack', 'date', 'notes']) {
            const item = record[field] ?? '';
            if (typeof item !== 'string' || item.length > (field === 'notes' ? 100000 : 5000))
                fail(`${field} must be bounded text.`);
            value[field] = item;
        }
        if (!value.id.trim() || ids.has(value.id))
            fail('id is missing or duplicated.');
        ids.add(value.id);
        if (!value.company.trim())
            fail('company is required.');
        if (!STATUSES.has(value.status))
            fail('unknown status.');
        if (value.date) {
            const date = new Date(`${value.date}T00:00:00Z`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.date)
                fail('date must be a real YYYY-MM-DD date or empty.');
        }
        if (value.url) {
            try {
                if (!['http:', 'https:'].includes(new URL(value.url).protocol))
                    fail('URL must use http or https.');
            }
            catch {
                fail('URL must be an absolute http or https URL.');
            }
        }
        return value;
    });
}
```

## How to reason through the code

1. Identify the inputs. Distinguish data supplied by a caller from state read from storage or a trusted context.
2. Find the guard clauses. For each early return or thrown error, describe which invariant it protects and whether anything has already been written.
3. Find the candidate state or query. Explain whether it mutates an existing object or constructs a replacement.
4. Locate the persistence operation. For asynchronous code, follow the promise through success and rejection; for transactions, check that all related writes use the same transaction object.
5. Find the output or state publication. Ask what a repeated invocation would do after the first invocation succeeds.

Use this project-specific reasoning as your guide:

A file is an input boundary, even when the user exported it from their own computer. JSON.parse proves syntax, not meaning: an array of numbers is valid JSON but is not an application list. The envelope distinguishes this format from calendar data and gives future migrations a version to branch on. Validation completes before persistence, so invalid row 500 cannot leave the first 499 rows saved. Atomicity here is one key-value write: the browser shim uses localStorage.setItem. A custom host must honor that operation’s contract; a host that writes and then falsely rejects cannot be repaired by client-side promise handling alone. The existing write queue prevents an earlier asynchronous edit from finishing after import and overwriting it. The import UI is disabled while the replacement is in progress. Import is replacement rather than merge, which is explicitly stated beside the file input.

## Three variations to work through

Each is a single field changed on the valid `record` fixture in [test/jobBackup.test.js](../test/jobBackup.test.js), wrapped in a two-record backup where record one is valid. Predict the **exact** message `fail()` produces - the format is `` `Application ${index + 1}: ${reason}` `` (`jobBackup.js:21`) - and predict how many times `storage.set` is called. The answer to the second question is always zero, and proving it is the point.

**Variation 1 - `notes` of 100,001 characters.** `{ ...record, id: 'b', notes: 'x'.repeat(100001) }`. Predicted message: **`Application 2: notes must be bounded text.`** The per-field bound at `jobBackup.js:27` is 100,000 for `notes` and 5,000 for everything else, and note *where* it sits: inside the field loop, before any domain rule, so an oversized field is rejected before the code ever asks whether the status is known. Now try the same payload with 100,000 characters exactly and confirm it is accepted - the comparison is `>`, so the limit is inclusive. Then ask the question the bound exists to answer: what does a 100,000-character notes field cost that a 5,000-character one does not, and why is the file-level 2 MB bound (`jobBackup.js:6`) not enough on its own? (Answer: the file bound is about what you are willing to *read*; the field bound is about what you are willing to *store and render*. One record with a 1.9 MB notes field passes the file bound comfortably.)

**Variation 2 - `date` of `2026-02-30`.** `{ ...record, id: 'b', date: '2026-02-30' }`. Predicted message: **`Application 2: date must be a real YYYY-MM-DD date or empty.`** The interesting part is why the regex alone is not enough. `/^\d{4}-\d{2}-\d{2}$/` matches `2026-02-30` happily; what rejects it is the round trip on `jobBackup.js:39-41` - `new Date('2026-02-30T00:00:00Z')` does not throw, it *rolls over* to 1 March, and `date.toISOString().slice(0, 10) !== value.date` catches the difference. Test both directions: `2026-02-29` (a real leap day) must be accepted, `2025-02-29` must be rejected. A validator that only used `Number.isNaN(date.getTime())` would pass both.

**Variation 3 - `url` of `javascript:alert(1)`.** `{ ...record, id: 'b', url: 'javascript:alert(1)' }`. Predicted message: **`Application 2: URL must use http or https.`** - not the `catch` branch's message, because `new URL('javascript:alert(1)')` **succeeds**; `javascript:` is a perfectly valid URL scheme. The allowlist at `jobBackup.js:45` is what rejects it, and that ordering is the whole lesson: a `try/catch` around `new URL` tells you the string is parseable, never that it is safe to put in an `href`. Contrast with `'/jobs/1'`, which reaches the `catch` at `jobBackup.js:48` because it is relative and `new URL` needs a base - a different failure, a different message, and a design decision (this format requires absolute URLs) rather than a security rule. Try both and note which branch each one takes.

## Executable examples

These are the regression tests in [test/jobBackup.test.js](../test/jobBackup.test.js) - six `it` blocks, two of them parameterized over four and six payloads. Cases 3 and 4 (the two bounds) were added in the 2026-09-17 follow-up. Read each test as arrange → act → assert. Setup creates a controlled initial state, the action exercises the application code, and assertions compare observable behavior with an independently stated expectation.

```javascript
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
```

## Explain it back

Give a five-minute walkthrough: the original problem, one invariant, the exact changed function, the most revealing failure test, and one remaining limitation. You should be able to explain why the implementation is correct for the worked example without reading the code aloud line by line.
