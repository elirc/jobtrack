# Daybook: validated application backups

This is a hands-on course for a junior software engineer using the actual project in `jobtrack`. The central skill is **runtime schemas, atomic imports and asynchronous write ordering**. The implementation is already present: use it as a worked example, then recreate a small variation independently.

## What you will be able to do

- Explain the purpose of the changed code and the data it owns.
- Trace an action from input through validation, state/persistence and output.
- Predict a success case and a failure case before running either.
- Read the regression tests and explain what each assertion proves.
- Implement a related change without copying the worked answer.
- Explain a limitation and a reasonable next step without overstating readiness.

## Prerequisites

Be comfortable with variables, arrays, objects, functions, conditionals and calling a function. For React projects, review props, state and event handlers. For API projects, review JSON, HTTP methods and promises, then learn the relevant SQL operations as you trace the request. You do not need to memorize the whole repository first.

## Start the project

Run `npm install` and `npm run dev` from this project folder. Run `npm test` for its automated checks and `npm run build` for the production build.

The commands are run from this project’s folder, not from the Desktop inventory repository. Existing README/Fable material remains available. This folder teaches the implemented change and points to executable source and tests rather than replacing older guides.

### Toolchain

This course was delivered and verified on **Node 22.16.0**, **npm 10**. Use the same major versions: newer patch releases are fine, older majors are untested here.

`npm test` runs `vitest run`, which finds its own test files, so there is no shell glob to worry about on Windows.

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


## Reading and practice order

1. [Codebase map and reading order](01-CODEBASE-MAP.md)
2. [Concepts explained from first principles](02-CONCEPTS.md)
3. [Worked implementation and examples](03-WORKED-CHANGE.md)
4. [Tests, failure cases and debugging](04-TESTING-AND-DEBUGGING.md)
5. [Guided and independent exercises](05-PRACTICE.md)
6. [Solutions, tradeoffs and review rubric](06-SOLUTIONS-AND-REVIEW.md)
7. [Actual verification results and limits](VERIFICATION.md)

8. [Step-by-step trace lab and concrete examples](07-TRACE-LAB.md)

## Your first session

1. Open the app or its tests and reproduce one normal workflow.
2. Read chapter 1 while keeping [src/jobBackup.js](../src/jobBackup.js) open.
3. Write a prediction for the worked example in chapter 3 before executing it.
4. Run the focused test suite and explain one assertion aloud.
5. Complete the first practice exercise, then check the solution discussion.

Keep a short learning log with four fields: prediction, observed result, explanation and next question. A mismatch is useful evidence: find the exact layer where your mental model diverged from the program. Use a disposable browser profile or local test database for failure experiments so your own records are not part of the fixture.

## Scope

The application section exports a versioned JSON backup and imports it as an explicitly labeled replacement. It validates field types, bounded lengths, ids, status, dates and URLs before writing. A failed parse or rejected host write leaves the displayed applications unchanged. This is one bounded improvement, not certification of every feature. Read VERIFICATION.md for checks actually executed. Exercises are intentionally future practice; do not confuse them with completed implementation.
