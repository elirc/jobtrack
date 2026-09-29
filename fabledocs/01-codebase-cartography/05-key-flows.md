# Key Flows

Five end-to-end traces. Each uses the same template; each is reused by *different* later
modules (drills, debugging, interviews) so you see every flow at least twice.

---

## Flow 1: Cold start — boot, load, first paint

Why this flow matters: every app has a "from zero to interactive" path, and its failure
modes (flash of wrong state, race with persistence, crash on corrupt data) are classic
interview material.

Open these files first:
- [index.html](../../index.html) — the host page; note the inline `background: #EDF0F4` that prevents a white flash
- [main.jsx](../../src/main.jsx) — boot order
- [JobTracker.jsx#L508-L527](../../src/JobTracker.jsx#L508-L527) — the load effect

Trace:

| Step | Owner | File | What happens | Data shape | Risk |
|---|---|---|---|---|---|
| 1 | Browser | [index.html](../../index.html) | Parses HTML, requests `main.jsx` as a module | — | — |
| 2 | main.jsx | [L7](../../src/main.jsx#L7) | `installStorage()` — shim installed unless host already has one ([storage.js#L12](../../src/storage.js#L12)) | `window.storage` = `{get,set,delete}` | Boot-order dependency: must precede the effect's first read |
| 3 | main.jsx | [L9-L13](../../src/main.jsx#L9-L13) | `createRoot(...).render(<StrictMode><JobTracker/>)` | — | StrictMode double-invokes the mount effect in dev (see below) |
| 4 | JobTracker | [L496-L505](../../src/JobTracker.jsx#L496-L505) | First render: `apps=[]`, `loaded=false` → renders "Loading…" ([L738-L739](../../src/JobTracker.jsx#L738-L739)) | — | Without the `loaded` gate: flash of "No applications yet" |
| 5 | Effect | [L512](../../src/JobTracker.jsx#L512) | `await window.storage.get("jobtracker:data")` | `{value: string}` or **throws** | Missing key throws — *expected* on first run |
| 6a | Effect (happy) | [L513-L515](../../src/JobTracker.jsx#L513-L515) | `JSON.parse`, `Array.isArray` check, `setApps(parsed)` | `App[]` | Non-array JSON (e.g. `"{}"`) silently ignored — defensive |
| 6b | Effect (throw) | [L517-L519](../../src/JobTracker.jsx#L517-L519) | Catch swallows: missing key *and* corrupt JSON both land here | — | Two very different causes, one handler — see senior note |
| 7 | Effect | [L520-L522](../../src/JobTracker.jsx#L520-L522) | `finally`: `setLoaded(true)` if not cancelled | — | `finally` guarantees the UI never hangs on "Loading…" |
| 8 | React | [L738-L774](../../src/JobTracker.jsx#L738-L774) | Re-render with data or empty state | — | — |

Validation and authorization: none — single-user by design; the trust boundary is the
machine ([SPEC.md §1](../../SPEC.md)).

Persistence and side effects: read-only flow; nothing is written even when the stored
JSON is corrupt (verified by [the corrupt-JSON test, L97-L105](../../test/JobTracker.test.jsx#L97-L105)
asserting `storage.set` was never called).

Tests that cover it: [loading tests L80-L125](../../test/JobTracker.test.jsx#L80-L125)
(happy, first-run, corrupt, loading-gate), [smoke.test.jsx#L9-L23](../../test/smoke.test.jsx#L9-L23)
(real entry point).

What juniors usually miss: the `cancelled` flag ([L509](../../src/JobTracker.jsx#L509),
[L524-L526](../../src/JobTracker.jsx#L524-L526)). It exists because the component can
unmount *while the await is in flight* — and because React 18 StrictMode deliberately
mounts→unmounts→remounts in dev to surface exactly this bug. Without the flag: setState
on an unmounted component (first mount's stale promise resolving).

What seniors notice: (1) The catch **conflates** "no data yet" with "data corrupted" —
acceptable at this scale, but in a multi-user product you'd want the corrupt case
surfaced, because the *next save will overwrite* whatever the corrupt blob contained
(silent data loss; [risk R1](../09-reference/risk-register.md)). (2) `loaded` flips in
`finally` — the invariant "the UI always leaves the loading state" holds on every path.

Interview angle: "How do you avoid a flash of empty state?" and "How do you handle
setState after unmount?" — both answered by this one effect. Cards
[F2, F4](../08-interview-prep/02-frontend-framework-questions.md).

Drill: in the loading-gate test ([L107-L125](../../test/JobTracker.test.jsx#L107-L125)),
explain *how* the test holds the component in its loading state. Then predict: what would
the test see if `setLoaded(true)` were in the `try` instead of `finally`? (For the missing-key
path — trace it.)
Self-grade — Basic: "the promise never resolves." Solid: names the manually-released
promise and that the test controls timing. Strong: also answers the `finally` question
correctly (catch path would still set loaded — but a *throw inside catch* wouldn't; `finally`
is armor against future edits, and the corrupt-JSON test would still pass today).

---

## Flow 2: Create an application

Why this flow matters: the canonical form → validate → mutate → persist path. Every CRUD
interview question ("walk me through a write") is this flow.

Open these files first:
- [JobTracker.jsx#L678-L736](../../src/JobTracker.jsx#L678-L736) — the form JSX
- [JobTracker.jsx#L568-L582](../../src/JobTracker.jsx#L568-L582) — `submit`
- [JobTracker.jsx#L530-L538](../../src/JobTracker.jsx#L530-L538) — `persist`

Trace:

| Step | Owner | File | What happens | Data shape | Risk |
|---|---|---|---|---|---|
| 1 | User/UI | [L662-L669](../../src/JobTracker.jsx#L662-L669) | "+ Add application" → `toggleForm` → `setShowForm(true)` | — | Same button becomes "Cancel" — one control, two roles |
| 2 | UI | [L678-L736](../../src/JobTracker.jsx#L678-L736) | Controlled form renders; date defaults to today via [`emptyForm` L137](../../src/JobTracker.jsx#L137) | `{company,stack,date,notes}` strings | `emptyForm` uses [`todayISO` L97-L102](../../src/JobTracker.jsx#L97-L102) — local time, not UTC |
| 3 | UI | [L541](../../src/JobTracker.jsx#L541) | Each keystroke: `setField("company")` — curried handler, functional update | — | — |
| 4 | UI | [L600](../../src/JobTracker.jsx#L600), [L729](../../src/JobTracker.jsx#L729) | `canSubmit` gates the button on `company.trim()` | boolean | Validation is *presentational* (disabled button) **and** enforced in the handler — see step 5 |
| 5 | `submit` | [L568-L571](../../src/JobTracker.jsx#L568-L571) | `preventDefault`; re-checks `trim()`; bails if empty | — | Defense in depth: Enter key submits forms even with a disabled button in some flows |
| 6 | `submit` | [L574-L579](../../src/JobTracker.jsx#L574-L579) | Builds record: `id = Date.now().toString(36)`, company trimmed, stack/notes raw | `App` | ID = timestamp: unique per ms — fine for one human, breaks for bulk import ([risk R3](../09-reference/risk-register.md)) |
| 7 | `persist` | [L531](../../src/JobTracker.jsx#L531) | `setApps(next)` — **UI updates before storage answers** | `App[]` | Optimistic; no rollback by design |
| 8 | `persist` | [L533-L537](../../src/JobTracker.jsx#L533-L537) | `await storage.set(key, JSON.stringify(next))`; failure → `setSaveError(true)` | string | Whole-array write; last-write-wins across tabs |
| 9 | `submit` | [L581](../../src/JobTracker.jsx#L581) | `closeForm()` — resets to a *fresh* `emptyForm()` | — | Note it doesn't await persist — the form closes even if the write will fail |

Validation and authorization: company-required is the only rule, enforced twice
([L600](../../src/JobTracker.jsx#L600), [L570-L571](../../src/JobTracker.jsx#L570-L571)).
No authz (single user).

Persistence and side effects: one `storage.set` per mutation; error surfaces as the
alert bar ([L672-L676](../../src/JobTracker.jsx#L672-L676)).

Tests that cover it: [creating suite L127-L193](../../test/JobTracker.test.jsx#L127-L193)
— disabled-until-valid, persist payload shape, today default, trim, toggle.

What juniors usually miss: step 9 not awaiting `persist`. It's deliberate — blocking the
form on storage would trade perceived speed for a guarantee this app has chosen not to
make. Also the double validation (disabled button ≠ validation).

What seniors notice: `submit` builds `next` from the render-closure `apps`
([L577](../../src/JobTracker.jsx#L577), [L579](../../src/JobTracker.jsx#L579)), not a
functional update. Two mutations racing within one render window would lose one. Can't
happen from this UI (the form closes) — but the *pattern* is the lost-update bug, and
naming that unprompted is a senior signal ([risk R2](../09-reference/risk-register.md)).

Interview angle: "What is optimistic UI and when is it wrong?" — this flow is your
concrete example: [card A6](../08-interview-prep/03-api-and-data-modeling-questions.md).

Drill: fill in a trace table for *editing* (start at [`startEdit` L551-L566](../../src/JobTracker.jsx#L551-L566),
end at [L577](../../src/JobTracker.jsx#L577)) — which steps differ from create? (Answer
key: only steps 1-2 and 6: pre-filled form + `editingId` set; the map-replace at L577
instead of append at L579; id preserved.)
Self-grade — Basic: found `startEdit`. Solid: correct diff of steps. Strong: also noticed
`startEdit` normalizes missing fields to `""` (L553-L556) — defensive against old records.

---

## Flow 3: Delete with confirmation

Why this flow matters: destructive actions are where UX, state consistency, and "what
does undo cost" meet. Interviewers love "how would you add undo?"

Open these files first:
- [JobTracker.jsx#L584-L589](../../src/JobTracker.jsx#L584-L589) — `remove`
- [JobTracker.jsx#L453-L460](../../src/JobTracker.jsx#L453-L460) — the Delete button

Trace:

| Step | Owner | File | What happens | Data shape | Risk |
|---|---|---|---|---|---|
| 1 | UI | [L453-L460](../../src/JobTracker.jsx#L453-L460) | Delete click → `onDelete` → `remove(app)` | `App` | — |
| 2 | `remove` | [L585](../../src/JobTracker.jsx#L585) | `window.confirm(...)` — synchronous, blocking | boolean | Native dialog: not styleable, but impossible to get wrong; a custom modal would add state + focus-trap complexity |
| 3 | `remove` | [L586](../../src/JobTracker.jsx#L586) | If the deleted row was expanded, clear `expandedId` | — | **State hygiene**: prevents an orphaned reference |
| 4 | `remove` | [L587](../../src/JobTracker.jsx#L587) | If the deleted row was being edited, close the form | — | Prevents "Save changes" targeting a ghost id — the edit would silently no-op via `.map` |
| 5 | `persist` | [L588](../../src/JobTracker.jsx#L588) | Filter out the id, optimistic write | `App[]` | Permanent — no trash, per [SPEC §6.4](../../SPEC.md) |

Validation and authorization: the `confirm` *is* the validation.

Persistence and side effects: same `persist` path as all mutations.

Tests that cover it: [deleting suite L221-L244](../../test/JobTracker.test.jsx#L221-L244)
— including the **dismissed** path asserting `storage.set` was *not* called.

What juniors usually miss: steps 3-4 entirely. Deleting an entity means cleaning up every
piece of state that *refers* to it. In this repo that's two ids; in a real app it's
caches, selections, open editors, URL params.

What seniors notice: the cleanup is manual and must be remembered at every future
"reference-holding" state addition. An alternative design derives validity instead
(e.g. render-time `apps.some(a => a.id === expandedId)`), trading cleanup code for
derivation cost. Neither is free; naming the tradeoff is the point.

Interview angle: "Design undo for this delete" — soft-delete field vs undo buffer vs
event log; see [card S3](../08-interview-prep/04-system-design-from-this-repo.md).

Drill: add a third piece of referring state in your head (say, `pinnedId`). List every
line you'd have to touch for delete to stay correct. What test would catch forgetting?
Self-grade — Solid: names `remove` + a new cleanup line + a test deleting a pinned row.
Strong: proposes the derive-instead-of-cleanup alternative and its cost.

---

## Flow 4: Sorting and the Notes projection (derived state)

Why this flow matters: derived-vs-stored state is *the* React interview discriminator.
This flow is the repo's cleanest teaching asset.

Open these files first:
- [JobTracker.jsx#L592-L598](../../src/JobTracker.jsx#L592-L598) — six lines that do all the work
- [JobTracker.jsx#L640-L661](../../src/JobTracker.jsx#L640-L661) — the sort pills

Trace:

| Step | Owner | File | What happens | Data shape | Risk |
|---|---|---|---|---|---|
| 1 | UI | [L643-L660](../../src/JobTracker.jsx#L643-L660) | Pill click → `setSortBy("date" \| "alpha")` | union string | `aria-pressed` reflects state — accessible toggle |
| 2 | Render | [L592](../../src/JobTracker.jsx#L592) | `[...apps].sort(...)` — **copy first**; stored order never mutates | `App[]` (new array) | Forgetting the spread = mutating state in place, a classic React bug |
| 3a | Render | [L595](../../src/JobTracker.jsx#L595) | Date mode: `(b.date‖"").localeCompare(a.date‖"")` — ISO strings sort lexicographically; `""` sinks to bottom | — | Only safe because the format is zero-padded ISO; `"3/4/2026"` would break it |
| 3b | Render | [L596](../../src/JobTracker.jsx#L596) | Alpha: `localeCompare(..., {sensitivity:"base"})` — case-insensitive | — | — |
| 4 | Render | [L598](../../src/JobTracker.jsx#L598) | `noted = sorted.filter(hasNotes)` — the entire Notes tab | `App[]` | A projection: *cannot* drift from source |
| 5 | Render | [L746](../../src/JobTracker.jsx#L746), [L426-L428](../../src/JobTracker.jsx#L426-L428) | Rows keyed by `app.id`; gutter shows *positional* index | — | Key = identity, gutter = position — deliberately different |

Validation and authorization: n/a.

Persistence and side effects: **none** — this is the flow's lesson. Sort and filter
happen at render time; nothing is stored, so there is nothing to invalidate, sync, or
migrate. `sorted` and `noted` are recomputed every render (no memo) — measured against a
few hundred rows, that's the right call ([performance guide](../05-quality-engineering/04-performance-thinking.md)).

Tests that cover it: [sorting L247-L291](../../test/JobTracker.test.jsx#L247-L291),
[notes tab L332-L377](../../test/JobTracker.test.jsx#L332-L377) — note the sync test at
[L365-L376](../../test/JobTracker.test.jsx#L365-L376) proving the projection property.

What juniors usually miss: that there is no `notedApps` state and no `useEffect` keeping
anything in sync. Juniors reach for `useState` + effect; the absence of both *is* the design.

What seniors notice: the sort comparator's `|| ""` guards ([L595-L596](../../src/JobTracker.jsx#L595-L596))
exist because old stored records are outside the type system's reach — data written
yesterday is an input you don't control. Defensive reads at the persistence boundary,
trusting inputs nowhere else.

Interview angle: "When do you use useMemo/derived state vs storing it?" — [card F1](../08-interview-prep/02-frontend-framework-questions.md), and the fake-code contrast
[pair 4](../04-code-reading-gym/03-fake-code-contrasts.md).

Drill: write (on paper) the *wrong* version — `useState` for `noted` + `useEffect` to
sync it. List the bugs it invites. Then answer: why is the projection recomputed cost
acceptable here, and at what scale would you memoize?
Self-grade — Solid: stale-sync + double-render bugs named. Strong: quantifies ("filter of
N≈100 strings per render is microseconds; memo pays off ~10k rows or expensive comparators").

---

## Flow 5: Write failure — the error path

Why this flow matters: most codebases test happy paths; the interesting interview
material is what happens when I/O fails. This repo made a specific, defensible choice:
optimistic, no rollback, non-blocking error.

Open these files first:
- [JobTracker.jsx#L530-L538](../../src/JobTracker.jsx#L530-L538) — `persist`
- [JobTracker.jsx#L672-L676](../../src/JobTracker.jsx#L672-L676) — the error bar
- [test/JobTracker.test.jsx#L380-L404](../../test/JobTracker.test.jsx#L380-L404) — both failure tests

Trace:

| Step | Owner | File | What happens | Data shape | Risk |
|---|---|---|---|---|---|
| 1 | Any mutation | [L531](../../src/JobTracker.jsx#L531) | `setApps(next)` — user sees the change *now* | `App[]` | The optimistic bet |
| 2 | `persist` | [L533](../../src/JobTracker.jsx#L533) | `await storage.set(...)` throws (quota, host failure) | Error | localStorage quota (~5MB) is a real trigger |
| 3 | `persist` | [L536](../../src/JobTracker.jsx#L536) | `setSaveError(true)` | boolean | No retry, no queue |
| 4 | UI | [L672-L676](../../src/JobTracker.jsx#L672-L676) | `role="alert"` bar: change kept on screen, honesty about refresh risk | — | `role="alert"` → screen readers announce it |
| 5 | Next mutation | [L534](../../src/JobTracker.jsx#L534) | A later successful write does `setSaveError(false)` | — | Error state is *global*, not per-record — see senior note |

Validation and authorization: n/a.

Persistence and side effects: the in-memory array is now **ahead of** storage — a
deliberate, disclosed inconsistency. The wording of the message
("may not survive a refresh") is honest about exactly that.

Tests that cover it: [L381-L391](../../test/JobTracker.test.jsx#L381-L391) (bar appears,
no rollback), [L392-L403](../../test/JobTracker.test.jsx#L392-L403) (bar clears on next
success — including flipping the mock back to succeeding mid-test).

What juniors usually miss: that "optimistic without rollback" is a *choice*, not a bug.
Rollback needs the previous array kept around and a UX for yanking a row the user just
watched appear. For a single-user local app the cheaper honest-banner design wins.

What seniors notice: two overlapping `persist` calls have no ordering guarantee — an
older write could resolve after a newer one (out-of-order storage) or a stale
`setSaveError(false)` could mask a newer failure. With one human clicking, unreachable in
practice; under concurrency it's [risk R2](../09-reference/risk-register.md). The fix
vocabulary: serialize writes (a promise queue) or version them (write sequence numbers) —
both appear in [mid ticket M6](../06-contribution-practice/02-mid-level-feature-tickets.md).

Interview angle: "Optimistic vs pessimistic updates — when each?" and "How do you handle
storage quota errors?" — [cards A6, J9](../08-interview-prep/README.md).

Drill: the second failure test flips the mock back with
`storage.set.mockImplementation(async () => {})` ([L400](../../test/JobTracker.test.jsx#L400)).
Explain why the test *deletes a record* to trigger the clearing write rather than adding
one. (Hint: what UI is on screen at that point? The form already closed.) Then design, in
prose, per-record error state instead of the global boolean: what changes in the data
model, the UI, and the tests?
Self-grade — Solid: the mock-flip explained + a per-record `dirty`/`failed` flag sketch.
Strong: notes per-record state requires ids for *pending writes*, which pushes you toward
a write-queue design — and says whether that's worth it here (it isn't; scope).

---

## Rotation map

| Flow | Reused in |
|---|---|
| 1 Cold start | [Annotation drill 5](../04-code-reading-gym/01-annotation-drills.md), [Debugging scenario 2](../05-quality-engineering/03-systematic-debugging.md), [Interview F4](../08-interview-prep/02-frontend-framework-questions.md) |
| 2 Create | [Trace table 1](../04-code-reading-gym/02-trace-tables.md), [Kata 1](../04-code-reading-gym/04-review-katas.md), [Interview A2](../08-interview-prep/03-api-and-data-modeling-questions.md) |
| 3 Delete | [Debugging scenario 4](../05-quality-engineering/03-systematic-debugging.md), [Ticket M3](../06-contribution-practice/02-mid-level-feature-tickets.md) |
| 4 Sort/projection | [Fake-code pair 4](../04-code-reading-gym/03-fake-code-contrasts.md), [Interview F1](../08-interview-prep/02-frontend-framework-questions.md) |
| 5 Write failure | [Debugging scenario 1](../05-quality-engineering/03-systematic-debugging.md), [System design step 5](../08-interview-prep/04-system-design-from-this-repo.md) |
