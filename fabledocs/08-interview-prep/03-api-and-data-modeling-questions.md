# API and Data-Modeling Cards (A1–A10)

The repo's "API" is the storage contract and its data model — small, but every card below
scales the same reasoning to REST/DB questions, and says how.

---

## Q-A1: "Design a key-value storage API. What are the decisions?"
Round: API design. Really testing: contract thinking on a toy you can't hide behind.
Repo anchor: [storage.js](../../src/storage.js) + the documented contract [JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12).
Junior: "get, set, delete."
Mid adds: the real decisions — async or sync (async: room for real I/O later, [Q-J2](01-js-ts-node-deep-dive.md)); missing-key semantics (throw vs undefined — mine throws, making first-run handling *mandatory* at the caller); value typing (strings only — serialization is the caller's job, keeping the port dumb); return shapes (`{key, value}` envelopes).
Senior includes: what's deliberately absent — no `getMany`, no partial update, no watch/subscribe — and that absence as scope control; plus versioning strategy for the contract itself ([pair 8](../04-code-reading-gym/03-fake-code-contrasts.md): error semantics are API).
Follow-ups: "add TTL — what changes?" "make it multi-process safe."
Drill: [pattern 7's drill](../03-architecture-and-patterns/05-pattern-catalog.md) — redesign with `undefined` returns, argue both.

## Q-A2: "Walk me through a write path end to end."
Round: API/fullstack. Really testing: can you narrate a mutation with all its concerns.
Repo anchor: [flow 2](../01-codebase-cartography/05-key-flows.md) — validate → build → optimistic apply → persist → error surface.
Junior: narrates the happy path.
Mid adds: the concern checklist at each step — validation at the mutation path not just UI ([L570-L571](../../src/JobTracker.jsx#L570-L571)), id generation policy, atomicity (whole-array write), failure UX. Then maps it to a REST equivalent: request validation → domain op → transaction → 4xx/5xx contract.
Senior includes: idempotency of the write (whole-state = naturally idempotent; delta APIs need keys), and where the same flow grows authz, audit, and events when a server exists ([08/04 step 4](04-system-design-from-this-repo.md)).
Follow-ups: "where would a duplicate-submit bug come from and how do you prevent it?"
Drill: narrate flow 2 in 90 seconds, then re-narrate as `POST /applications`.

## Q-A3: "How do you sort/paginate/filter — client or server?"
Round: API/data. Really testing: where computation belongs and why.
Repo anchor: all client-side projections [L592-L598](../../src/JobTracker.jsx#L592-L598); no pagination — the honest reason (N is small, all data is local).
Junior: "server-side for big data, client for small."
Mid adds: the actual criteria — data volume vs transfer cost, freshness, query capability; my repo holds the entire dataset in memory so projections are free and always-consistent; pagination would be *pure* overhead. The flip point: when data can't fully live on the client, sorting must move server-side or you're sorting a partial set — a correctness bug, not a perf choice.
Senior includes: cursor vs offset pagination (stability under concurrent writes), and sort keys as API contract (my ISO-date trick — lexicographic string sort matching chronological — is exactly why ISO-8601 is the API timestamp answer, [L595](../../src/JobTracker.jsx#L595)).
Follow-ups: "user sorts by a computed field the DB doesn't have — options?"
Drill: say the partial-set correctness bug in one sentence.

## Q-A4: "Model this schema. Defend your field types."
Round: data modeling. Really testing: deliberateness per field.
Repo anchor: [SPEC §3](../../SPEC.md) + [03/02](../03-architecture-and-patterns/02-data-model-and-persistence.md) — five fields, each a decision: string id (why not int), ISO string date (why not epoch/Date), free-text stack (why not array/enum), notes with whitespace-only-means-empty semantics ([`hasNotes` L133](../../src/JobTracker.jsx#L133)).
Junior: reasonable types, no whys.
Mid adds: the whys — sortable-as-string dates; store-raw-format-at-edge for stack ([pattern 6](../03-architecture-and-patterns/05-pattern-catalog.md)); and one *rejected* alternative per field.
Senior includes: evolution pressure — which field breaks first under growth (stack → structured skills), what the migration looks like ([M1](../06-contribution-practice/02-mid-level-feature-tickets.md)'s envelope), and semantic invariants that types can't hold (date is a civil date — [Q-J6](01-js-ts-node-deep-dive.md)).
Follow-ups: "add tags — string array or join table?" (Context-dependent; show you know what decides it.)
Drill: 2 minutes: model the same record for Postgres; note every place the answer changed and why.

## Q-A5: "What's a contract test and when do you need one?"
Round: API/testing. Really testing: integration-boundary maturity.
Repo anchor: [storage.test.js](../../test/storage.test.js) pinning reject-on-missing; its twin [`fakeStorage`](../../test/JobTracker.test.jsx#L32-L51) honoring the same semantics.
Junior: "tests for your API endpoints."
Mid adds: the drift problem it solves — my component tests run against a fake; the contract test pins the *real* adapter to the same semantics, so the fake can't quietly diverge. Fake + contract test are two halves of one guarantee.
Senior includes: scaling it — consumer-driven contracts (Pact et al) when the two sides are different teams; running one suite against all implementations ([project S4](../06-contribution-practice/03-senior-build-projects.md) exports the suite as the product).
Follow-ups: "how do you know your mocks are honest?" (This *is* the answer.)
Drill: name the exact behavior that would break silently if the contract test vanished and the shim changed to return null.

## Q-A6: "Optimistic vs pessimistic updates"
Round: API/frontend seam. Really testing: consistency-UX tradeoffs.
Repo anchor: [`persist` L530-L538](../../src/JobTracker.jsx#L530-L538) + [flow 5](../01-codebase-cartography/05-key-flows.md).
Junior: definitions, "optimistic feels faster."
Mid adds: the three-option frame with my concrete pick and its preconditions (single writer, self-healing whole-state writes, honest failure disclosure) — and the test evidence ([L380-L404](../../test/JobTracker.test.jsx#L380-L404)).
Senior includes: rollback mechanics (snapshot vs inverse-op), server reconciliation (client temp-ids swapped for server ids — connects to [Q-A7](#q-a7-how-do-you-generate-ids-clientserverdb)), and the product lens: optimism is a *promise about failure rates* — don't promise what your infra can't keep.
Follow-ups: "your optimistic update conflicts with a concurrent server change — now what?"
Drill: [flow 5's per-record error design](../01-codebase-cartography/05-key-flows.md), aloud.

## Q-A7: "How do you generate IDs? Client/server/DB?"
Round: API/data. Really testing: uniqueness/ordering/authority reasoning.
Repo anchor: [`Date.now().toString(36)` L579](../../src/JobTracker.jsx#L579) + [risk R3](../09-reference/risk-register.md).
Junior: "UUIDs."
Mid adds: the requirements grid — uniqueness scope, sortability, authority, offline capability; my timestamp id is honest for exactly single-user-single-device and I can name the features that break it (import, sync, bulk) and the upgrade ladder (randomUUID → ULID → server-issued).
Senior includes: distributed subtleties — client-generated UUIDs enable offline-first and idempotent retries (the id *is* the dedup key); ordering-by-id as a trap ([kata 2](../04-code-reading-gym/04-review-katas.md)'s base-36 length bug is my worked example).
Follow-ups: "why might a DB auto-increment id leak information?" 
Drill: recite the upgrade ladder with the requirement each rung answers.

## Q-A8: "Design a migration for a breaking schema change with zero downtime."
Round: data. Really testing: the expand/contract discipline.
Repo anchor: [03/02's envelope + migrate-on-read plan](../../fabledocs/03-architecture-and-patterns/02-data-model-and-persistence.md) — localStorage version of the same shape; [M1](../06-contribution-practice/02-mid-level-feature-tickets.md).
Junior: "write a migration script, run it during a maintenance window." (The phrase "maintenance window" is the junior tell.)
Mid adds: expand → dual-read (readers accept both shapes) → migrate/backfill → contract; my repo's version: envelope with version field, migrate-on-read chain, writers always current, reverting the writer is safe because readers tolerate both.
Senior includes: the sequencing constraint (deploy readers-tolerant *before* writers-new — in my single-binary app they ship together, which is exactly why I can say what a distributed deploy adds); fixtures for every historical shape as the test strategy.
Follow-ups: "how long do you keep the dual-read code?" (Until telemetry says old shapes are gone — which needs telemetry; honest gap in local-first.)
Drill: whiteboard M1's before/after JSON and the read path.

## Q-A9: "Where does validation belong?"
Round: API. Really testing: layering discipline.
Repo anchor: the [validation map](../03-architecture-and-patterns/03-validation-auth-and-permissions.md) — double-enforced company rule, write-permissive/read-defensive dates.
Junior: "validate on the backend, frontend validation is UX."
Mid adds: correct — and here's the *whole* map for my app: UI gate for feedback, mutation-path check as the rule, boundary guards for old data; plus the consistency principle (write-strict vs read-defensive — pick one per field *on purpose*, mine is reader-pays for dates and writer-pays for company).
Senior includes: the invariant framing — validation is invariant *enforcement*, so first write down the invariants and who owns each; then the layers fall out. And the failure smell: the same rule implemented differently in two layers (drift = eventual contradiction).
Follow-ups: "your client and server validators disagree — what happens?"
Drill: for `date`, say aloud where every reader defends ([L595](../../src/JobTracker.jsx#L595), [L105-L109](../../src/JobTracker.jsx#L105-L109), [L112-L114](../../src/JobTracker.jsx#L112-L114)).

## Q-A10: "Consistency models — what does your app actually guarantee?"
Round: data/system. Really testing: precision about guarantees.
Repo anchor: [03/02's consistency section](../03-architecture-and-patterns/02-data-model-and-persistence.md) — strict within-tab, LWW across tabs, memory-ahead-of-storage after failures.
Junior: "it's consistent because there's one store."
Mid adds: the three-scope decomposition with mechanisms — atomic whole-value writes (no torn state), no cross-tab coordination (documented LWW), disclosed divergence on failure. Precision like "guaranteed at rest, not during in-flight writes" ([annotation drill 2](../04-code-reading-gym/01-annotation-drills.md)).
Senior includes: mapping to the standard vocabulary (single-writer linearizability trivially; LWW as a *conflict resolution policy* not a consistency level; what adding sync would force you to choose) — and the meta-skill: stating guarantees as *what the user can observe*, not implementation trivia.
Follow-ups: "two tabs, interleaved edits — walk me through exactly what's lost."
Drill: trace the two-tab clobber concretely: tab A adds record 4, tab B (stale at 3) deletes record 1 and saves — what's in storage? (B's 2-record array; A's addition is gone. Say it without hesitating.)
