# Command Cheatsheet

All from [package.json](../../package.json) scripts or standard npx invocations.
__verified__ = actually run during curriculum authoring (2026-07-30/31);
__inferred__ = read from config, not executed.

| Task | Command | Status |
|---|---|---|
| Install | `npm install` | __verified__ (172 packages) |
| Clean install (CI) | `npm ci` | __inferred__ (lockfile present) |
| Dev server | `npm run dev` → http://localhost:5173 | __verified__ |
| Dev on a specific port | `npx vite --port 5174 --strictPort` | __verified__ (5173) |
| Production build | `npm run build` → `dist/` | __verified__ (~158 kB js) |
| Preview the build | `npm run preview` | __inferred__ |
| All tests once | `npm test` | __verified__ (27 passing) |
| Watch mode | `npm run test:watch` | __inferred__ |
| One test file | `npx vitest run test/storage.test.js` | __verified__ |
| Tests matching a name | `npx vitest run -t "sorts A–Z"` | __inferred__ |
| Coverage | `npx vitest run --coverage` | __inferred__ — needs `@vitest/coverage-v8` installed first |

Not present in this repo (no scripts/config): lint, format, typecheck, migrations,
Docker, codegen. See [01/04](../01-codebase-cartography/04-runtime-and-tooling-map.md).

Useful one-liners while learning:

```js
// Browser console — inspect the stored blob:
JSON.parse(localStorage.getItem("jobtracker:data"))

// Seed N records for perf experiments (see 05/04):
localStorage.setItem("jobtracker:data", JSON.stringify(
  Array.from({length: 5000}, (_, i) => ({
    id: String(i), company: "Co"+i, stack: "a,b,c",
    date: "2026-01-01", notes: "x".repeat(500) }))))

// Wipe (the app's first run again):
localStorage.removeItem("jobtracker:data")
```
