# Trace Tables

Fill in each table yourself before opening the answer notes. Columns: **Step · File/Line ·
What happens · Value/shape at this point · Risk**. Answers are deliberately partial —
enough to check yourself, not enough to copy.

---

## Trace 1 (UI → persistence): typing "Stripe" and submitting

Start state: form open, empty. Event: user types `S`,`t`,`r`,`i`,`p`,`e`, clicks "Add application".

Rows you must produce: ≥8, from the first keystroke's `onChange` through the resolved
`storage.set`. Include the value of `form` after the first keystroke and the exact string
handed to `storage.set`.

Checkpoints: keystroke → [`setField("company")` L541](../../src/JobTracker.jsx#L541)
functional update (`{...f, company:"S"}`) → six renders (one per keystroke; `canSubmit`
recomputed each time, [L600](../../src/JobTracker.jsx#L600)) → submit path
[L568-L582](../../src/JobTracker.jsx#L568-L582) → payload
`[{"id":"<base36>","company":"Stripe","stack":"","date":"<today>","notes":""}]` →
[L533](../../src/JobTracker.jsx#L533). Risk column must include: closure-captured `apps`
at L579 (harmless here — why?).

## Trace 2 (persistence → UI): reload with two stored records

Start: storage holds `[{...Vercel...},{...Stripe...}]`. Event: page load.

Must include: both renders (loading, loaded), where the JSON string becomes objects
([L514](../../src/JobTracker.jsx#L514)), where the array becomes *sorted* copies
([L592](../../src/JobTracker.jsx#L592)), and which record renders first if Vercel's date
is `2026-03-04` and Stripe's is `""`. Risk: what if storage held `{"not":"an array"}`?
Trace *that* branch precisely ([L515](../../src/JobTracker.jsx#L515) — parsed truthy but
not array → no setApps → loaded empty list. The silent-lie state from
[pattern 5's drill](../03-architecture-and-patterns/05-pattern-catalog.md)).

## Trace 3 (error path): quota exceeded on delete

Start: 2 records, storage full. Event: delete the first, confirm.

Must include: `confirm` (blocking!), both cleanup checks
([L586-L587](../../src/JobTracker.jsx#L586-L587) — do they fire here? depends on what was
expanded), optimistic `setApps` (UI shows 1 row *now*), the throw inside
[storage.js#L26](../../src/storage.js#L26) (`setItem` throws `QuotaExceededError`), catch
→ `setSaveError(true)` → alert bar render. End-state row: memory=1 record,
storage=2 records, flag=up. Then the kicker row: user refreshes — what do they see?
(2 records — the delete undid itself. Is the error bar's wording honest about this? Read
[L674](../../src/JobTracker.jsx#L674) and judge.)

## Trace 4 (auth-shaped trace): who can write what, when

No auth exists, so trace the *gates* a mutation passes instead: for edit-submit —
`showForm` true (how did it get true?), `editingId` non-null (who set it?), `canSubmit`
true, handler re-check. Four gates, four owners, all in
[L551-L582](../../src/JobTracker.jsx#L551-L582). The point: even in a no-auth app,
mutations have preconditions with owners — the same table you'd build for a permissioned
API, with roles swapped for states. Risk rows: which gate is skippable by a test driving
the DOM directly? (None — the handler check is last. That's why it exists.)

## Trace 5 (render identity): sort flip with an expanded row

Start: 3 records, Newest sort, middle row's notes expanded. Event: click "A–Z".

Must include: `setSortBy` → re-render → new `sorted` order ([L592-L597](../../src/JobTracker.jsx#L592-L597))
→ React reconciles the `<ol>` **by key** ([L748](../../src/JobTracker.jsx#L748)) → the
expanded row *moves with its id* (expandedId still matches), gutter numbers renumber
([L427](../../src/JobTracker.jsx#L427) — positional). Risk: what would happen with
`key={i}` instead? (Expansion sticks to the *position*, not the record — the expanded
notes jump to whichever record now sits at that index. Write the exact wrong UI the user
would see.)

---

Rubric — **Basic:** right sequence, right files. **Solid:** value/shape column exact
(strings vs objects, render counts). **Strong:** every risk cell filled with something
*true and specific*, and traces 3/5's kicker questions answered.
