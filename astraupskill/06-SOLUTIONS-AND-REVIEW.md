# Solutions and engineering review

[Course index](README.md) · [Practice prompts](05-PRACTICE.md)

Attempt each exercise before using these notes. These are solution approaches and review criteria, not claims that every extension has been implemented. The actual completed behavior is described in the worked-change chapter.

## Existing implementation

The application section exports a versioned JSON backup and imports it as an explicitly labeled replacement. It validates field types, bounded lengths, ids, status, dates and URLs before writing. A failed parse or rejected host write leaves the displayed applications unchanged.

The key model is: The exchange format is {format: "daybook.jobs", version: 1, applications: [...]}. The stored application key remains jobtracker:data and contains an array. Calendar events use timetrack:events and are not part of this applications-only backup.

The worked fixture should behave as follows: A backup with a valid Acme application followed by another record with the same id is rejected as a whole. The storage set function must not be called. A valid two-record backup is written once; importing it again still yields two records with their original ids.

## Extension solutions

### Exercise 1

**Prompt:** Add a preview showing imported count before replacement.

**Approach:** Split `commitJobBackup` in two. The parse already produces the exact array that will be written, so hold *that value* - not the file text - and write it on confirmation. Re-parsing on confirm would be a second, separate validation of the same bytes and could in principle disagree with the first.

```javascript
// jobBackup.js - the commit now takes records, not text.
export function previewJobBackup(text) {
  const applications = parseJobBackup(text);
  return {
    applications,
    count: applications.length,
    companies: [...new Set(applications.map((a) => a.company))].slice(0, 5),
  };
}

export async function commitParsedBackup(storage, applications) {
  await storage.set('jobtracker:data', JSON.stringify(applications));
  return applications;
}
```

```jsx
// JobTracker.jsx
const [preview, setPreview] = useState(null);

async function onFile(file) {
  try { setPreview(previewJobBackup(await file.text())); }
  catch (error) { setImportError(error.message); }
}

async function onConfirm() {
  // writeQueue.current still owns ordering; the preview held no lock.
  writeQueue.current = writeQueue.current.then(() =>
    commitParsedBackup(window.storage, preview.applications));
  setApplications(await writeQueue.current);
  setPreview(null);
}
```

**Review:** The ordinary case is: choose a two-record file, see "Replace 3 applications with 2 (Acme, Globex)?", confirm, and find exactly one `storage.set` call - assert `toHaveBeenCalledExactlyOnceWith`, because a preview that accidentally commits is the failure this whole exercise is about. Two implementations break. The first keeps the *text* and calls `commitJobBackup(storage, text)` on confirm: correct today, but it validates twice, and the moment anyone adds a time-dependent or cookbook-dependent rule the preview and the commit can disagree. The second forgets the write queue and calls `storage.set` directly on confirm - now an ordinary edit the user made *while the confirmation dialog was open* can land after the import and overwrite it; demonstrate it with two deferred promises resolved in the wrong order, exactly as exercise 4 does. The invariant that remains unchanged: nothing is written until validation of the entire payload succeeded, and the existing list stays authoritative and visible until the user chooses - so cancelling must leave `storage.set` uncalled.

### Exercise 2

**Prompt:** Support merging backups with an explicit duplicate-id conflict rule.

**Approach:** Write the rule down first, because all three answers are defensible and the code cannot tell you which you meant.

Rule chosen here: **an incoming record with an id that already exists replaces the existing one; an id that does not exist is added; existing records not mentioned in the file are kept.** That is an upsert, and it is the only one of the three that makes importing the same file twice a no-op.

```javascript
export function mergeJobBackup(existing, incoming) {
  const byId = new Map(existing.map((record) => [record.id, record]));
  for (const record of incoming) byId.set(record.id, record);   // last writer wins, by id
  return [...byId.values()];
}

export async function commitJobMerge(storage, existingText, text) {
  const incoming = parseJobBackup(text);                     // whole file validated first
  const existing = JSON.parse(existingText ?? '[]');
  await storage.set('jobtracker:data', JSON.stringify(mergeJobBackup(existing, incoming)));
}
```

