# Security Checklist

A local-first, no-auth, no-network app has a small attack surface — the discipline is
mapping it *honestly* instead of skipping the exercise. Half of this file is "not
applicable, and here is precisely why," which is itself the senior skill: threat models
are lists of what you ruled out and on what grounds.

## The threat model

Assets: the user's application list and interview notes (mildly sensitive personal data).
Trust boundary: the browser profile on the machine. Adversaries worth considering:
XSS via stored data, supply chain, a shared computer. Not worth considering: network
attackers (no server), other tenants (none exist).

## Checklist, mapped

| Check | Verdict | Evidence |
|---|---|---|
| **XSS via stored fields** | Safe today | `company`/`stack`/`notes` render only as React text children ([L431](../../src/JobTracker.jsx#L431), [L390](../../src/JobTracker.jsx#L390), [L464](../../src/JobTracker.jsx#L464), [L480](../../src/JobTracker.jsx#L480)) — auto-escaped. Try it: create a company named `<img src=x onerror=alert(1)>` — renders as literal text |
| **`dangerouslySetInnerHTML`** | Present, safe, **fragile** | One use ([L605](../../src/JobTracker.jsx#L605)) injecting the `CSS` template ([L35-L82](../../src/JobTracker.jsx#L35-L82)) — constants only. The invariant to police in review: *no record field may ever flow into that string*. Markdown-in-notes ([SPEC §9](../../SPEC.md) future work) is exactly where this dies — flag it now |
| **Injection (SQL/command)** | N/A — no interpreter touches the data | JSON in/out only ([L514](../../src/JobTracker.jsx#L514), [L533](../../src/JobTracker.jsx#L533)) |
| **CSRF** | N/A — no server, no cookies, no cross-origin writes possible | — |
| **SSRF / open redirect** | N/A — no URLs fetched or followed | The single external fetch is a constant fonts URL ([L36](../../src/JobTracker.jsx#L36)) |
| **AuthZ / IDOR / tenant isolation** | N/A by construction | See [03/03](../03-architecture-and-patterns/03-validation-auth-and-permissions.md) — "impossible" vs "defended," and the exact features (sync/share) that would change the verdict |
| **Secrets in repo** | None exist | No `.env`, no keys; [.gitignore](../../.gitignore) has nothing secret-shaped to hide |
| **Data at rest** | Plaintext localStorage | Anyone with the profile reads it. Acceptable per scope; the honest user-facing statement is "don't keep secrets in notes." Encryption-at-rest would require a passphrase UX — scope decision, not oversight |
| **Dependency risk** | 2 runtime deps (react, react-dom) — minimal; dev deps larger | Audit habit: `npm audit` __inferred__; the *absence* of a lockfile-pinning CI check is a real gap ([J14](../06-contribution-practice/01-good-first-tickets.md)) |
| **Third-party runtime code** | Google Fonts CSS | A compromised fonts CDN could serve malicious CSS (data exfil via CSS is limited but real). Self-hosting fonts removes the only third-party runtime dependency — defensible either way; *knowing the tradeoff exists* is the point |
| **Uploads / webhooks / rate limiting** | N/A — none | Import ([M2](../06-contribution-practice/02-mid-level-feature-tickets.md)) will create the first one: file parsing = input validation requirements return |

## Pre-merge security checklist for this repo

Five questions, every PR:

1. Does any record field reach `dangerouslySetInnerHTML`, `href`, or a dynamically built
   string that an interpreter will read? (Must stay: no.)
2. Does the change add network calls? Each one: to where, sending what?
3. Does it add a dependency? What does it pull in transitively (`npm ls`)?
4. Does it change what's persisted? (Privacy question: are we now storing more than the
   user thinks?)
5. Does an error path leak data into console/error messages that a shared-computer user
   could see?

## Interview angle

"How do you think about XSS in React?" — the precise answer: *React escapes text
children and attribute values; the holes are `dangerouslySetInnerHTML`, `href`/`src`
with `javascript:` URLs, and anything you concatenate into HTML/CSS/URLs yourself.* Then
anchor: this repo has exactly one hole-shaped construct and it's constant-fed. That
two-sentence answer with a real anchor outperforms five minutes of generalities.
