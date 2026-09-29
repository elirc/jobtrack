# Boundaries and Layers

"One file" does not mean "no architecture." This repo has three real boundaries; knowing
how to find boundaries *without* directory structure to guide you is the transferable
skill — plenty of production code has directories that lie about its boundaries.

## Boundary 1: Component ↔ Persistence

**The contract:** `window.storage` — async `get`/`set`, get rejects on missing key.
Consumed at exactly two call sites ([L512](../../src/JobTracker.jsx#L512),
[L533](../../src/JobTracker.jsx#L533)); implemented in [storage.js](../../src/storage.js);
documented at [JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12); pinned by
[storage.test.js](../../test/storage.test.js).

**What each side owns:** the component owns *what* to store (the array, the key, JSON
encoding); the shim owns *where* (localStorage) and *how* (string coercion, missing-key
semantics). The component must never mention `localStorage`; the shim must never know
what `jobtracker:data` contains. Verify both by search — this is a clean boundary.

**Why it's good:** swapping localStorage for IndexedDB, a file, or an HTTP backend
touches one file. The async contract already absorbs the latency difference
([02/01](../02-stack-and-language-mastery/01-language-runtime-model.md)).

## Boundary 2: Domain helpers ↔ React

[L86-L137](../../src/JobTracker.jsx#L86-L137): `parseISO`, `todayISO`, `formatDate`,
`relativeLabel`, `stackTokens`, `hasNotes`, `gutter`, `emptyForm` — pure functions, no
React imports, no state reads. They sit *above* the component in the file precisely
because they depend on nothing below.

**Why it's good:** these are unit-testable without a DOM and portable to any framework.
**The leak to notice:** they're not exported, so tests exercise them only *through* the
UI. Defensible (tests stay behavioral) but debatable — exporting them is
[junior ticket J11](../06-contribution-practice/01-good-first-tickets.md), and arguing
either side well is an interview moment.

## Boundary 3: Data shape ↔ Render shape

Stored: `stack` as one string. Rendered: a token list. The transform happens at render
time in one place ([`stackTokens` L126-L131](../../src/JobTracker.jsx#L126-L131) used by
[`StackTokens` L383-L395](../../src/JobTracker.jsx#L383-L395)). Same for dates: stored ISO
string, rendered "Mar 4, 2026 · 2 days ago" ([`DateStamp` L397-L405](../../src/JobTracker.jsx#L397-L405)).

**The principle:** storage shape optimizes for evolution and fidelity (raw user input,
sortable strings); render shape optimizes for the eye. Coupling them — storing the
pretty date, or the token array — makes every display tweak a data migration. This is
the same idea as "don't let your API mirror your DB tables," scaled down; see
[fake-code pair 1](../04-code-reading-gym/03-fake-code-contrasts.md).

## Where the layers blur (deliberately)

Styling lives in the component file (tokens [L19-L27](../../src/JobTracker.jsx#L19-L27),
CSS string [L35-L82](../../src/JobTracker.jsx#L35-L82), objects
[L141-L379](../../src/JobTracker.jsx#L141-L379)) — 240+ lines, ~31% of the file. The
single-file constraint ([SPEC §2](../../SPEC.md): portability) bought this cost
knowingly. A senior can name the exact break-even: the second component file that wants
these tokens forces extraction; until then, extraction is speculative generality.

## Drill

For each boundary, answer: *what change does it make cheap, and what change does it make
expensive?* (E.g., boundary 1 makes swapping storage cheap but makes per-record
operations expensive — the contract has no `getMany`/partial update.)
Self-grade — Basic: names the three boundaries. Solid: cheap/expensive answered for each.
Strong: also identifies which boundary is *load-bearing for tests* (boundary 1 — it's what
`fakeStorage` [JobTracker.test.jsx#L32-L51](../../test/JobTracker.test.jsx#L32-L51)
substitutes) and can say "a boundary you can't fake in tests isn't a boundary yet."