Note what does **not** change: `parseJobBackup` still rejects a file that contains the same id twice *internally* (`jobBackup.js:31`). Duplicates across the boundary are a merge decision; duplicates within one document are a malformed document.

**Review:** The ordinary case is importing a file whose single record matches an existing id and asserting the result has the same length, the same id, and the *new* company - and then importing it a second time and asserting the result is byte-identical. That idempotence assertion is the one that catches the naive implementation, which is `[...existing, ...incoming]`: it passes a "did the new record arrive?" test and silently doubles the list on the second import. The other implementation worth demonstrating is the one the approach warns about - minting fresh ids during import (`{ ...record, id: crypto.randomUUID() }`) to "avoid collisions". It makes every import a duplication, it makes replay non-deterministic, and it breaks the export round trip that `exportJobBackup` enforces at `jobBackup.js:57`. The invariant that remains unchanged: one `storage.set` of one complete value. A merge is still all-or-nothing; do not be tempted into a per-record write loop just because the operation now has two inputs.

### Exercise 3

**Prompt:** Add a separate calendar-backup format and validator.

**Approach:** A second format identifier and a second validator with the same skeleton. Resist the urge to generalise `parseJobBackup` into a schema engine on the second use; two similar validators are easier to read and to change independently than one configurable one.

```javascript
const CALENDAR_FORMAT = 'daybook.calendar';
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseCalendarBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error('Choose a JSON backup no larger than 2 MB.');
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error('The file is not valid JSON.'); }
  if (!backup || backup.format !== CALENDAR_FORMAT || backup.version !== 1 || !Array.isArray(backup.events))
    throw new Error('Expected a Daybook calendar backup, version 1.');
  if (backup.events.length > 10000) throw new Error('A backup may contain at most 10,000 events.');
  const ids = new Set();
  return backup.events.map((event, index) => {
    const fail = (reason) => { throw new Error(`Event ${index + 1}: ${reason}`); };
    if (!event || typeof event !== 'object' || Array.isArray(event)) fail('expected an object.');
    const value = {};
    for (const field of ['id', 'title', 'date', 'start', 'end']) {
      const item = event[field] ?? '';
      if (typeof item !== 'string' || item.length > 5000) fail(`${field} must be bounded text.`);
      value[field] = item;
    }
    if (typeof event.done !== 'boolean') fail('done must be true or false.');   // not a string
    value.done = event.done;
    if (!value.id.trim() || ids.has(value.id)) fail('id is missing or duplicated.');
    ids.add(value.id);
    if (!value.title.trim()) fail('title is required.');
    const day = new Date(`${value.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || day.toISOString().slice(0, 10) !== value.date)
      fail('date must be a real YYYY-MM-DD date.');
    if (!TIME.test(value.start) || !TIME.test(value.end)) fail('start and end must be HH:MM.');
    if (value.end <= value.start) fail('end must be after start.');             // string compare is safe for HH:MM
    return value;
  });
}
```

**Review:** The ordinary case is a two-event file round-tripping through export and import with its ids intact. The implementation that breaks is the one that reuses `format: 'daybook.jobs'` for both, or - worse - accepts either shape under one identifier: now a calendar file imported through the applications route either silently clears the user's job list (because `applications` is absent, so... it is not, it throws - check this yourself) or, if you "helpfully" default `applications` to `[]`, wipes it. Demonstrate that by feeding a calendar backup to `commitJobBackup` and asserting it throws *and* that `storage.set` was not called. The second thing to demonstrate is `end <= start`: it is the only rule here that is about two fields at once, and the lexicographic string comparison is only correct because `HH:MM` is zero-padded and fixed-width - try it with `9:00` and `10:00` to see it fail. The invariant that remains unchanged: applications and events live under different storage keys and different format identifiers, so neither importer can ever be handed the other's data without saying so.

### Exercise 4

**Prompt:** Test an old queued edit followed by a successful import using deferred promises.

**Approach:** Hand-built deferred promises, so *you* decide the resolution order rather than hoping the microtask queue cooperates.

```javascript
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

