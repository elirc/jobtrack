# Performance Thinking

Rule zero: **measure first.** Every claim below is either arithmetic you can check or is
labeled as expectation. The skill being trained: knowing *where cycles go by domain*, so
you know where to point the profiler before you open it.

## The domains, sized for this app

| Domain | This app's reality | When it would matter |
|---|---|---|
| **Bundle** | ~158 kB JS / ~51 kB gzip (__verified__ build output) — ≥95% is React+ReactDOM; app code is a few kB | Never for this app; on a real product this is the first lever (route splitting, dead deps) |
| **Network** | One fonts request ([L36](../../src/JobTracker.jsx#L36)); zero data requests | The fonts `@import` blocks styled text rendering — moving to a `<link rel=preload>` is the only real network win available ([J8](../06-contribution-practice/01-good-first-tickets.md)) |
| **Render** | Full component re-runs per keystroke (controlled form) + per mutation; sort+filter recomputed each time ([L592-L598](../../src/JobTracker.jsx#L592-L598)) | Expectation: sorting 1,000 records ≈ well under 1ms; the DOM (1,000 `<article>`s) hurts *long* before the sort does — virtualize at ~500+ rows |
| **Storage I/O** | Whole-array `JSON.stringify` + write per mutation ([L533](../../src/JobTracker.jsx#L533)) | Linear in record count per keystroke-adjacent action; at 10k records with big notes you'd feel it. localStorage is also *synchronous* under the async wrapper — a huge write blocks the main thread |
| **Memory** | One array + React tree; no leaks possible from subscriptions (there are none). The one guarded leak: post-unmount setState ([L509](../../src/JobTracker.jsx#L509)) | — |

## How to actually measure here (do each once)

1. **React Profiler** (React DevTools → Profiler): record while typing in the form. See
   every keystroke re-render the whole tree; note the flame width — this is your baseline
   for "was memoization ever needed?" (Compare [kata 3](../04-code-reading-gym/04-review-katas.md).)
2. **Performance panel:** click a sort pill with 6x CPU throttle. Find the render in the
   trace. It will be invisible next to paint/layout — that observation *is* the lesson.
3. **Storage cost:** in the console, seed big:
   `localStorage.setItem("jobtracker:data", JSON.stringify(Array.from({length:5000},(_,i)=>({id:String(i),company:"Co"+i,stack:"a,b,c",date:"2026-01-01",notes:"x".repeat(500)}))))`
   then reload and interact. Where does it degrade first — load parse, render, or the
   per-mutation write? Form a hypothesis before you try it.

## The N+1 lesson without a database

The N+1 *shape* — per-item work that should be batched — exists here in miniature:
`stackTokens` runs per row per render ([L384](../../src/JobTracker.jsx#L384)), `parseISO`
runs twice per row ([`formatDate`](../../src/JobTracker.jsx#L106) + [`relativeLabel`](../../src/JobTracker.jsx#L113)).
Per-render cost: rows × small-constant — fine. The transferable trigger: **when the
per-item work becomes I/O** (a fetch per row, a query per entity), the same shape is a
disaster. Learn to see the shape while it's cheap so you recognize it when it isn't.

## Interview angle

"How do you approach a performance problem?" — the strong answer is domain-first:
"bundle, network, render, data, memory — which one is it? Measure to pick, then apply
that domain's levers." Rehearse with this app's table as your worked example, including
the punchline that its dominant cost (React itself) is unfixable without changing the
question. [Card F7](../08-interview-prep/02-frontend-framework-questions.md).

## Drill

Predict, then measure with the 5,000-record seed: (a) time-to-interactive on reload,
(b) keystroke latency in the notes field, (c) sort-flip latency. Rank before testing.
**Solid:** predictions within an order of magnitude, correct ranking. **Strong:** you
identified that (b) is the sleeper — every keystroke re-renders 5,000 rows *and* the
controlled form state update serializes nothing, so it's DOM-bound; and you can name the
two fixes in order of preference (virtualize; only then memoize rows).
