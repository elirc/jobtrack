# Types and Contracts (in a JS repo)

This repo has no TypeScript ([SPEC.md §2](../../SPEC.md): "no build-time type layer needed
for a single-file app"). That makes it a perfect specimen for a skill interviews probe
constantly: **where do contracts live when the compiler doesn't hold them?**

## The three contracts, and how each is enforced

| Contract | Written down in | Enforced by |
|---|---|---|
| `window.storage` API (`get` rejects when absent) | Doc comment [JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12), [storage.js#L1-L10](../../src/storage.js#L1-L10) | **Contract tests** [storage.test.js#L9-L33](../../test/storage.test.js#L9-L33) |
| Record shape `{id, company, stack, date, notes}` | [SPEC.md §3](../../SPEC.md) | **Defensive reads**: `Array.isArray` [L515](../../src/JobTracker.jsx#L515), `\|\| ""` guards [L595-L596](../../src/JobTracker.jsx#L595-L596), `app.company \|\| ""` normalization [L553-L556](../../src/JobTracker.jsx#L553-L556) |
| Behavior (sort orders, empty states, error bar) | [SPEC.md §6-8](../../SPEC.md) | **Behavior tests** [JobTracker.test.jsx](../../test/JobTracker.test.jsx) |

The pattern: with no static types, the enforcement moved to *tests at the boundary* and
*defensive normalization at the trust boundary* (persisted data). Notice what did **not**
happen: there's no validation sprinkled through render code — inner code trusts its
inputs, edges don't. That discipline is the transferable idea; TS or not is an
implementation detail of it.

## What TypeScript would buy here — the honest version

Worth being able to argue both ways in an interview:

- **Real wins:** the `App` record type would make [`startEdit`'s](../../src/JobTracker.jsx#L551-L557)
  normalizations and the sort guards *provably necessary or provably dead*; `tab` and
  `sortBy` as union types (`"apps" | "notes"`) would catch typo'd comparisons at
  compile time; `form` field names in [`setField`](../../src/JobTracker.jsx#L541) calls
  (`setField("company")`) are stringly-typed today — `keyof FormState` fixes that.
- **What TS would *not* fix:** the storage boundary. Data parsed from
  `JSON.parse(result.value)` ([L514](../../src/JobTracker.jsx#L514)) is `any`/`unknown` no
  matter what — persisted data is a runtime input. You'd still need the `Array.isArray`
  check, or a schema validator (zod et al). **"TypeScript types stop at every I/O
  boundary"** is a senior sentence; say it with this exact anchor.
- The cost side: a build-time layer on a single-file app, for one author. SPEC's call is
  defensible *at this scope* — and you should say precisely when it flips (second
  contributor, second file consuming the record shape, or first schema migration).

Migration path (this is [kata K4](../06-contribution-practice/04-refactor-and-design-katas.md)):
rename to `.tsx`, add `App`/`FormState`/`Storage` interfaces, type the helper params,
`satisfies` for the style objects, and a `parseApps(value: string): App[]` gate at the
storage read — the one place runtime validation must live.

## unknown vs any — the sixty-second version, anchored

`JSON.parse` returns `any` in TS: you can do anything, checks vanish. Typed as `unknown`,
the compiler *forces* the `Array.isArray` narrowing this repo already does voluntarily at
[L515](../../src/JobTracker.jsx#L515). This code is what disciplined `unknown` handling
looks like, minus the compiler making you. In interviews: `any` opts out of checking,
`unknown` opts into narrowing; prefer `unknown` at boundaries.

## Interview angle

| Question | Card |
|---|---|
| "Where do types stop helping? What guards runtime data?" | [J7](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "unknown vs any" | [J8](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "How would you add TS to a JS codebase — order of operations?" | [J10](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "What's a contract test? Show one." | [A5](../08-interview-prep/03-api-and-data-modeling-questions.md) |
