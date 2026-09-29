# Two-Week Cram Plan

Assumes ~2.5 hrs/day weekdays, ~4 hrs weekend days, interview at the end of week 2.
Everything references existing files — this is a schedule, not new content. Adjust days,
keep the *order*: foundation → cards → simulations → rehearsal.

## Week 1 — build the evidence base

**Day 1:** [00-fast-track.md](../00-fast-track.md) §§1-3 (run it, first 10 files, both
flow traces aloud). Evening: read [flows 3-5](../01-codebase-cartography/05-key-flows.md).
**Day 2:** [Pattern catalog](../03-architecture-and-patterns/05-pattern-catalog.md) cards
1-7 — for each, say the interview-angle answer aloud once. Then
[annotation drills](../04-code-reading-gym/01-annotation-drills.md) 1, 2, 5.
**Day 3:** Pattern cards 8-14. [Architecture critique](../03-architecture-and-patterns/06-architecture-critique.md)
read twice — second time aloud as the "critique a codebase" answer.
**Day 4:** Cards [J1-J6](01-js-ts-node-deep-dive.md), aloud, 90s each, twice. Weak ones
get a third pass reading the anchor first. Then [trace tables](../04-code-reading-gym/02-trace-tables.md) 1-3.
**Day 5:** Cards [J7-J12](01-js-ts-node-deep-dive.md) + [F1-F5](02-frontend-framework-questions.md), same protocol.
**Day 6 (weekend):** One real ticket start-to-green — [J13](../06-contribution-practice/01-good-first-tickets.md)
recommended (it feeds [story 3](06-behavioral-star-stories.md)). Write the PR description
per [07/02](../07-career-and-collaboration/02-writing-prs-and-rfcs.md) even with no reviewer.
**Day 7 (weekend):** Cards [F6-F10](02-frontend-framework-questions.md) + [A1-A5](03-api-and-data-modeling-questions.md).
**Checkpoint:** shuffle all 27 cards seen so far; answer 10 random ones cold. 7+
mid-level-or-better (per each card's contrast) → on track. Below → week 2 keeps the
simulations but swaps evening card review for re-anchoring (read the code, then the card).

## Week 2 — simulate and rehearse

**Day 8:** Cards [A6-A10](03-api-and-data-modeling-questions.md). Then
[fake-code contrasts](../04-code-reading-gym/03-fake-code-contrasts.md) 1-8 speed-run:
cover the "better" half, reconstruct it.
**Day 9:** **Mock system design** — [08/04](04-system-design-from-this-repo.md) full
35-min run, recorded, alone or with a friend as interviewer. Self-grade with its rubric.
Review the gaps against the anchored steps.
**Day 10:** Timed [rounds D1 + D4](05-debugging-and-code-review-rounds.md). Evening:
draft all applicable [STAR stories](06-behavioral-star-stories.md) (1, 2, plus any whose
source work you did — at minimum 3 if you did J13 on day 6).
**Day 11:** Timed [rounds R1 + R3](05-debugging-and-code-review-rounds.md) (review
rounds — get a friend to play the pushback author if possible). Story rehearsal: each
story aloud twice, timed under 2:00.
**Day 12:** **Second mock system design** — variation [V1 or V2](04-system-design-from-this-repo.md)
this time. Then [round D3](05-debugging-and-code-review-rounds.md) (the flake).
**Day 13:** Teach-back day (the strongest retention tool): explain to a person or camera —
the storage port (pattern 1), derived state (pattern 4), the optimistic-write tradeoff
(flow 5), and your two-tab clobber trace ([Q-A10's drill](03-api-and-data-modeling-questions.md)).
Then re-run the 5 cards you've been weakest on.
**Day 14 (day before):** Light. Re-read [critique](../03-architecture-and-patterns/06-architecture-critique.md)
and your STAR drafts once. Verify you can state the golden rule's triple (example,
tradeoff, failure mode) for: stale closures, optimistic updates, derived state, keys,
migrations. Stop by early evening. Sleep.

**Final checkpoint (day 14, 20 min):** the five-question self-test — answer aloud:
(1) J3 stale closure with the L577 anchor; (2) F1 derived state with the noted-projection
anchor; (3) A8 migration with the envelope plan; (4) the system-design step-4 latent-races
move; (5) one STAR story cold. All five fluent = go in confident; you have practiced,
anchored answers for the majority of what a mid-level loop asks.

## During the interview — using this repo

- "Have you worked with X?" → if this repo touched it, answer through it: *"in a tracker
  I built/studied, [specific thing with its consequence]"* — always the example, the
  tradeoff, the failure mode.
- Whiteboard freeze → fall back to the flow you've traced five times; narrate it.
- "Any questions for us?" → the [critique's](../03-architecture-and-patterns/06-architecture-critique.md)
  categories work in reverse: ask about their migration story, their flake policy, their
  review culture — questions this curriculum taught you to care about, which is the
  impression you want to leave.
