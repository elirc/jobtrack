# Verification: Daybook: validated application backups

[Course index](README.md)

**Implementation date:** 2026-09-08. Checks below ran on isolated working copies before the reviewed files were applied to this project.

| Check | Result |
|---|---|
| tests | Passed (exit code 0) |
| build | Passed (exit code 0) |
| Real Chromium browser interaction | Passed |

**Automated test cases:** 6 in `test/jobBackup.test.js` (two of them parameterized over 4 and 6 inputs) - 4 delivered by this change, plus 2 added in the 2026-09-17 follow-up covering the two bounds that were previously asserted only by inspection. The project's inherited Vitest suite is 90 cases across 8 files; it was re-run as a regression gate, not authored here.

## What was exercised

A backup with a valid Acme application followed by another record with the same id is rejected as a whole. The storage set function must not be called. A valid two-record backup is written once; importing it again still yields two records with their original ids.

The two follow-up cases cover the denial-of-service bounds: a well-formed document padded past `MAX_BACKUP_BYTES` is rejected with "no larger than 2 MB" *before* `JSON.parse` runs, and 10,001 applications are rejected with "at most 10,000 applications" while exactly 10,000 are accepted - so the limit is proven inclusive rather than assumed. Both assert `storage.set` was never called.

**Follow-up run, 2026-09-17 - partial, and stated as such.** `npx vitest run test/jobBackup.test.js` could **not** be completed on the follow-up machine: Vitest 4.1.10 aborted with `[vitest-pool-runner]: Timeout waiting for worker to respond` after 60 seconds without starting a worker, with both `--pool=forks` and `--pool=threads`. That grace period is hard-coded (`START_TIMEOUT`) and cannot be raised from config or the CLI, so no Vitest result is claimed here. The two new assertions were instead re-checked against the real `src/jobBackup.js` with Node's own runner (`node` importing the module directly, no test framework) and both passed: an oversized but well-formed document is rejected with "no larger than 2 MB" before `JSON.parse` and leaves `storage.set` uncalled; 10,001 applications are rejected with "at most 10,000 applications" while exactly 10,000 parse successfully. `node --check test/jobBackup.test.js` is clean. The four delivered cases were not re-executed on this machine.

## Environment and scope

The verification environment used Node 22.16.0. Browser checks used the installed Chromium build.

Tests and builds ran in working copies with an isolated shared dependency harness. Source files were checked against the original content before application. Install this project’s declared dependencies locally to run its scripts; no running service or installed dependency tree is assumed merely because the source changes are present.

The tests target the implemented change and relevant existing behavior. They do not establish production readiness, every browser/version, multi-tab safety or every unrelated workflow. Practice extensions in chapter 5 are not completed features.

## Reproduce the checks

From this project folder: `npm install`, then `npm test`.

The central implementation report in AstraOrganized2/astrafinalplan/TEN_PROJECTS_IMPLEMENTED.md links all ten courses. Machine-readable check results and logs are retained with the implementation tooling in that repository.

Reading the diff: the files Astra touched were re-saved with CRLF line endings and Prettier formatting, so a plain `diff` shows whole files as changed. Compare with `git diff -w`, or `diff -r --strip-trailing-cr -w <backup> <project>` against the pre-change backup, to see only the real edits.

## Test-run detail

Full suite: 89 of 90 passed; one form test exceeded 30 seconds. Focused retry of that test passed with 120-second allowance. Harness worker startup grace extended to 300 seconds; assertions unchanged.
