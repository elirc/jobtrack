# Trace lab: backup replacement has one commit point

[Course index](README.md)

## Recognize the envelope

Valid JSON can still be the wrong document. The importer expects `format: "daybook.jobs"`, version 1, and an applications array. Records preserve their ids; restoration does not invent a second identity. Calendar events use separate storage and are excluded.

## The six boundaries of one import

An import crosses the same boundaries a `POST /api/import` would; the difference is that the "server" is a host storage adapter and the transport is a file input. Walk them with [jobBackup.js](../src/jobBackup.js) and [src/JobTracker.jsx](../src/JobTracker.jsx) open.

**1. The input surface - the file input and its handler, `JobTracker.jsx:484` and `:503`.** A `File` becomes a string via `text()`, and the controls are disabled while the import is in flight. Nothing here looks at the content. Two properties of this layer matter later: the file came from the user's disk, so it may be anything at all, including a 4 GB video renamed to `.json`; and reading it is asynchronous, so the UI must have a state for "in progress" or a second click can start a second import.

**2. The cheapest rejections - `jobBackup.js:6-14`.** Two guards, in a deliberate order. The **size** bound (`new TextEncoder().encode(text).length > MAX_BACKUP_BYTES`) runs *before* `JSON.parse`, because parsing is what a hostile file would like you to do - a 500 MB JSON document is a denial of service, not a validation failure. Note `TextEncoder`: `text.length` counts UTF-16 code units, not bytes, so a document full of non-ASCII characters would slip past a naive `.length` check by up to a factor of three. Then `JSON.parse` inside a `try`, producing "The file is not valid JSON." rather than a stack trace. In an API these two are the body-size limit and the JSON body parser, and they are usually middleware you never see.

**3. The envelope - `jobBackup.js:15-18`.** `format`, `version` and `Array.isArray(applications)` checked together, then the record cap. This is the layer that answers "is this document *for* me?", which is a different question from "are its fields valid?". Valid JSON can still be the wrong document - someone's browser bookmarks export parses fine. The `version !== 1` check is what makes a future migration possible: a v2 file is rejected with a clear message today rather than being half-understood, and the last paragraph of this chapter says why a version number alone is not a migration.

Suppose row one is valid and row two repeats its id. Reject the whole document. Saving each row while validating would leave a partial import. Other rejection examples include an unknown status, 2026-02-30, object-valued notes and a `javascript:` URL.

**4. Per-record validation - `jobBackup.js:20-53`.** The `map` over records, with `fail()` closing over `index` so every message names the offending row. Read its internal ordering, which is the same shape at a smaller scale: shape (`typeof record === 'object'`), then types and bounds for all nine fields in one loop, then domain rules (non-blank id, uniqueness via the `ids` set, non-blank company, known status, real date, allowed URL scheme). The `ids` set is the one piece of *cross-record* state, and it is why validation cannot be a per-record pure function: record 2 is invalid only because of record 1. Nothing has been written at this point - `map` either returns a complete array of clean records or throws.

The 2 MB file bound, 10,000-record bound and field text limits in [jobBackup.js](../src/jobBackup.js) serve a different purpose from shape and domain validation. Explain what each protects.

**5. The commit - `commitJobBackup`, `jobBackup.js:60-64`, joined to the write queue at `JobTracker.jsx:503`.** Three lines, and every word is load-bearing. `parseJobBackup(text)` first, so a throw happens before any write exists. Then **one** `await storage.set('jobtracker:data', JSON.stringify(applications))` - one key, one complete value, not a loop over records. That single call is this project's transaction: there is no state in which half the applications have been replaced. And it is chained onto `writeQueue.current` in the caller, so an ordinary save that was already pending cannot land *after* the import and overwrite it. Test 6 pins both halves: `toHaveBeenCalledExactlyOnceWith` for the happy path, and a rejected `storage.set` propagating rather than being swallowed.

```text
read file -> validate every record -> await queued storage write
          -> publish replacement state -> show success
```

`parseJobBackup` is pure: it returns records or throws. `await` pauses this function, not the browser. It does not guarantee success. Follow the error branch for file reading, JSON parsing and storage rejection.

**6. Publication and the export round trip - `JobTracker.jsx` after the await, plus `exportJobBackup`, `jobBackup.js:55-59`.** React state is replaced with the returned records and the success message is shown - *after* the write resolved, which is why a rejected `storage.set` shows an error instead of a list that will not survive reload. The sixth boundary is the one most projects do not have: `exportJobBackup` calls `parseJobBackup` **on its own output** before returning it, with the comment "Never generate a backup the importer cannot restore." That turns "export and import are inverses" from a hope into an enforced invariant, checked in production code rather than only in a test. Ask what it costs (validating twice on every export) and what it buys (a corrupt export is impossible to produce, so a support case can never be "the app wrote a file it cannot read").

Now trace backwards from the failure in variation 3 of chapter 3. A `javascript:` URL in record 2 throws at layer 4. Which layers had already finished? One, two and three - the file was read and parsed, and record 1 was fully validated and is sitting in a half-built array that is about to be discarded. Which never ran? Five and six, so `storage.set` was never called and the existing applications are untouched. Now compare with a `storage.set` that rejects: layers 1-4 all succeeded, the records are valid, and the failure is at layer 5 - nothing was written, but the reason is the host, not the file, and the message should say so. Being able to tell those two apart from the outside is what the tests' `expect(storage.set).not.toHaveBeenCalled()` assertions are for.

## Observe absence of mutation

With an existing application in a disposable profile, import malformed JSON. Check the error and the saved original company. Then import a valid replacement, export again and compare id and company in the downloaded file.

An empty valid applications array intentionally clears the current list; a missing applications field is invalid. The UI explicitly labels import as replacement. Export first when you want a recovery copy.

A future version-two envelope needs an explicit migration or clear rejection policy. A version number alone does not transform old records.
