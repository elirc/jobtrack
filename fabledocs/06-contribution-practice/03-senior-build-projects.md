# Senior Build Projects

Five projects, 2 days to ~3 weeks. Each is scoped like a real epic: problem, value,
design checklist, likely files, migration/test/security/perf/rollout plans, open
questions, stretch goals. Do at most two; do them *completely* — half-done epics teach
the wrong lesson.

---

## Project S1: Sync backend (the port pays off)

**2-3 weeks.** Problem: data lives in one browser profile; users want it on two machines.
Product value: the single biggest real limitation, removed.

Design checklist: implement a second `window.storage` adapter speaking to a minimal
HTTP service (Node/Express or .NET Minimal API — your interview stack) with
`GET/PUT /data` + ETag-based optimistic concurrency; keep localStorage as offline cache;
define conflict policy (last-write-wins with *detection* — surface, don't merge, per
[M7](02-mid-level-feature-tickets.md)'s line).
Architecture decisions to write down: where does the adapter live (new `src/storage-http.js`
implementing the same contract — [pattern 1](../03-architecture-and-patterns/05-pattern-catalog.md)
is the whole thesis); auth (single-user token is honest scope); does `persist`'s
optimistic model survive network latency (yes — it was designed for this; say why).
Likely files: `src/storage-http.js`, server project, [main.jsx](../../src/main.jsx)
(adapter selection), zero changes to JobTracker.jsx — **that zero is the deliverable's
proof of the architecture**.
Migration plan: local blob uploads on first sync; envelope (M1) prerequisite.
Test plan: contract tests *shared* between shim and HTTP adapter (same suite, two
implementations — extend [storage.test.js](../../test/storage.test.js)); server tests; one
conflict E2E.
Security plan: token auth, HTTPS-only, size limits, the [import validations](../03-architecture-and-patterns/03-validation-auth-and-permissions.md) server-side.
Perf plan: whole-blob PUT is fine to ~1MB; document the partial-update escape hatch you're *not* building.
Rollout/rollback: adapter behind a flag; rollback = flip back to shim (data still local).
Open questions: offline queue depth? multi-device id collisions (forces UUID migration)?
Stretch: `storage` event + server-sent events for live two-tab sync.
Interview story potential: a complete "took a local app multi-device, kept the core
untouched via ports-and-adapters, chose LWW-with-detection and can defend it" — this is
a *system design interview answer you built*.

## Project S2: Offline-first PWA with background durability

**1 week.** Problem: it's a job tracker — users fill it on phones, in transit.
Value: installable, offline, durable.
Design checklist: manifest + service worker (Vite PWA plugin); move storage to IndexedDB
(new adapter — again zero component changes); storage estimate API + quota UX replacing
the generic error bar.
Decisions: cache strategy for the shell (stale-while-revalidate vs precache — argue);
does the fonts `@import` survive offline (no — [J8](01-good-first-tickets.md) becomes a
prerequisite; self-host).
Test plan: adapter contract suite reuse; Playwright offline-mode round-trip.
Perf: Lighthouse PWA pass as the acceptance gate.
Rollout: PWA is additive; rollback = remove manifest.
Open questions: iOS storage eviction (7-day rule) — what's the mitigation story? (Export nudge.)
Interview story potential: PWA + storage-eviction realities — uncommon, memorable.

## Project S3: The multi-entity version (schema growth under discipline)

**2 weeks.** Problem: real tracking wants contacts, interview rounds, and per-round notes —
one entity becomes four.
Value: the app people actually ask for.
Design checklist: entities `Application ↔ Contact (n:m via role) ↔ Round (1:n) ↔ Note (1:n polymorphic?)` —
model it three ways (nested blob, normalized maps + id refs, per-entity keys) and choose
with a written tradeoff table (hint: normalized maps in one envelope keeps atomic writes —
[03/02](../03-architecture-and-patterns/02-data-model-and-persistence.md)'s consistency
argument decides this).
Migration: v1→v2 upgrader inside `parseApps`' chain (M1 prerequisite); fixtures for every
historical shape.
Test plan: migration fixtures, referential-integrity property tests (every ref resolves),
UI behavior per entity.
Security: unchanged surface (still local) — but note how authz *would* attach per-entity later.
Perf: derived projections now join across maps — memoize *if measured* ([perf guide](../05-quality-engineering/04-performance-thinking.md)).
Rollout: v2 written only after first successful v1 read+migrate; rollback window = keep v1 blob under a backup key for one release.
Open questions: does the Notes tab become per-round? (Product call — write the spec first, [pattern 14](../03-architecture-and-patterns/05-pattern-catalog.md).)
Interview story potential: *the* data-modeling story — "grew 1 entity to 4 with migrations, integrity checks, and a written tradeoff table."

## Project S4: Extract and publish the storage-port toolkit

**2-4 days.** Problem: the shim + contract-test pattern is reusable; make it a tiny
published package (`@you/kv-port`: contract types via JSDoc or TS, localStorage/memory/
IndexedDB adapters, and the *contract test suite as an export* — consumers run it against
their own adapters).
Value: OSS contribution muscle: packaging, semver, docs, publishing.
Decisions: dual ESM/CJS or ESM-only (argue from [02/04](../02-stack-and-language-mastery/04-tooling-and-build-system.md));
API freeze policy ([pair 8](../04-code-reading-gym/03-fake-code-contrasts.md) — error
semantics ARE the API).
Test plan: the exported contract suite run against all three adapters in CI.
Rollout: jobtrack consumes the package as its first user; rollback = vendored copy.
Interview story potential: "I published a package whose main export is a *test suite*" —
excellent conversation bait, demonstrates contract thinking.

## Project S5: Analytics view (derived data at its limit)

**1 week.** Problem: users want "applications per week," "stack frequency," "days since
last activity."
Value: the tracker becomes a feedback loop.
Design checklist: everything derived at render from the one array — **no stored
aggregates** (write down why: single source, small N, [pattern 4](../03-architecture-and-patterns/05-pattern-catalog.md)
taken to its limit); pure aggregation helpers (exported, unit-tested — the [J11](01-good-first-tickets.md)
precedent); a third tab following the existing tab pattern ([L616-L638](../../src/JobTracker.jsx#L616-L638)).
Charts: SVG by hand or a tiny dep — argue the dependency cost either way ([security checklist Q3](../05-quality-engineering/05-security-checklist.md)).
Test plan: aggregation helpers get exhaustive unit tests (empty, single, ties, undated records — the `""` date policy propagates here; decide bucket-or-exclude and spec it).
Perf: aggregation is O(n) per render — memo when measured, and this project is the first place measurement might actually say yes.
Open questions: week boundaries (locale Monday/Sunday!) — the [civil-date semantics](../05-quality-engineering/03-systematic-debugging.md) return at aggregate scale.
Interview story potential: derived-data discipline + date-semantics judgment + a dependency decision — three interview threads from one feature.
