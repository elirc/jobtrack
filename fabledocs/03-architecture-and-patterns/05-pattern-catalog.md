# Pattern Catalog

Fourteen cards. The goal is *recognition* — seeing the shape in any codebase — not
name-dropping. Each card: problem → shape → real anchors → failure modes → when to
use/avoid → interview angle → drill.

---

## Pattern 1: Adapter (ports-and-adapters in one file)

Problem it solves: code needs a capability (persistence) without marrying a provider (localStorage).
General shape: consumer talks to an interface; a thin adapter maps the interface onto the provider; the adapter is swappable.
Real example: [storage.js#L16-L34](../../src/storage.js#L16-L34) adapts localStorage to the async `{get,set,delete}` contract; consumer at [JobTracker.jsx#L512](../../src/JobTracker.jsx#L512), [L533](../../src/JobTracker.jsx#L533) never mentions localStorage.
Second example: [`fakeStorage` in JobTracker.test.jsx#L32-L51](../../test/JobTracker.test.jsx#L32-L51) — a second adapter for the same port, proving the port is real.
Why this implementation works: the contract is documented ([JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12)), contract-tested ([storage.test.js](../../test/storage.test.js)), and installed defensively ([storage.js#L12](../../src/storage.js#L12) yields to a host implementation).
Failure modes: leaky adapters (sync assumptions bleeding through — dodged here by keeping the contract async); contract drift (adapter and consumer evolve separately — the contract test is the guard).
Use it when: any I/O the tests need to fake, or any provider you can imagine swapping. Avoid it when: you're wrapping a stable stdlib API you'll never swap — indirection with no second implementation is ceremony.
Interview angle: "How would you make this testable?" — the answer is always an adapter at the I/O edge.
Drill: write the IndexedDB adapter's method signatures (no body). What did you NOT have to change? (The component.)

---

## Pattern 2: Optimistic update, honest failure

Problem it solves: waiting for storage on every keypress-adjacent action makes a local app feel remote.
General shape: apply to memory first; persist after; on failure, tell the truth instead of rolling back.
Real example: [`persist` L530-L538](../../src/JobTracker.jsx#L530-L538); the honesty is [L672-L676](../../src/JobTracker.jsx#L672-L676) ("may not survive a refresh").
Second example: No second instance — one mutation path (that's Pattern 3).
Why this implementation works: single user, low-stakes data, and every future mutation rewrites the whole state — so lost writes self-heal on next success.
Failure modes: with rollback-expecting users (payments!) this is wrong; with multiple writers the memory/storage divergence compounds instead of healing.
Use it when: local-first, single-writer, whole-state writes. Avoid it when: money, multi-writer, or delta writes.
Interview angle: "Optimistic vs pessimistic — when each?" Anchor your answer to a real failure UI, not theory.
Drill: rewrite `persist` (paper) as pessimistic. What UI states did you just create? (in-flight spinner, disabled controls, retry affordance — count the new states; that's the cost.)

---

## Pattern 3: Single mutation path

Problem it solves: N mutation sites × M concerns (persist, error handling, future logging) = N×M maintenance.
General shape: every state change funnels through one function that owns the cross-cutting concerns.
Real example: create ([L579](../../src/JobTracker.jsx#L579)), update ([L577](../../src/JobTracker.jsx#L577)), delete ([L588](../../src/JobTracker.jsx#L588)) all call `persist` — nothing else calls `storage.set` (verify by search: one call site, [L533](../../src/JobTracker.jsx#L533)).
Second example: the same idea at framework scale is a reducer/store dispatch; this is the hand-rolled minimum.
Why this implementation works: adding write-serialization, undo capture, or telemetry later is a one-function change.
Failure modes: the funnel eroding — someone adds a "quick" direct `storage.set` and the invariant dies silently. Guard: grep in review; or lint rule at scale.
Use it when: always, honestly. Avoid it when: never — but keep the funnel thin; a funnel that grows business logic becomes a god function.
Interview angle: "How would you add undo?" — first sentence: "all mutations already flow through one function, so…"
Drill: find the one other place that *reads* storage. Why is read not funneled? (One caller only; a funnel of one is just a name.)

---

## Pattern 4: Projection, not copy

Problem it solves: two views of one dataset drifting apart.
General shape: derive the second view at render time; store nothing.
Real example: [`noted` L598](../../src/JobTracker.jsx#L598) — the entire Interview Notes tab; count badge at [L636](../../src/JobTracker.jsx#L636) rides the same derivation.
Second example: [`sorted` L592-L597](../../src/JobTracker.jsx#L592-L597) — sort order as projection; stored order never mutates.
Why this implementation works: consistency *by construction* — the sync test ([JobTracker.test.jsx#L365-L376](../../test/JobTracker.test.jsx#L365-L376)) can't fail because there's nothing to desynchronize.
Failure modes: projections of expensive computations re-run per render (memoize when measured); projections that *look* pure but read clocks/randomness re-render nondeterministically.
Use it when: the second view is a pure function of the first. Avoid it when: the derivation is genuinely expensive or needs to survive its source (an audit log is not a projection).
Interview angle: the single highest-yield React question ("derived vs stored state") — this is your two-line anchor.
Drill: [fake-code pair 4](../04-code-reading-gym/03-fake-code-contrasts.md) — write the buggy stored-copy version from memory, then list its failure modes.

---

## Pattern 5: Loading gate

Problem it solves: flash of empty state — the UI claiming "no data" while data is in flight.
General shape: a tri-state (loading / loaded-empty / loaded-with-data) instead of a boolean data check.
Real example: `loaded` ([L497](../../src/JobTracker.jsx#L497)) gates render at [L738-L739](../../src/JobTracker.jsx#L738-L739); flipped in `finally` ([L520-L522](../../src/JobTracker.jsx#L520-L522)) so *every* path leaves the gate.
Second example: none — one async source, one gate. (In a data-fetching app, every query has one; libraries like React Query make the tri-state explicit as `status`.)
Why this implementation works: the gate is about the *read having settled*, not about data existing — `loaded && apps.length === 0` renders the honest empty state.
Failure modes: gates that only flip on success (spinner of death on error — the `finally` is the vaccine); nested gates flashing in sequence.
Use it when: any async-sourced UI. Avoid it when: data is synchronously available at first render.
Interview angle: [F4](../08-interview-prep/02-frontend-framework-questions.md); also the test-design question "how do you test an intermediate state?" ([JobTracker.test.jsx#L107-L125](../../test/JobTracker.test.jsx#L107-L125) — hold the promise yourself).
Drill: enumerate this app's four load-path outcomes (first-run, data, corrupt, storage broken) and which UI each produces. One of them is a lie — which? (Corrupt → shows "no applications yet" — it's not true; see [risk R1](../09-reference/risk-register.md).)

---

## Pattern 6: Store raw, format at the edge

Problem it solves: formatting decisions calcifying into data.
General shape: persist exactly what the user typed (or a canonical machine form); every display transform happens at render.
Real example: `stack` stored raw, tokenized at [L126-L131](../../src/JobTracker.jsx#L126-L131); dates stored ISO, prettified at [L105-L109](../../src/JobTracker.jsx#L105-L109) + [L112-L123](../../src/JobTracker.jsx#L112-L123).
Second example: `notes` stored with newlines intact, rendered via `white-space: pre-wrap` ([L351](../../src/JobTracker.jsx#L351)) — even *line breaks* are a render decision.
Why this implementation works: changing chip styling, date format, or token separator requires zero data changes.
Failure modes: storing display forms ("Mar 4, 2026") destroys sortability and machine-readability forever; the reverse failure is over-normalizing at write (trimming/splitting user input) and losing what they actually typed.
Use it when: default. Avoid it when: the display form IS the data (a rendered invoice PDF is a record, not a projection).
Interview angle: shows up as "why is your DB storing HTML?" war stories; also the API-design question "what format should timestamps be?"
Drill: the user types `stack = "C++, C#, F#"`. Trace it through storage → tokens → render. Now try `"a,,b, ,c"` — predict, then check [L127-L130](../../src/JobTracker.jsx#L127-L130). (`filter(Boolean)` eats empties — is that formatting or data loss? Defend your answer.)

---

## Pattern 7: Contract-first error semantics (throw on missing)

Problem it solves: `null` ambiguity — does "no value" mean absent, empty, or broken?
General shape: the contract *chooses* — here, absence is exceptional (`get` rejects), and callers must handle it explicitly.
Real example: [storage.js#L19-L21](../../src/storage.js#L19-L21) throws; the caller's catch at [JobTracker.jsx#L517-L519](../../src/JobTracker.jsx#L517-L519) is therefore *mandatory*, and first-run handling can't be forgotten.
Second example: contract test pinning it: [storage.test.js#L10-L13](../../test/storage.test.js#L10-L13).
Why this implementation works: the SPEC ([§5.1](../../SPEC.md)) made absence-throws explicit, so shim and component agreed before either was written.
Failure modes: throw-on-missing forces try/catch ceremony on *expected* cases (some prefer `get → value | undefined` for exactly this reason); the real sin is not choosing — APIs where some paths return null and others throw.
Use it when: absence is rare/exceptional. Avoid it when: absence is a routine outcome (then encode it in the return type).
Interview angle: API-design round: "should this return null or throw?" — the senior answer is "whichever, but *contractually*, and here's how each shifts caller obligations."
Drill: redesign the contract as `get → {value} | undefined`. Rewrite the load effect (paper). Which version makes the corrupt-JSON case *more* distinguishable? (The undefined version — the catch would then only mean parse failure. That's an argument the SPEC lost; have it both ways aloud.)

---

## Pattern 8: Defense at the trust boundary (and nowhere else)

Problem it solves: validation smeared everywhere = noise; validation nowhere = crashes on old data.
General shape: identify where untrusted data enters (here: persisted blobs from past versions); normalize/guard there; trust internally after.
Real example: `Array.isArray` at load ([L515](../../src/JobTracker.jsx#L515)); `|| ""` at the two sort reads ([L595-L596](../../src/JobTracker.jsx#L595-L596)); normalization at edit entry ([L553-L556](../../src/JobTracker.jsx#L553-L556)).
Second example: contrast site — `submit` ([L574](../../src/JobTracker.jsx#L574)) does NOT guard `form.stack` etc., because form state is *internal* and can't be malformed.
Why this implementation works: guards cluster at exactly the boundary; render code stays clean.
Failure modes: the guards are *scattered* boundary defense — three sites must stay in sync. A `parseApps()` gate at load would centralize it (that's the [TS-migration kata](../06-contribution-practice/04-refactor-and-design-katas.md) and [M1](../06-contribution-practice/02-mid-level-feature-tickets.md)).
Use it when: always — the skill is drawing the boundary correctly. Avoid: guarding the same data twice "to be safe" — it hides where trust actually begins.
Interview angle: "where do you validate?" — answer with the boundary map from [03-validation](03-validation-auth-and-permissions.md).
Drill: list every line that would become dead code if load ran a full `parseApps()` normalizer. (L595-L596's guards, L553-L556's fallbacks — knowing what a fix *deletes* is as important as what it adds.)

---

## Pattern 9: State hygiene on destructive actions

Problem it solves: dangling references after an entity dies.
General shape: deletion = remove entity + clear every state that points at it.
Real example: [`remove` L584-L589](../../src/JobTracker.jsx#L584-L589) clears `expandedId` and closes the edit form before filtering.
Second example: none needed yet — exactly two referring states exist. The *count* is the fragility.
Why this implementation works: it's exhaustive today, and both cleanups are adjacent to the deletion — reviewable at a glance.
Failure modes: the next referring state (selection, pin, URL param) whose author forgets this function; at scale, the fix is deriving validity (`isExpanded = apps.some(...)`) or normalizing state into a store with cascade rules.
Use it when: entity references live in scattered `useState`. Avoid the manual version when: references multiply — derive or centralize instead.
Interview angle: "what's the hardest bug you'd expect in this UI?" — stale-reference-after-delete is a great specific answer.
Drill: [flow 3's drill](../01-codebase-cartography/05-key-flows.md) — the `pinnedId` thought experiment.

---

## Pattern 10: Effect cancellation flag

Problem it solves: async results landing after the component that wanted them is gone (or superseded).
General shape: a captured boolean; cleanup sets it; the continuation checks it before touching state.
Real example: [L509](../../src/JobTracker.jsx#L509), [L515](../../src/JobTracker.jsx#L515), [L521](../../src/JobTracker.jsx#L521), [L524-L526](../../src/JobTracker.jsx#L524-L526).
Second example: AbortController is this pattern with wire-level teeth (actually cancels the I/O; the flag only ignores the result).
Why this implementation works: minimal, correct for ignore-semantics, and StrictMode-proof.
Failure modes: checking the flag once but not after *each* await (multiple awaits = multiple stale windows — here there's effectively one); using it where you needed real cancellation (an expensive query still ran).
Use it when: any effect that awaits then sets state. Avoid it when: the effect is synchronous.
Interview angle: [F2](../08-interview-prep/02-frontend-framework-questions.md) — "setState on unmounted component" is a warhorse question; this is the canonical answer shape.
Drill: delete the flag mentally; narrate exactly what StrictMode dev does, step by step, and what warning appears (or doesn't — React 18 removed the warning; the *bug* remains. Knowing that wrinkle is a strong signal).

---

## Pattern 11: Best-effort side effects (try/catch/shrug)

Problem it solves: cosmetic capabilities (smooth scroll) failing shouldn't break core flows.
General shape: attempt; on failure, continue silently — but only where the effect is genuinely optional.
Real example: [`scrollTo` in startEdit, L561-L565](../../src/JobTracker.jsx#L561-L565); jsdom-guard on scrollHeight ([L414-L415](../../src/JobTracker.jsx#L414-L415)).
Second example: font loading ([L36](../../src/JobTracker.jsx#L36)) — the browser itself provides the fallback (font stacks, [L29-L31](../../src/JobTracker.jsx#L29-L31)).
Why this implementation works: each swallow is scoped to one optional call, with a comment naming why.
Failure modes: the pattern metastasizing to *non*-optional effects (a swallowed save!); catch blocks so broad they eat unrelated bugs.
Use it when: cosmetic, degradable. Avoid it when: anyone downstream depends on the effect having happened.
Interview angle: pairs with the empty-catch discussion in [04-side-effects](04-side-effects-async-and-reliability.md) — "when is swallowing an error OK?"
Drill: classify all four catches in src/ (load, persist, scrollTo — plus the guard in AutoTextarea which avoids the throw entirely) as swallow/surface/prevent, and defend each.

---

## Pattern 12: Design tokens (even in one file)

Problem it solves: magic values drifting — three slightly different grays, inconsistent accents.
General shape: name the palette once; reference names everywhere.
Real example: `C` at [L19-L27](../../src/JobTracker.jsx#L19-L27); used in both the CSS string ([L41](../../src/JobTracker.jsx#L41), [L47](../../src/JobTracker.jsx#L47)) and style objects ([L225](../../src/JobTracker.jsx#L225), [L336-L337](../../src/JobTracker.jsx#L336-L337)) — one palette, two styling systems, zero drift.
Second example: font roles [L29-L31](../../src/JobTracker.jsx#L29-L31) — same idea for typography; [SPEC §7](../../SPEC.md) is the token spec.
Why this implementation works: hover states hardcode a few derived colors ([L50](../../src/JobTracker.jsx#L50), [L65](../../src/JobTracker.jsx#L65)) — the honest exception that shows the rule's limits without a color-math dependency.
Failure modes: tokens without discipline (new hex values sneaking in — grep `#[0-9A-F]` outside the token block and judge each); token names describing appearance (`cobalt`) rather than role (`accent`) — renaming cost when the brand changes color.
Use it when: more than ~3 colors or any dark-mode ambition. Avoid it when: never, really — this is the cheapest pattern in the catalog.
Interview angle: frontend rounds ask "how do you keep styling consistent?" — tokens → roles → theming is the ladder.
Drill: is `cobalt` a role name or an appearance name? What breaks when the accent becomes green? (Every usage reads as a lie — the rename is mechanical but the lesson isn't.)

---

## Pattern 13: Test-only injection seam

Problem it solves: testing code whose collaborator (storage) you must control.
General shape: the seam is the global contract itself — tests install a fake *implementation of the same port* rather than mocking internals.
Real example: [`fakeStorage` L32-L51](../../test/JobTracker.test.jsx#L32-L51) sets `window.storage`; teardown removes it ([L74-L77](../../test/JobTracker.test.jsx#L74-L77)).
Second example: the shim's own politeness — [storage.js#L12](../../src/storage.js#L12) refusing to overwrite an existing implementation is what makes the seam safe in the smoke test.
Why this implementation works: tests assert *through the contract* (`lastWrite` parses what was written — [L53](../../test/JobTracker.test.jsx#L53)), so refactoring component internals never breaks them.
Failure modes: global seams leak across tests without teardown discipline (hence the `afterEach`); at module scale you'd use DI/context instead of globals.
Use it when: the collaborator is at a real boundary. Avoid: mocking your own internals (mock the port, not the adapter's guts).
Interview angle: "how do you test without a database?" — same shape, bigger port.
Drill: what breaks if `delete window.storage` is removed from teardown? Trace one specific inter-test contamination through two named tests.

---

## Pattern 14: Spec-as-contract (build to a written intent)

Problem it solves: "is this a bug?" being unanswerable because intent was never recorded.
General shape: a spec states behavior *and* non-goals; code cites it; deviations are documented, not silent.
Real example: [SPEC.md](../../SPEC.md) §8's edge-case table maps 1:1 onto tests (corrupt JSON → [test L97](../../test/JobTracker.test.jsx#L97-L105); whitespace notes → [test L305-L330](../../test/JobTracker.test.jsx#L305-L330)).
Second example: [README](../../README.md) documenting two deviations (future-date labels, single Cancel button) — deviation *with paper trail*.
Why this implementation works: §1 lists non-goals, which is what makes "no auth" a decision instead of an omission.
Failure modes: specs that rot (nobody updates them — the "Status: Implemented" header is doing load-bearing work here); specs so detailed they're just code in prose.
Use it when: any project with more than one stakeholder — including future-you. Avoid: spec-first for genuinely exploratory work; write the spec when the shape stabilizes.
Interview angle: behavioral rounds — "tell me about a spec/requirements disagreement." Having *diffed a spec against its implementation* (this curriculum made you do it) is a real story; see [STAR story 2](../08-interview-prep/06-behavioral-star-stories.md).
Drill: find the third deviation. (Hint: [SPEC §6.1](../../SPEC.md) says the form has a Cancel *button* becoming behavior — compare with [L728-L734](../../src/JobTracker.jsx#L728-L734) and the README's account. Is the README's list complete? Write the sentence you'd add if not.)
