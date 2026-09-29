# JS/TS Deep-Dive Cards (J1–J12)

Format per card: what it's really testing → repo anchor → junior/mid/senior answer
contrast → follow-ups → drill. Practice aloud; 90 seconds per answer.

---

## Q-J1: "Is `await` blocking? What happens at an await?"
Round: JS deep-dive. Really testing: event-loop model beyond buzzwords.
Repo anchor: [JobTracker.jsx#L510-L523](../../src/JobTracker.jsx#L510-L523) — the effect awaits while React paints "Loading…".
Junior: "It pauses the function until the promise resolves."
Mid adds: pauses *that function only* — the thread continues; resumption is a microtask. Concrete: in my tracker, the mount effect awaits storage while the browser paints the loading state; that interleaving is the whole reason a loading UI is visible.
Senior includes: contract design implication — an API marked async must be *treated* as async even when the implementation is sync ([storage.js#L17](../../src/storage.js#L17) wraps synchronous localStorage), so callers stay correct when the implementation gains real latency. Microtask-vs-macrotask ordering if pushed.
Follow-ups: "microtask vs setTimeout ordering?" "what does async/await desugar to?"
Drill: narrate the cold-start flow ([flow 1](../01-codebase-cartography/05-key-flows.md)) in 60 seconds with the words *microtask*, *paint*, *settle*.

## Q-J2: "Why put an async API over a synchronous store?"
Round: JS deep-dive / API design. Really testing: contract foresight.
Repo anchor: [storage.js](../../src/storage.js) — async wrapper over sync localStorage.
Junior: "So you can swap it later."
Mid adds: the swap argument *with the mechanism* — the component ([L512](../../src/JobTracker.jsx#L512), [L533](../../src/JobTracker.jsx#L533)) is already correct for IndexedDB/HTTP because it never assumed same-tick results; and the UI consequences (loading gate) were designed in from day one.
Senior includes: the inverse cost — async-ifying everything adds ceremony and intermediate states; you pay it *only* at real I/O boundaries. Plus the trap: `async` doesn't make the underlying sync work non-blocking — a 5MB `setItem` still blocks the main thread mid-await ([perf guide](../05-quality-engineering/04-performance-thinking.md)).
Follow-ups: "so is this wrapper lying about being non-blocking?" (Yes, partially — own it.)
Drill: defend the wrapper, then attack it, 45 seconds each.

## Q-J3: "What's a stale closure? Show me one that matters."
Round: JS deep-dive. Really testing: whether you've been bitten and understood the bite.
Repo anchor: [`submit` L577/L579](../../src/JobTracker.jsx#L577-L579) building `next` from render-captured `apps`.
Junior: definition + the setInterval counter example from blog posts.
Mid adds: a real one — my mutation handlers capture the apps array from their render; two mutations in one render window would base the second on a stale snapshot: a lost update. Then the *reachability analysis*: the form closes on submit, so today one human can't trigger it.
Senior includes: the fixes ranked — functional `setState` fixes the state half but `persist` still needs the full array for storage, which pushes you toward a serialized write queue ([M6](../06-contribution-practice/02-mid-level-feature-tickets.md)); and the meta-point: "correct today, wrong under an easy-to-imagine future" is a risk class you *log*, not always fix ([risk R2](../09-reference/risk-register.md)).
Follow-ups: "why do dependency arrays exist, in these terms?" (memoized closures = deliberately kept-stale closures with a declared refresh condition).
Drill: whiteboard the two-rapid-deletes timeline until it's fluent.

## Q-J4: "Which array methods mutate, and why does it matter in React?"
Round: JS deep-dive. Really testing: value/reference model.
Repo anchor: [`[...apps].sort()` L592](../../src/JobTracker.jsx#L592); non-mutating `map`/`filter`/spread at [L577](../../src/JobTracker.jsx#L577), [L588](../../src/JobTracker.jsx#L588), [L579](../../src/JobTracker.jsx#L579).
Junior: lists some of push/pop/splice/sort vs map/filter/slice.
Mid adds: *why* — React detects change by reference; in-place mutation = same reference = skipped re-render; and my sort is the one method that forced a defensive copy, everything else was naturally immutable.
Senior includes: the second-order bug in-place sort would cause here: it reorders the *source-of-truth* array, so the next `persist` writes display order into storage, silently destroying insertion order — a data corruption from a "render-only" bug. Also `toSorted()` as the modern fix.
Follow-ups: "deep vs shallow copy — where's the line here?" (records are spread-copied shallowly at [L577](../../src/JobTracker.jsx#L577); safe because fields are primitives — say why that matters).
Drill: [fake-code pair 4](../04-code-reading-gym/03-fake-code-contrasts.md) from memory.

## Q-J5: "How do promises handle errors? try/catch vs .catch?"
Round: JS deep-dive. Really testing: error-path fluency.
Repo anchor: try/catch/finally in the effect ([L511-L522](../../src/JobTracker.jsx#L511-L522)); catch in `persist` ([L532-L537](../../src/JobTracker.jsx#L532-L537)).
Junior: syntax equivalence.
Mid adds: the design questions per site — my load catch *classifies* (expected first-run vs corrupt), my persist catch *converts* (exception → UI state `saveError`), and `finally` holds the "always leave loading" invariant.
Senior includes: unhandled rejections as a failure class ([pair 7](../04-code-reading-gym/03-fake-code-contrasts.md) — the `.then` version without catch crashes the load path silently); and the rule that an empty catch must name what it swallows ([03/04](../03-architecture-and-patterns/04-side-effects-async-and-reliability.md)).
Follow-ups: "Promise.all error semantics?" "allSettled — when?"
Drill: classify all catches in src/ (the [pattern 11 drill](../03-architecture-and-patterns/05-pattern-catalog.md)).

## Q-J6: "A user in Sydney says dates are off by one. Walk me through it."
Round: JS deep-dive. Really testing: dates/timezones — perennial, and most candidates flunk the *semantics* half.
Repo anchor: [`todayISO` L97-L102](../../src/JobTracker.jsx#L97-L102) (local getters, not `toISOString`); [scenario 3](../05-quality-engineering/03-systematic-debugging.md).
Junior: "timezone bug, use a library."
Mid adds: the actual mechanism — `toISOString()` is UTC, so evening-east users get tomorrow— wait, *yesterday's* UTC date is behind… (know it cold: east of Greenwich, local evening = UTC still earlier in the day; `toISOString` in Sydney at 9am July 31 gives July 30). My repo dodges it by hand-building from local getters.
Senior includes: the semantic layer — "date applied" is a *civil date*, not an instant; storing it timezone-less is a **decision** that two viewers may disagree on relative labels, and the alternative (UTC instants) has the opposite artifact. Libraries don't decide semantics for you.
Follow-ups: "how would you store an interview *appointment* then?" (instant + timezone — different semantics, different storage).
Drill: say the Sydney mechanism in ≤3 sentences without hedging.

## Q-J7: "Where do types stop helping?"
Round: JS/TS deep-dive. Really testing: boundary thinking.
Repo anchor: [`JSON.parse` at L514](../../src/JobTracker.jsx#L514) + the `Array.isArray`/`|| ""` guards; [02/03](../02-stack-and-language-mastery/03-type-system-and-contracts.md).
Junior: "TS catches errors at compile time."
Mid adds: types stop at I/O — parsed storage data is untyped no matter what; my repo (plain JS) shows the discipline types would *formalize*: validate at the boundary, trust inside.
Senior includes: `unknown` + narrowing (or schema validation) as the mechanical enforcement; and the org-level version — generated types from OpenAPI/DB schema are *boundary treaties*, and they rot unless generated, not hand-written.
Follow-ups: "zod vs hand-rolled guards?" "what's the runtime cost of validation everywhere?"
Drill: write `parseApps` with `unknown` input on paper.

## Q-J8: "unknown vs any"
Round: TS rapid-fire. Really testing: precision.
Repo anchor: conceptual — but cite [L515](../../src/JobTracker.jsx#L515) as "what unknown forces you to write."
Junior: "any disables checking, unknown is safer."
Mid adds: unknown is *assignable-to-nothing* until narrowed — the compiler makes you do what my load effect does voluntarily.
Senior includes: variance detail (any is both top and bottom type — it poisons in both directions; unknown is only a top type), and policy: `any` allowed only quarantined behind a validated boundary.
Follow-ups: "never?" "when is a cast legitimate?"
Drill: 30-second answer, then the L515 anchor sentence.

## Q-J9: "How do you handle a storage/API write failing mid-flow?"
Round: JS/fullstack. Really testing: failure design, not syntax.
Repo anchor: [flow 5](../01-codebase-cartography/05-key-flows.md) — optimistic write, no rollback, honest banner ([L672-L676](../../src/JobTracker.jsx#L672-L676)).
Junior: "show an error message and retry."
Mid adds: the three-way choice (block-until-saved / optimistic-with-rollback / optimistic-with-disclosure) and which mine picked, *why it fits* (local-first, single writer, whole-state writes self-heal), and the tests pinning both failure and recovery ([L380-L404](../../test/JobTracker.test.jsx#L380-L404)).
Senior includes: when each choice is mandatory (money → block or rollback; collaborative → CRDT/queue territory); retry policy tied to error class (quota isn't transient — blind retry loops); and the observability question ("how does the *developer* learn this is happening at scale?").
Follow-ups: "design the rollback version — what state do you need?"
Drill: the [flow 5 drill](../01-codebase-cartography/05-key-flows.md) (per-record error design).

## Q-J10: "How would you introduce TypeScript to a JS codebase?"
Round: TS/process. Really testing: migration judgment.
Repo anchor: [kata K4](../06-contribution-practice/04-refactor-and-design-katas.md)'s first-commit plan for this repo.
Junior: "rename files, fix errors."
Mid adds: order of operations — config with `allowJs`, boundary types first (storage contract, record shape), the parse gate where value density is highest; strictness ratchets up, never down.
Senior includes: what you *don't* convert early (style objects, test files); social layer (team buy-in, CI gate timing); and the honest cost accounting — for my single-file repo the spec deferred TS and I can defend that call *and* name its expiry conditions.
Follow-ups: "strict from day one or ratchet?" (Ratchet per-flag with a deadline, or you'll live at loose forever.)
Drill: recite your first-PR file list for this repo.

## Q-J11: "Why is Vite fast in dev, and what's different in prod?"
Round: tooling. Really testing: do you know what your tools do.
Repo anchor: [02/04](../02-stack-and-language-mastery/04-tooling-and-build-system.md) — native-ESM dev serving vs Rollup bundling; the transformed-module evidence.
Junior: "it uses ESM and esbuild."
Mid adds: the mechanism (transform-on-demand per request, no bundle graph up front; prebundled deps) and the consequence (dev≠prod code shapes — why my repo keeps a smoke test on the real entry chain).
Senior includes: the class of dev/prod gap bugs (import order side effects, circular imports surfacing differently) and how to hedge (preview builds in CI, [J14](../06-contribution-practice/01-good-first-tickets.md)).
Follow-ups: "what does the react plugin actually do?" (JSX transform + Fast Refresh wiring.)
Drill: explain to a rubber duck in 60 seconds.

## Q-J12: "ESM vs CommonJS — practical differences you've hit"
Round: Node/tooling. Really testing: module-system scar tissue.
Repo anchor: [`"type": "module"`](../../package.json) — all-ESM, zero interop pain *because* it's greenfield; the contrast case is the interop you've seen elsewhere.
Junior: "import vs require syntax."
Mid adds: static analyzability (tree-shaking exists because imports are static), top-level await, and the interop seams (default-export mangling, `__dirname` absence).
Senior includes: the ecosystem-strategy view — dual-publishing pain, why some packages went ESM-only, and what you'd pick publishing today ([project S4](../06-contribution-practice/03-senior-build-projects.md) forces the decision).
Follow-ups: "how does Node resolve which system a file uses?" (extension + nearest `package.json` type field.)
Drill: one hit-this-in-practice story, 45 seconds.
