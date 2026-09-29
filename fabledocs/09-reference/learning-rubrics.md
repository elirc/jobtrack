# Learning Rubrics

Observable behaviors, not traits. Self-assess monthly; the interview-ready column is the
bar for walking into a mid-level loop confident on that skill.

## Codebase navigation

| Level | Observable behavior | Interview-ready when… |
|---|---|---|
| Junior | Finds where a feature lives by searching strings; explains one flow with the code open | You can narrate [flow 1 or 2](../01-codebase-cartography/05-key-flows.md) with the code *closed* |
| Mid | Maps contracts and boundaries unprompted on a new repo; predicts where a change will ripple | "Walk me through a codebase" answer uses contracts → flows → risks structure ([story 1](../08-interview-prep/06-behavioral-star-stories.md)) |
| Senior | Identifies the load-bearing invariants and their exact locations; knows what the repo *doesn't* need | You can deliver the [critique](../03-architecture-and-patterns/06-architecture-critique.md)'s what-I'd-refuse-to-change section convincingly |

## React / frontend

| Level | Observable | Interview-ready when… |
|---|---|---|
| Junior | Ships working components; states derived-vs-stored as a rule | [F1](../08-interview-prep/02-frontend-framework-questions.md) at mid tier without notes |
| Mid | Justifies every piece of state (the [state table](../02-stack-and-language-mastery/02-framework-mental-models.md)); writes StrictMode-safe effects; keys-as-identity fluent | F1-F6 all at mid tier; [scenario 4's deduction](../05-quality-engineering/03-systematic-debugging.md) told fluently |
| Senior | Names when the rules invert (legit duplication, index keys, memo tax) with conditions | F-cards' senior tiers reachable on 3+ cards |

## Data & persistence

| Level | Observable | Interview-ready when… |
|---|---|---|
| Junior | CRUD against an existing schema; knows the storage key and shape | Can draw the record + storage layout from memory |
| Mid | Argues the single-blob tradeoff both ways; designs an additive migration with old-data tests ([recipe 4](../05-quality-engineering/02-writing-tests-here.md)) | [A4/A8](../08-interview-prep/03-api-and-data-modeling-questions.md) at mid tier |
| Senior | States consistency guarantees precisely per scope ([A10](../08-interview-prep/03-api-and-data-modeling-questions.md)); pre-identifies latent races with reachability | The [system-design step-4 move](../08-interview-prep/04-system-design-from-this-repo.md) comes out unprompted |

## Testing & debugging

| Level | Observable | Interview-ready when… |
|---|---|---|
| Junior | Writes happy-path tests that pass; fixes bugs by bisecting console.logs | Two [recipes](../05-quality-engineering/02-writing-tests-here.md) done, each seen failing first |
| Mid | Error paths and negative-space assertions by default; debugging = hypothesis → cheap probe, narrated | [Rounds D1/D4](../08-interview-prep/05-debugging-and-code-review-rounds.md) passed on recording |
| Senior | Pins nondeterminism (clock/order) as a design act; knows what *not* to test and says why | D3 strong-tier; the pyramid-follows-architecture argument ([05/01](../05-quality-engineering/01-testing-strategy.md)) is yours |

## Collaboration

| Level | Observable | Interview-ready when… |
|---|---|---|
| Junior | Responds to every review comment; PR descriptions have what/why | One real PR written to the [five-section template](../07-career-and-collaboration/02-writing-prs-and-rfcs.md) |
| Mid | Reviews with severity tiers and door-opening language; disagreement carries a concrete cost, not vibes | [Round R1](../08-interview-prep/05-debugging-and-code-review-rounds.md) passed |
| Senior | Second-round review skill (pushback handling); knows when the answer is an RFC/conversation, not comments | R3 strong-tier; [katas 5 & 7](../04-code-reading-gym/04-review-katas.md) correctly identified as conversations |

## Self-assessment protocol

Monthly: for each table, mark the highest row where *every* observable is true of your
last month's actual work (not your knowledge — your behavior). One honest level below
your self-image is the usual result and the useful signal. Re-run the
[cram plan's checkpoint](../08-interview-prep/07-two-week-cram-plan.md) quarterly even
without an interview — fluency decays.
