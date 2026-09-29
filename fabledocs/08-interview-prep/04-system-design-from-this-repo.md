# System Design From This Repo

The whiteboard exercise: **"Design a job-application tracker."** You have an unfair
advantage — you know a real implementation completely. The method below walks the
standard design loop; at every step it shows *what this repo chose* (anchored), *why*,
and *what a stronger or simpler alternative looks like*. Then four variations scale it.

Practice: 35 minutes, out loud, whiteboard or paper. The junior/mid/senior contrast at
each step tells you what level your answer performed at.

---

## Step 1: Requirements (5 min)

Functional: record applications (company, stack, date, notes); browse sorted; notes
surface in their own view; edit/delete. Non-functional: instant interactions, data
survives sessions, single user, zero ops budget.

**This repo:** [SPEC §1](../../SPEC.md) — and its *non-goals list* (no status pipeline,
no reminders, no multi-user) is the artifact to imitate.
Junior sounds like: jumps to entities in the first minute.
Mid adds: asks scale/user questions first ("one user or many? offline? devices?") and
writes non-goals down.
Senior includes: interrogates the *product* ("what decision does this data serve? —
interview prep, hence notes-first design") and states the cost model (zero backend = zero
marginal cost — an actual requirement, not trivia).

## Step 2: API sketch (5 min)

**This repo's answer:** no network API — a storage *port*: async KV with
throw-on-missing ([JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12)). The domain
"API" is the component's handlers (`submit`/`remove`/`startEdit`), the contract with the
data is the record shape.
Stronger alternative when a server exists: `GET /applications?sort=`,
`POST/PATCH/DELETE /applications/:id` — but note what changes: partial updates appear,
and with them patch semantics, validation duplication, and per-record failure states.
Simpler alternative: none simpler than a KV port. That's the point — say it.
Junior: designs REST endpoints because that's the ritual.
Mid adds: matches the interface to the deployment (local-first → port, not routes) and
keeps serialization at the caller ([Q-A1](03-api-and-data-modeling-questions.md)).
Senior includes: the port as the *seam for every future* — the [S1 sync design](../06-contribution-practice/03-senior-build-projects.md)
swaps adapters with zero component changes; says "I'm buying optionality here, and here's
the proof it's real."

## Step 3: Data model (7 min)

**This repo:** one entity, five fields, each a defended decision
([Q-A4](03-api-and-data-modeling-questions.md)); one storage key, whole-array JSON
([L15](../../src/JobTracker.jsx#L15), [L533](../../src/JobTracker.jsx#L533)).
Why: atomic writes for free, trivial LWW semantics, zero round-trips
([03/02](../03-architecture-and-patterns/02-data-model-and-persistence.md)).
Stronger alternative: per-record keys + an index key — buys partial writes and smaller
I/O, costs multi-key consistency (torn writes between index and records — you now need
transactions you don't have). Wrong at this scale; right past ~1MB blobs.
Junior: normalizes immediately (five tables for one entity).
Mid adds: the single-blob tradeoff argued both ways with the flip condition named.
Senior includes: the missing version envelope as the real flaw
([critique risk #2](../03-architecture-and-patterns/06-architecture-critique.md)), and
schema-evolution policy (migrate-on-read, [Q-A8](03-api-and-data-modeling-questions.md))
designed *now* because it's 10× cheaper before v1 ships.

## Step 4: Core flows (8 min)

Walk create and load with failure paths — you know these cold:
[flow 2](../01-codebase-cartography/05-key-flows.md) (validate twice, optimistic apply,
honest failure banner) and [flow 1](../01-codebase-cartography/05-key-flows.md)
(loading gate, cancellation, corrupt-data policy).
Junior: happy paths.
Mid adds: failure UX per flow, the optimistic-update preconditions
([Q-A6](03-api-and-data-modeling-questions.md)), the loading tri-state.
Senior includes: the two *latent* races (lost-update closure [R2](../09-reference/risk-register.md),
id collision [R3](../09-reference/risk-register.md)) with reachability analysis — "impossible
today, and here is the exact feature that makes each reachable" is the single most
senior-sounding move in the whole exercise.

## Step 5: Scaling concerns (5 min)

For *this* product, "scale" means data growth and feature growth, not QPS — say so
instead of reciting load balancers:
- Data: whole-blob writes go quadratic-ish with record count × mutation rate; localStorage
  ~5MB ceiling; the escape is IndexedDB then per-record storage then a server ([perf guide](../05-quality-engineering/04-performance-thinking.md) has the measured seed experiment).
- Render: DOM before compute — virtualize ~500 rows.
- The un-scalable part: no sync. That's variation V1, not a patch.
Junior: adds Redis.
Mid adds: identifies that the bottlenecks are *local* (blob size, DOM) with numbers.
Senior includes: refuses to scale what the product doesn't need — "this design is
*correctly* unscalable; scaling it is a different product" — then designs V1 cleanly when asked.

## Step 6: Tradeoffs recap (5 min)

Close with the three headline decisions and their costs, quoting the
[critique](../03-architecture-and-patterns/06-architecture-critique.md): optimistic
no-rollback (cost: post-failure divergence, disclosed); single-blob LWW (cost: multi-tab
clobber, accepted in spec); no framework beyond React (cost: hand-rolled patterns —
benefit: total legibility). End on the under-budget line: *"the architecture spends less
complexity than it can afford, on purpose."*

---

## Variations (10 min each, aloud)

### V1: "Now make it multi-device"
Expected shape: the [S1 design](../06-contribution-practice/03-senior-build-projects.md) —
HTTP adapter behind the same port; ETag optimistic concurrency; LWW *with detection*
surfaced to the user; offline queue collapsing to dirty-blob ([kata K2's insight](../06-contribution-practice/04-refactor-and-design-katas.md));
auth appears and with it the entire [03/03](../03-architecture-and-patterns/03-validation-auth-and-permissions.md)
authz conversation. Senior move: id migration (timestamp → UUID) called out as a
*prerequisite*, with the collision story.

### V2: "Now 10,000 users" (multi-tenant SaaS)
Expected shape: real backend, per-user data partitioning, authn (sessions/OAuth) + authz
on every query (ownership checks — the IDOR conversation this repo made "impossible by
construction" now becomes "defended by checks," and you must say where the checks go);
the single-blob model dies (per-record rows + indexes); rate limiting and abuse appear.
The trap: candidates redesign the *frontend* — almost nothing changes there; say so.

### V3: "Add real-time collaboration on notes"
Expected shape: this is the CRDT/OT boundary — LWW is now user-visible data loss;
options ladder: field-level merge → per-paragraph merge → Yjs-style CRDT; presence and
cursors; the storage port grows a subscribe capability. Senior move: question the
requirement ("is *collaborative* notes actually the product? or is share-readonly 90% of
the value at 10% of the cost?").

### V4: "10× data: the user imports 50k records"
Expected shape: pagination/virtualization; move projections
([L592-L598](../../src/JobTracker.jsx#L592-L598)) from per-render to memoized/indexed;
IndexedDB with real queries; import as a streaming validated pipeline
([M2's validations](../06-contribution-practice/02-mid-level-feature-tickets.md) at scale);
id collisions become certainties ([R3](../09-reference/risk-register.md)).

---

## Grading yourself

Record a run (audio is fine). Score: named non-goals in step 1? argued the blob both ways
in step 3? volunteered latent races in step 4? refused fake scaling in step 5? closed with
costs, not features? 4/5 = mid-level performance; 5/5 with the reachability analysis and
a requirement-questioning move = senior signal.
