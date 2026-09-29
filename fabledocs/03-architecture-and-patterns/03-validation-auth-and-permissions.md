# Validation, Auth, and Permissions

## The validation map — every rule in the app

| Rule | Enforced at | Layer |
|---|---|---|
| Company required (after trim) | Button gate [L600](../../src/JobTracker.jsx#L600) + [L729](../../src/JobTracker.jsx#L729); handler re-check [L570-L571](../../src/JobTracker.jsx#L570-L571) | UI **and** mutation path |
| Date is a plausible ISO string | Regex in [`parseISO` L90](../../src/JobTracker.jsx#L90) — at *render*, not at write | Read side only |
| Stored blob is an array | [L515](../../src/JobTracker.jsx#L515) | Load boundary |
| Fields exist on old records | `\|\| ""` guards [L595-L596](../../src/JobTracker.jsx#L595-L596), [L553-L556](../../src/JobTracker.jsx#L553-L556) | Read sites |
| Notes "exist" = non-whitespace | [`hasNotes` L133](../../src/JobTracker.jsx#L133) | Predicate used by both views |

Two patterns worth extracting:

1. **The double enforcement** of company-required — disabled button *plus* handler check —
   is defense in depth in miniature. The button state is UX; the handler check is the
   actual rule. In a client-server app the same rule appears a third time, server-side,
   and *that* one is the only one that counts for security. Learn the sentence:
   **"client validation is a courtesy; the mutation path owns the rule."** Here the
   mutation path is `submit`, and it does.
2. **Write-permissive, read-defensive dates.** Nothing stops you saving a record whose
   date the `<input type="date">` didn't populate (empty string is legal). The system
   stays honest by making every *reader* handle the bad value (`—` at
   [L107](../../src/JobTracker.jsx#L107), sink-to-bottom at [L595](../../src/JobTracker.jsx#L595)).
   Alternative: validate at write and reject. Tradeoff: write-strict systems corrupt less
   but lose data on edge cases (what if the user genuinely doesn't remember the date?);
   read-defensive systems never lose input but every reader pays. This repo chose reader-pays,
   consistently. Inconsistency between the two is where real apps rot.

## Authn/authz: what "none" actually means

There is no authentication and no authorization — but say it precisely, because "it has
no auth" is a junior sentence and this is the senior version:

- **The trust boundary is the browser profile.** Anyone with the machine/profile has full
  read-write (localStorage is plaintext on disk). [SPEC §1](../../SPEC.md) scopes to
  single user; the data (companies, interview notes) is low-sensitivity personal data.
- **There is no tenant isolation to get wrong.** The classic multi-user bugs — IDOR
  (fetching by id without ownership check), missing permission filter on a list query,
  cross-tenant writes — are *structurally impossible* here, not defended against.
  Recognizing "impossible by construction" vs "defended by checks" is a distinction
  interviewers reward.
- **The moment it changes:** add sync, sharing, or a backend and every mutation and query
  in [flow 2/3](../01-codebase-cartography/05-key-flows.md) needs an owner check — the
  design consequence traced in [08/04 system design, variation 1](../08-interview-prep/04-system-design-from-this-repo.md).

## What a junior misses vs what a senior checks

| Junior misses | Senior checks |
|---|---|
| Handler re-validation ("the button's already disabled!") | Every path to the mutation: Enter key, future callers, tests bypassing UI |
| That `""` date is legal | Whether *all* readers of `date` handle `""` (they do — enumerate them: [L595](../../src/JobTracker.jsx#L595), [L105-L109](../../src/JobTracker.jsx#L105-L109), [L112-L114](../../src/JobTracker.jsx#L112-L114)) |
| XSS "risk" in notes | That React escapes text children ([L464](../../src/JobTracker.jsx#L464), [L480](../../src/JobTracker.jsx#L480)) and the only `dangerouslySetInnerHTML` ([L605](../../src/JobTracker.jsx#L605)) injects a **constant** — see [security checklist](../05-quality-engineering/05-security-checklist.md) |

## Drill

Someone adds "import applications from a JSON file." List every validation that must now
exist that currently doesn't, and where each belongs. Self-grade — Solid: shape
validation per record, id uniqueness/regeneration, size limits; all at the import
boundary. Strong: also catches that import is the moment `Date.now()` ids collide
([risk R3](../09-reference/risk-register.md)) and that imported `notes` are still safe
against XSS only because rendering stays escaped — so the *rule* to write down is "no
new `dangerouslySetInnerHTML` on record fields," which is a review-checklist item, not code.
