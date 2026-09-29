# Mid-Level Feature Tickets

Ten tickets that cross layers (data shape ↔ logic ↔ UI ↔ tests). **Design notes are
required before implementation** — a half-page: approach, alternatives rejected, risk,
rollback. That artifact is the mid-level skill being trained; the code is the receipt.

---

## Ticket M1: Versioned storage envelope + `parseApps` gate
Difficulty: Hard — 4-6 hrs. Skills: schema migration, boundary centralization.
Story: As the maintainer, I want stored data versioned so future schema changes are safe.
Why good: unlocks every future data ticket; centralizes the scattered guards ([pattern 8](../03-architecture-and-patterns/05-pattern-catalog.md)).
Read first: [03/02 §"How to safely change the schema"](../03-architecture-and-patterns/02-data-model-and-persistence.md); anchors [L513-L515](../../src/JobTracker.jsx#L513-L515), [L533](../../src/JobTracker.jsx#L533), guards [L553-L556](../../src/JobTracker.jsx#L553-L556), [L595-L596](../../src/JobTracker.jsx#L595-L596).
Acceptance: writes produce `{version:1, apps:[...]}`; reads accept bare arrays (v0) *and* envelopes forever; one `parseApps(raw)` function owns all normalization (missing fields → `""`); old-shape fixture tests; the now-redundant scattered guards removed **in a separate commit** so the diff proves what the gate replaced.
Risk & rollback: readers accept both shapes → reverting the writer is safe at any time. State this in the PR.
What could go wrong: forgetting the corrupt-JSON test's expectations; sneaking normalization *and* envelope into one commit (reviewability).
Interview story potential: "I versioned an unversioned production data format with zero-downtime semantics" — miniature but structurally identical to the real thing.

## Ticket M2: JSON export / import
Difficulty: Hard — 5-8 hrs. Skills: file I/O in the browser, input validation, id policy.
Story: As the user, I want my data out (backup) and in (restore/migrate machines).
Read first: [03/03's import drill](../03-architecture-and-patterns/03-validation-auth-and-permissions.md) — it enumerates the validations this ticket must implement.
Acceptance: export downloads the current blob (envelope form); import validates shape per record, **regenerates colliding ids** (`crypto.randomUUID()`), previews count before applying, merges-or-replaces (user choice), all through `persist`; tests incl. hostile input (non-array, missing fields, duplicate ids, 10MB string).
Risk: import is the app's first real untrusted-input boundary; rollback = export-before-import (make the UI do this automatically — belt and suspenders).
Interview story potential: strong — validation design + id policy + UX safety in one story.

## Ticket M3: Undo delete (soft window)
Difficulty: Hard — 4-6 hrs. Skills: state design, timers, UX honesty.
Story: replace the `confirm` with post-delete undo (toast: "Deleted Vercel — Undo", ~8s).
Read first: [flow 3](../01-codebase-cartography/05-key-flows.md); [pattern 3](../03-architecture-and-patterns/05-pattern-catalog.md) (the funnel makes capture trivial).
Design note must answer: where does the deleted record live during the window (state? storage?) — if only state, a refresh during the window loses the undo; is that acceptable? (Spec it either way.) What happens on a second delete during the window?
Acceptance: undo restores the record *at its original array position* (not appended — order is insertion order, [annotation drill 8](../04-code-reading-gym/01-annotation-drills.md)); timer cleanup on unmount; fake-timer tests.
Reject-risk: leaving the `confirm` AND adding undo (double friction); timer leaks.
Interview story potential: "replaced confirmation with undo" is a classic UX-engineering story with real state-design meat.

## Ticket M4: Search/filter by company and stack token
Difficulty: Medium — 3-4 hrs. Skills: derived state at scale, input debouncing judgment.
Story: [SPEC §9](../../SPEC.md) future-work item 1.
Acceptance: a filter input above the list; case-insensitive match on company or any stack token; filtering composes with both sorts and the Notes tab (decide and document: does Notes filter too?); empty-result state distinct from empty-list state; **no debounce** unless you measure a need (PR must say which you did — [perf guide](../05-quality-engineering/04-performance-thinking.md) discipline).
Anchors: derived chain [L592-L598](../../src/JobTracker.jsx#L592-L598) — extend the projection pipeline, don't add state.
Interview story potential: derived-state pipeline design + a measured performance decision.

## Ticket M5: Status pipeline (the spec-changing ticket)
Difficulty: Hard — 6-10 hrs. Skills: spec negotiation, enum modeling, migration.
Story: users want Applied/Interviewing/Offer/Rejected — **which SPEC §1 explicitly lists as a non-goal.** The first deliverable is a spec-change PR arguing scope, not code.
Depends on: M1 (new field on old records).
Acceptance (if spec change accepted): `status` with default `"applied"` for legacy records via `parseApps`; UI chips + filter; tests incl. migration fixture. Follow [pattern 12](../03-architecture-and-patterns/05-pattern-catalog.md) for status colors.
Reject-risk: building it without the spec conversation — that's the trap; the ticket *is* the conversation.
Interview story potential: "I challenged and changed a spec before implementing" — high-value behavioral material.

## Ticket M6: Serialize concurrent writes
Difficulty: Medium — 2-3 hrs. Skills: async correctness.
Story: close [risk R2](../09-reference/risk-register.md) before any second-writer feature (M3's timer! sync!) makes it reachable.
Read first: [03/04 §ordering](../03-architecture-and-patterns/04-side-effects-async-and-reliability.md).
Acceptance: `persist` chains onto a module-level promise queue (writes apply in call order; the error flag reflects the *latest settled* write); mutations build `next` via functional state access (fixing the closure half of R2); a test with two interleaved slow writes asserting final storage order.
What could go wrong: deadlocking the queue on a rejected write (the chain must swallow-and-continue); over-engineering into a full outbox.
Interview story potential: "fixed a latent lost-update race before it shipped" + you can whiteboard the promise-queue.

## Ticket M7: Multi-tab awareness
Difficulty: Hard — 4-6 hrs. Skills: browser events, conflict UX.
Story: two tabs currently clobber each other silently ([03/02 consistency model](../03-architecture-and-patterns/02-data-model-and-persistence.md)).
Depends on: M6 (don't add a second writer before serializing).
Acceptance: listen to the `storage` event; on external change, reload data if no unsaved local divergence, else show a choose-version bar (design note must define "divergence" precisely); tests simulate the event.
Reject-risk: attempting merge (CRDT territory — explicitly out of scope; the design note must draw this line).
Interview story potential: real distributed-systems-lite reasoning in 200 lines.

## Ticket M8: Extract styling into a module (when the constraint lifts)
Difficulty: Medium — 3 hrs. Skills: refactor sequencing, deciding *when*.
Story: premise-checking ticket — [critique change #4](../03-architecture-and-patterns/06-architecture-critique.md) says extract *only when a second component file appears*. The deliverable: a design note stating whether that condition is met (it isn't, today), and a prepared-but-unmerged branch showing the mechanical extraction (tokens+styles → `src/theme.js`) with zero behavior change (suite green as proof).
Interview story potential: "I prepared a refactor and argued for NOT merging it yet" — memorable and senior.

## Ticket M9: Playwright smoke suite
Difficulty: Medium — 3-4 hrs. Skills: E2E judgment.
Story: [05/01's known gap](../05-quality-engineering/01-testing-strategy.md) — nothing tests a real browser.
Acceptance: 3 tests max (create-refresh-persist round-trip against real localStorage; sort flip; delete confirm) — the design note must justify *why only three* (E2E pays per-test maintenance tax; cover only what jsdom can't).
Interview story potential: "right-sized an E2E layer" — the justification is the story.

## Ticket M10: `createdAt`/`updatedAt` timestamps
Difficulty: Medium — 3 hrs. Skills: additive schema change end-to-end (the M1 payoff).
Story: [SPEC §9](../../SPEC.md) future-work item 6; enables kata 2's honest fix.
Depends on: M1.
Acceptance: new records get both (ISO datetime); edits touch `updatedAt` only; legacy records get `null` (not fabricated dates — design note must defend this against the tempting "backfill from id timestamp" alternative… or take that alternative and defend *it*); tie-break sort uses `createdAt` when dates equal; fixture tests.
Interview story potential: a complete additive-migration story: schema, default policy, consumer change, tests.