it("an import scheduled after a pending save is not overwritten by it", async () => {
  const pending = deferred();
  const calls = [];
  const storage = {
    set: vi.fn((key, value) => {
      calls.push(JSON.parse(value));
      return calls.length === 1 ? pending.promise : Promise.resolve();
    }),
  };

  // An ordinary save is already in flight and has NOT resolved.
  let queue = storage.set('jobtracker:data', JSON.stringify([{ ...record, company: 'Stale' }]));
  // The import joins the same queue, exactly as JobTracker.jsx:503 does.
  queue = queue.then(() => commitJobBackup(storage, exportJobBackup([record])));

  pending.resolve();            // the old write lands first...
  await queue;                  // ...and only then does the import run.

  expect(storage.set).toHaveBeenCalledTimes(2);
  expect(calls[0][0].company).toBe('Stale');
  expect(calls[1]).toEqual([record]);          // the import is the final value
});
```

**Review:** The ordinary case is the assertion on `calls[1]` - the imported records are what is left in storage. The implementation that breaks is the one this test exists to forbid: drop the `.then()` chaining at `JobTracker.jsx:503` and call `commitJobBackup` directly. Resolve `pending` *after* the import and `calls` comes back in the order [import, stale] - the user's restored backup is silently overwritten by a save they made ten seconds earlier, and every other test in the suite still passes because none of them has two writes in flight. Demonstrate exactly that by moving `pending.resolve()` below the `await`. Two things to watch in the test itself: assert on the order of `calls`, not on `storage.set.mock.calls.length` alone, because both implementations call it twice; and never use a bare `await Promise.resolve()` to "let the queue settle" - that is timing-dependent, which is the bug you are testing for. The invariant that remains unchanged: serialization is owned by `writeQueue.current` in the component, not by `commitJobBackup`, which is deliberately a plain async function with no knowledge of ordering.

## Review questions with answer guidance

**Why not trust input just because it came from this UI?** A caller can bypass the UI, a saved file can be edited, and older data can have a different shape. Validate at the boundary that owns the operation.

**Why keep the id stable?** It identifies the same domain record across views and edits. Changing it can create duplicates, disconnect child records or make reconciliation impossible.

**What makes the failure test meaningful?** It observes the promised state invariant. For this project, explain exactly why the failing scenario in [test/jobBackup.test.js](../test/jobBackup.test.js) would detect the original or a plausible regression.

**What does the test not prove?** A bounded suite does not prove all concurrency, browsers, deployment configurations or unrelated domain behavior. Name the real limitation from this lesson instead of adding a generic disclaimer.

**When should you extract a helper?** When it isolates a coherent responsibility, makes an invariant clearer or enables a meaningful test without duplicating application logic. A pure validator and a shared persistence boundary are common examples, but do not abstract solely to increase the number of files.

## A sample change explanation

“The previous behavior was: The local app persisted edits but had no validated application backup flow. A naive importer could replace good data before discovering that a later record was invalid. I changed the implementation so that: The application section exports a versioned JSON backup and imports it as an explicitly labeled replacement. It validates field types, bounded lengths, ids, status, dates and URLs before writing. A failed parse or rejected host write leaves the displayed applications unchanged. The strongest evidence is the regression that exercises the worked fixture and checks authoritative state. A remaining design question is the final stretch exercise.”

Replace that explanation with your own words and actual test results. A strong junior engineer can connect a concrete user problem to code, verification and a clearly stated limit. Completing that explanation independently is the final checkpoint for this course.
