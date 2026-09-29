# Tooling and Build System

## Vite's two modes — the mental model

- **Dev** (`npm run dev`): no bundling. The browser requests real ES modules;
  Vite transforms each on demand (JSX → JS via [plugin-react](../../vite.config.js#L5)) and
  injects HMR client code. You saw the evidence during verification: fetching
  `/src/JobTracker.jsx` from the dev server returns *transformed* JS with HMR imports
  prepended, not your source.
- **Build** (`npm run build`): Rollup bundles everything reachable from
  [index.html](../../index.html) into hashed assets (`dist/assets/index-*.js`). One JS
  file here, ~158 kB (~51 kB gzip) — almost entirely React itself.

Why it matters: dev and prod run *different code shapes*. Classic bugs live in the gap —
import order side effects, `import.meta` differences, CSS injection timing. This repo's
surface for such bugs is tiny, which is why the smoke test
([smoke.test.jsx](../../test/smoke.test.jsx)) boots the real entry chain.

## ESM everywhere

[`"type": "module"`](../../package.json) makes every `.js` file ESM — including
`vite.config.js`. There is no CommonJS in this repo. Know the interview basics: ESM is
static (imports analyzable before execution, enabling tree-shaking); CJS is dynamic
(`require` is a function call). Vitest and Vite share the same transform pipeline —
which is *the* practical reason Vitest over Jest in Vite projects: no separate babel
config drifting out of sync.

## Test config riding the build config

[vite.config.js#L7-L12](../../vite.config.js#L7-L12): `environment: "jsdom"`,
`globals: true`, one setup file, `css: false`. Points worth being able to defend:

- `globals: true` trades explicit imports for less noise — a style choice; the test files
  still import from `vitest` explicitly ([JobTracker.test.jsx#L4](../../test/JobTracker.test.jsx#L4)),
  which means the suite would survive turning globals off. Defensive-by-accident or not,
  that's the more portable style.
- `css: false` skips CSS processing in tests — irrelevant here (styles are JS objects),
  but it documents intent: *these tests assert behavior, not appearance*.

## The one build-time surprise worth knowing

Fonts load via CSS `@import` inside a JS template string
([JobTracker.jsx#L36](../../src/JobTracker.jsx#L36)) injected at runtime — invisible to
Vite. Consequences: no preload, no bundling, a runtime request the build can't see.
Alternative: a `<link>` in [index.html](../../index.html) (visible, preloadable) — that's
[junior ticket J8](../06-contribution-practice/01-good-first-tickets.md). This is a
miniature of a general senior instinct: **grep for resources the bundler can't see**
(runtime-constructed URLs, injected tags) when auditing a build.

## Interview angle

| Question | Card |
|---|---|
| "Why is Vite fast in dev? What changes in prod?" | [J11](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "ESM vs CJS — practical differences?" | [J12](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "Your bundle is 158 kB for a todo app — walk me through what's in it and whether to care" | [Performance guide](../05-quality-engineering/04-performance-thinking.md) has the analysis |
