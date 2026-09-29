# Data Model and Persistence

## The model

One entity. No relations, no indexes, no migrations *yet* — which makes this the cleanest
possible place to learn what those things are *for*, because you can see exactly what
their absence costs and when.

```
App {
  id:      string   // Date.now().toString(36) at creation — L579
  company: string   // required, trimmed — L570, L574
  stack:   string   // free text, comma convention — stored raw
  date:    string   // ISO "YYYY-MM-DD" or "" — sortable lexicographically
  notes:   string   // long-form, may be multiline
}
```

Storage: the whole array, JSON, one key — `jobtracker:data`
([L15](../../src/JobTracker.jsx#L15)), written atomically per mutation at
[L533](../../src/JobTracker.jsx#L533).

## Consistency model — name it precisely

- **Within one tab:** strictly consistent — one source of truth in memory, whole-array
  writes. There is no partial-write state; a crashed write leaves the *previous complete
  array* in storage. Single-key whole-value writes give you atomicity for free — say
  this in interviews; it's why the design avoids per-record keys and the torn-write
  problem they'd introduce.
- **Across tabs:** last-write-wins, no merge, no conflict detection
  ([SPEC §8](../../SPEC.md) accepts this). Two tabs open → the later save silently
  discards the earlier tab's changes. Not a bug; a *documented scope decision*. The fix
  vocabulary (know it, don't build it): `storage` events for cross-tab sync, version
  vectors or timestamps for conflict detection, CRDTs/event logs for real merging.
- **Memory vs storage:** optimistic writes mean memory can run *ahead* of storage after a
  failure ([flow 5](../01-codebase-cartography/05-key-flows.md)) — disclosed to the user
  via the error bar.

## ID generation — small decision, big interview surface

`Date.now().toString(36)` ([L579](../../src/JobTracker.jsx#L579)): monotonic-ish, short,
zero dependencies. Collision requires two creations in the same millisecond — impossible
for one human on one form, guaranteed eventually for import/bulk/multi-device. The
upgrade ladder: `crypto.randomUUID()` (collision-proof, free in modern browsers) →
ULID/KSUID (sortable + unique) → server-issued ids (authoritative ordering). Each rung
answers a requirement this app doesn't have yet — [risk R3](../09-reference/risk-register.md)
tracks the moment it would.

## How to safely change the schema (the missing migration story)

There is **no version field** in the stored blob ([risk R4](../09-reference/risk-register.md)).
Today's code defends against yesterday's data ad hoc: `|| ""` in the sort
([L595-L596](../../src/JobTracker.jsx#L595-L596)), field normalization in `startEdit`
([L553-L556](../../src/JobTracker.jsx#L553-L556)), `Array.isArray` at load
([L515](../../src/JobTracker.jsx#L515)). That works for *additive* changes (new optional
field: old records lack it, guards absorb it) and quietly breaks for anything else
(rename `stack` → `technologies` and every old record loses its stack silently).

The pattern to know cold, because "how do you migrate a schema with zero downtime" is a
standard mid-level question — the local-storage version is the same shape as the
database version:

1. **Envelope, not bare array:** store `{version: 1, apps: [...]}`.
2. **Migrate on read:** at load, run stored data through `migrate(stored)` — a chain of
   version upgraders — then use it. Write back in current format on next save.
3. **Never write old formats.** Reads tolerate the past; writes are always current.
4. **Additive first, destructive later:** the DB analogy is expand → backfill → contract.

Implementing exactly this is [mid ticket M1](../06-contribution-practice/02-mid-level-feature-tickets.md).

## The corrupt-data policy — read it critically

Corrupt JSON at load is swallowed ([L517-L519](../../src/JobTracker.jsx#L517-L519)); the
stored blob is preserved *until the next save overwrites it*
(test: [L97-L105](../../test/JobTracker.test.jsx#L97-L105)). So the real policy is:
"corrupt data survives only until you touch anything." For a personal tracker,
acceptable. In anything multi-user or higher-stakes, you'd quarantine the corrupt blob
(copy to `jobtracker:data.corrupt-<ts>`) before ever writing. Two-line fix, big blast-radius
reduction — [junior ticket J13](../06-contribution-practice/01-good-first-tickets.md).

## Drill

A future feature adds `status: "applied" | "interviewing" | "offer" | "rejected"`.
Write (prose, 10 lines max) the change plan: default for old records, which guards
absorb it, whether an envelope/version bump is warranted, and what tests you'd add
*before* the code change. Self-grade — Solid: default value + old-data test named.
Strong: correctly concludes this one is *additive* so it needs no version bump, **and**
names a change that would (splitting `stack` into an array), showing you know where the
line is.
