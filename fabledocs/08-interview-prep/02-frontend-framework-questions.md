# Frontend / React Cards (F1–F10)

---

## Q-F1: "Derived state vs stored state — how do you decide?"
Round: frontend. Really testing: the #1 React design instinct.
Repo anchor: [`sorted`/`noted` L592-L598](../../src/JobTracker.jsx#L592-L598) vs the nine states [L496-L505](../../src/JobTracker.jsx#L496-L505).
Junior: "use useMemo for derived values."
Mid adds: the decision rule — *if it's a pure function of existing state, derive it at render; store only sources of truth and user events*. Concrete: my Notes tab and both sort orders are projections; there is no sync code because there's nothing to sync. And the state-table exercise: I can justify all nine stored states individually.
Senior includes: legitimate exceptions (drafts — my form state deliberately duplicates a record during edit with a defined merge point; caches; anything that must survive its source) and cost-triggered memoization, not habitual.
Likely follow-ups: "when would you memoize `noted`?" (Measured cost, ~10k rows.)
Drill: [fake-code pair 2](../04-code-reading-gym/03-fake-code-contrasts.md) — name the three bugs the stored-copy version has.

## Q-F2: "StrictMode runs effects twice. Why, and what does it break?"
Round: frontend. Really testing: effect hygiene.
Repo anchor: [main.jsx#L10-L12](../../src/main.jsx#L10-L12) + the cancelled flag [L509-L526](../../src/JobTracker.jsx#L509-L526).
Junior: "it's a dev-mode thing, you can remove StrictMode."
Mid adds: it simulates mount→unmount→remount to surface unsafe effects *before* concurrent features do; my load effect survives because reads are idempotent and the flag makes the first mount's late resolution a no-op.
Senior includes: the taxonomy — read-only effects need cancellation only; effects with side effects need idempotency or cleanup that truly reverses; and the removed-warning wrinkle (React 18 dropped the unmounted-setState warning; the leak class remains, silently).
Follow-ups: "so when do you *need* AbortController instead of a flag?" (When you want the I/O itself cancelled, not just ignored.)
Drill: [pattern 10's drill](../03-architecture-and-patterns/05-pattern-catalog.md).

## Q-F3: "Controlled vs uncontrolled inputs"
Round: frontend. Really testing: form architecture tradeoffs.
Repo anchor: the fully controlled form [L685-L726](../../src/JobTracker.jsx#L685-L726), curried [`setField` L541](../../src/JobTracker.jsx#L541).
Junior: definitions.
Mid adds: what control *buys me here* — live `canSubmit` ([L600](../../src/JobTracker.jsx#L600)), pre-fill for edit ([L552-L557](../../src/JobTracker.jsx#L552-L557)), trivial reset; cost is a render per keystroke, irrelevant at this size.
Senior includes: when to flip (giant forms, perf-sensitive typing → uncontrolled + FormData on submit; or form libraries as managed middle ground) and the hybrid reality (file inputs are always uncontrolled).
Follow-ups: "how does your form behave if a render is slow?" (Typing lags — controlled couples keystroke latency to render cost; that's the real tradeoff sentence.)
Drill: 60-second answer with the three "buys me" concretes.

## Q-F4: "How do you avoid flashing the wrong UI while data loads?"
Round: frontend. Really testing: async UI states.
Repo anchor: the loading gate — [L497](../../src/JobTracker.jsx#L497), [L738-L743](../../src/JobTracker.jsx#L738-L743), `finally` [L520-L522](../../src/JobTracker.jsx#L520-L522).
Junior: "show a spinner while loading."
Mid adds: the tri-state insight — loading / loaded-empty / loaded-with-data are three different truths; the bug is deriving "empty" from `data.length` alone; and *testing* the intermediate state by holding the promise ([test L107-L125](../../test/JobTracker.test.jsx#L107-L125)).
Senior includes: the `finally` invariant (never stuck loading, on any path), skeletons vs spinners vs suspense as UX escalation, and the corrupt-data case rendering a *false* empty — the gate's honest limitation ([risk R1](../09-reference/risk-register.md)).
Follow-ups: "how does Suspense change this?" 
Drill: enumerate the four load outcomes and their UIs from memory.

## Q-F5: "What do React keys actually do? When are index keys OK?"
Round: frontend. Really testing: reconciliation model.
Repo anchor: `key={app.id}` [L748](../../src/JobTracker.jsx#L748) vs positional gutter [L426-L428](../../src/JobTracker.jsx#L426-L428) vs index-ish token keys [L389](../../src/JobTracker.jsx#L389).
Junior: "unique keys so React doesn't warn."
Mid adds: keys are *identity across renders* — with id keys my expanded row follows its record through a sort; with index keys the expansion would stick to a position ([trace 5](../04-code-reading-gym/02-trace-tables.md) / [scenario 4](../05-quality-engineering/03-systematic-debugging.md) is the exact bug).
Senior includes: the acceptability rule (index keys: static, stateless, never independently reordered — my stack tokens qualify) and keys as a *reset tool* (changing a key deliberately remounts a subtree — the idiomatic "reset this form" trick).
Follow-ups: "why is `Math.random()` as a key worse than index?"
Drill: tell scenario 4's deduction ("state right + render wrong ⇒ keys") as a story.

## Q-F6: "When is duplicating state correct?"
Round: frontend. Really testing: nuance beyond the single-source slogan.
Repo anchor: the edit form copying record fields — [`startEdit` L552-L557](../../src/JobTracker.jsx#L552-L557), merged back at [L577](../../src/JobTracker.jsx#L577).
Junior: "never — single source of truth."
Mid adds: drafts are the canonical exception — the copy is the *point* (divergence until commit/cancel), safe because merge and discard points are explicit.
Senior includes: the general form — duplication is fine when there's a defined reconciliation protocol (drafts, optimistic caches, replicas); it's a bug when reconciliation is "hope." Then one sentence on how this scales to distributed systems (same rule, bigger blast radius).
Follow-ups: "what if two edits of the same record raced?" (Last-submit-wins here; name it.)
Drill: point at the exact merge line and the exact discard line from memory.

## Q-F7: "How do you approach frontend performance?"
Round: frontend. Really testing: measurement discipline.
Repo anchor: [perf guide](../05-quality-engineering/04-performance-thinking.md) — the domain table and the 5,000-record experiment.
Junior: "React.memo and useMemo."
Mid adds: domain-first (bundle/network/render/data/memory), measure to locate, then that domain's levers; my repo's dominant cost is React itself (bundle), its render costs are noise, and I've verified with the profiler rather than assumed.
Senior includes: the memoization tax argument ([kata 3](../04-code-reading-gym/04-review-katas.md) — dep arrays are bug surface; memo defeated by inline props is dead weight) and ordering fixes by leverage (virtualize before memoize for long lists).
Follow-ups: "your list is slow at 5k rows — first move?" (Profile; expect DOM-bound; virtualize.)
Drill: the perf guide's predict-then-measure exercise, done for real once.

## Q-F8: "How do you make a widget like tabs accessible?"
Round: frontend. Really testing: a11y beyond alt text.
Repo anchor: [L616-L638](../../src/JobTracker.jsx#L616-L638) — roles/aria-selected present; arrow-keys/aria-controls absent ([drill 7](../04-code-reading-gym/01-annotation-drills.md), [ticket J6](../06-contribution-practice/01-good-first-tickets.md)).
Junior: "use semantic HTML and aria labels."
Mid adds: pattern-based answer — ARIA Authoring Practices define the tab pattern (roles + aria-selected + roving tabindex + arrow navigation); mine implements the first two and I can name what's missing — honest gap analysis beats false confidence.
Senior includes: `role="alert"` on the error bar ([L673](../../src/JobTracker.jsx#L673)) as *announced* state; `aria-hidden` on decorative gutter numbers ([L426](../../src/JobTracker.jsx#L426)); `aria-expanded` on the notes toggle ([L443](../../src/JobTracker.jsx#L443)); `prefers-reduced-motion` ([L76-L81](../../src/JobTracker.jsx#L76-L81)); and testing-library's role-based queries as an a11y forcing function — the suite *fails* if roles vanish.
Follow-ups: "how do you test a11y?" (Role queries as baseline, axe as audit, keyboard walk as manual pass.)
Drill: keyboard-walk the real app once; write down every place focus behaves badly.

## Q-F9: "Styling strategies — tradeoffs?"
Round: frontend. Really testing: you've felt the tradeoffs, not read them.
Repo anchor: inline objects + injected CSS block ([L35-L82](../../src/JobTracker.jsx#L35-L82), [L141-L379](../../src/JobTracker.jsx#L141-L379)); the pseudo-class limitation that *forced* the hybrid.
Junior: lists CSS modules/Tailwind/CSS-in-JS.
Mid adds: a real constraint story — inline styles can't express `:hover`/`:focus-visible`/media queries, so this repo runs a deliberate hybrid: objects for static styles, one CSS string for pseudo-classes; tokens ([L19-L27](../../src/JobTracker.jsx#L19-L27)) bridge both so the palette can't drift.
Senior includes: the scaling analysis (31% of the file is styling; the extraction trigger is the second component — [critique #4](../03-architecture-and-patterns/06-architecture-critique.md)) and matching strategy to team/product (design-system maturity, SSR constraints) rather than fashion.
Follow-ups: "why not Tailwind here?" (Zero-dependency constraint; also fine the other way — argue it.)
Drill: name the exact two things the CSS string does that objects can't (pseudo-classes, media queries) with line anchors.

## Q-F10: "Walk me through testing a React component properly."
Round: frontend/practical. Really testing: testing philosophy.
Repo anchor: the whole suite — [05/01](../05-quality-engineering/01-testing-strategy.md)'s five stealable habits.
Junior: "render it and check it shows the right stuff, mock the dependencies."
Mid adds: behavior over internals (drive with userEvent, assert DOM + contract payloads via [`lastWrite` L53](../../test/JobTracker.test.jsx#L53)); fakes honest via contract tests; error paths first-class; intermediate states via controlled promises.
Senior includes: the pyramid-shape-follows-architecture inversion ([05/01's interview angle](../05-quality-engineering/01-testing-strategy.md)); negative-space assertions for safety properties; flake prevention as design (clock/randomness pinning).
Follow-ups: "what don't you test?" (Styling, internals — and *why*: churn vs contract.)
Drill: describe three specific tests from this repo, one habit each, without opening the file.
