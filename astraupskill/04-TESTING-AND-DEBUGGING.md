# Testing and debugging

[Course index](README.md)

## Run the checks

Run `npm install` and `npm run dev` from this project folder. Run `npm test` for its automated checks and `npm run build` for the production build.

```text
npm test
```

### Expect a slow suite, and do not run it in your inner loop

`npm test` runs the **whole** inherited Vitest suite: 8 files, 90 cases, of which only `test/jobBackup.test.js` belongs to this lesson. On the delivery machine the full run took roughly **8-10 minutes**, and one form test in `JobTracker.test.jsx` exceeded Vitest's 30-second default timeout on the first attempt (it passed on a focused retry with a 120-second allowance). That is recorded in `VERIFICATION.md`, and it is expected behaviour on ordinary hardware - if you see it, you have not broken anything.

While you are working, run only this lesson's file:

```powershell
npx vitest run test/jobBackup.test.js
```

That finishes in seconds. Use the full `npm test` as a gate before you consider a change finished, and if the slow form test times out there too, re-run it on its own with a longer allowance rather than assuming a regression:

```powershell
npx vitest run test/JobTracker.test.jsx --testTimeout=120000
```

If `vitest run` prints `[vitest-pool-runner]: Timeout waiting for worker to respond` and `Test Files  no tests`, the suite did not fail - Vitest never managed to start a worker process. That grace period is hard-coded (60 seconds for the forks pool, 90 for threads; see `START_TIMEOUT` in `node_modules/vitest/dist/chunks/cli-api.*.js`) and is not configurable from `vite.config.js` or the CLI. It was reproduced on the follow-up machine on 2026-09-17 with both `--pool=forks` and `--pool=threads`. If you hit it, close other heavy processes and retry, or exercise the pure module directly with Node's own runner - `src/jobBackup.js` has no React or jsdom dependency, which is exactly why it was written as a standalone module:

```javascript
import assert from 'node:assert/strict';
import { parseJobBackup, commitJobBackup, MAX_BACKUP_BYTES } from './src/jobBackup.js';
// ...same inputs, same expectations, no test framework required.
```

## What the test suite proves

Read [test/jobBackup.test.js](../test/jobBackup.test.js). The suite targets **runtime schemas, atomic imports and asynchronous write ordering** and uses the worked fixture:

A backup with a valid Acme application followed by another record with the same id is rejected as a whole. The storage set function must not be called. A valid two-record backup is written once; importing it again still yields two records with their original ids.

The expectation should not be copied from the function being tested. Hand-calculate counts, amounts, identities or elapsed time first. Otherwise the same mistake can appear in both implementation and expected result. Tests that exercise only a mocked dependency prove a narrower contract than tests against the real dependency; read the helper to understand which kind you are running.

This project has no plain app.js: its pure tests verify the state helpers' data behavior directly, and the component and browser checks verify that the controls call those helpers correctly. A real browser check is still useful for layout, focus visibility and native interaction.

## Debugging workflow

1. Reproduce the smallest failing case with the exact input saved in your notes.
2. Inspect the relevant event/request. Confirm the intended handler actually ran.
3. Pause at `parseJobBackup` and inspect input types as well as values.
4. Follow validation branches, noting whether any state or persistence changed before rejection.
5. Inspect the write result and the subsequent render/response. Separate storage correctness from display correctness.
6. Add a regression reproducing the failure, make the smallest justified fix, then run the focused suite and relevant broader checks.

Avoid changing several layers at once when you do not yet know where the failure starts. A correct backend with a stale UI needs a different fix from a malformed query or an invalid saved document.

## Failure experiments

- Reuse the invalid fixture from the tests and verify no unintended records or fields change.
- Reload or restart after a successful operation to distinguish persistence from temporary screen state.
- Repeat the operation and explain whether it should be idempotent, rejected or intentionally create another record.
- Simulate the relevant timing or storage failure only in a disposable fixture. Restore normal behavior after the experiment.

## Reading an assertion failure

“Expected 3, received 4” is evidence about one observation, not a complete diagnosis. Ask whether the fixture created an extra record, the operation ran twice, an old record survived, or the assertion looked at an unfiltered collection. Start from the state table and trace the first point where the actual value diverges. A stack trace identifies where the program noticed a problem, which may be later than the code that caused it.

## Verification record

The companion [VERIFICATION.md](VERIFICATION.md) records checks actually run for this implementation. Record your own command, date, result and any environmental prerequisite when practicing. A passing test does not imply every route, browser, dependency version or production deployment has been exercised.
