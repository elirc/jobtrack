# Fake-Code Contrasts

Eight pairs. Each "bad" version is a real instinct a junior acts on; the "better" version
is what this repo actually does (anchored). Study the *why*, not the syntax. All snippets
are labeled fake; the anchors are the real code.

---

## Pair 1: Coupling render shape to storage shape

```js
// Illustrative fake code: not from this repo — BAD
// Store tokens pre-split so render is "simpler"
const record = { company, stackTokens: stack.split(",").map(s => s.trim()), date };
```

Problems: what the user typed is gone (was it `"a, b"` or `"a,b"`?); every future render
tweak (different separator? keep empties?) becomes a data migration; the edit form now
has to *join* tokens back and guess the original.

Better — store raw, split at render:
[`stack` stored untouched (L574)](../../src/JobTracker.jsx#L574), tokenized only in
[`stackTokens` L126-L131](../../src/JobTracker.jsx#L126-L131). [Pattern 6](../03-architecture-and-patterns/05-pattern-catalog.md).

## Pair 2: The stored-copy of derived data

```js
// Illustrative fake code: not from this repo — BAD
const [notedApps, setNotedApps] = useState([]);
useEffect(() => { setNotedApps(apps.filter(a => a.notes.trim())); }, [apps]);
```

Problems: an extra render every change (effect runs post-commit); a window where the
views disagree; crashes on `notes: undefined` from old records; one more thing every
mutation author must know exists.

Better — [`noted` as a render-time projection, L598](../../src/JobTracker.jsx#L598).
[Pattern 4](../03-architecture-and-patterns/05-pattern-catalog.md).

## Pair 3: Boolean data check instead of a loading gate

```jsx
// Illustrative fake code: not from this repo — BAD
{apps.length === 0 ? <Empty /> : <List apps={apps} />}
```

Problem: for the first ~50ms every returning user with data sees "No applications yet" —
a flash of a *false statement*. Worse on slow storage.

Better — tri-state via `loaded`:
[L738-L743](../../src/JobTracker.jsx#L738-L743), flag flipped in `finally`
([L520-L522](../../src/JobTracker.jsx#L520-L522)). [Pattern 5](../03-architecture-and-patterns/05-pattern-catalog.md).

## Pair 4: Mutating sort

```js
// Illustrative fake code: not from this repo — BAD
const sorted = apps.sort((a, b) => b.date.localeCompare(a.date));
```

Two bugs in one line: `.sort()` mutates `apps` **in place** — state changed without
setState (React may never re-render, and insertion order in storage is destroyed on next
persist); and `b.date` throws on a record with no date field.

Better — copy + guards: [L592-L595](../../src/JobTracker.jsx#L592-L595)
(`[...apps].sort`, `(b.date || "")`).

## Pair 5: Swallowing the write error

```js
// Illustrative fake code: not from this repo — BAD
const persist = async (next) => {
  setApps(next);
  window.storage.set(KEY, JSON.stringify(next)).catch(() => {}); // fire and forget
};
```

Problem: the user's data silently stops persisting; they find out at the next refresh,
with no idea which changes died. Compare the real failure-visibility decision:
[`setSaveError(true)` L536](../../src/JobTracker.jsx#L536) → honest banner
([L672-L676](../../src/JobTracker.jsx#L672-L676)). The rule from
[03/04](../03-architecture-and-patterns/04-side-effects-async-and-reliability.md): swallow
cosmetic failures, surface durability failures.

## Pair 6: Validation only in the UI

```jsx
// Illustrative fake code: not from this repo — BAD
<button type="submit" disabled={!form.company.trim()}>Add</button>
// ...and submit() just trusts it: persist([...apps, {id, ...form}])
```

Problem: the disabled button is presentation. Forms submit on Enter; tests and future
code call handlers directly; one refactor of the button and the rule evaporates —
whitespace-only companies enter storage forever.

Better — the rule lives in the mutation path *too*:
[L570-L571](../../src/JobTracker.jsx#L570-L571) (and the button gate is UX sugar,
[L600](../../src/JobTracker.jsx#L600) + [L729](../../src/JobTracker.jsx#L729)).

## Pair 7: setState after await, no cancellation

```js
// Illustrative fake code: not from this repo — BAD
useEffect(() => {
  window.storage.get(KEY).then(r => setApps(JSON.parse(r.value)));
}, []);
```

Problems: unmount before resolution → setState on dead component; StrictMode dev
double-mount → first mount's promise still lands; corrupt JSON → unhandled rejection
crashes the load path entirely (no catch!).

Better — the full ceremony and *why each piece exists*:
[L508-L527](../../src/JobTracker.jsx#L508-L527); [pattern 10](../03-architecture-and-patterns/05-pattern-catalog.md).

## Pair 8: The casual contract change

```js
// Illustrative fake code: not from this repo — BAD
// "cleanup": make get() return null instead of throwing — fewer try/catches!
async get(key) { return { value: store.getItem(key) }; } // value: null when absent
```

Looks like a simplification; actually breaks the consumer silently: the load effect's
catch never fires, `result.value` is null, the `if (result && result.value)` check
([L513](../../src/JobTracker.jsx#L513)) *happens* to save it here — but the contract test
([storage.test.js#L10-L13](../../test/storage.test.js#L10-L13)) fails, which is the
system working. The lesson: **changing error semantics is a breaking change even when no
type signature moves.** Public contracts change by RFC, not by cleanup commit
([07/02](../07-career-and-collaboration/02-writing-prs-and-rfcs.md)).

---

Drill: for any two pairs, write the *test* that would catch the bad version. Rubric —
Solid: test names the observable symptom (flash, stale view). Strong: test would survive
refactors (asserts behavior via the storage contract or the DOM, not internals).
