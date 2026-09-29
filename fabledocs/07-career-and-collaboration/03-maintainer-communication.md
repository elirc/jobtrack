# Maintainer Communication

The meta-skill: showing your thinking so others can engage with it cheaply. Every
template below has the same skeleton — *context, what I tried, what I think, specific
question* — because "asking for help without outsourcing thinking" is that skeleton.

## Asking a question

```markdown
**Context:** Working on J13 (corrupt-data quarantine). The load catch at
src/JobTracker.jsx#L517-L519 handles both first-run and corrupt-parse.
**What I tried:** Splitting into two try blocks — but then a corrupt read that ALSO
fails quarantine hits the outer catch and I lose the distinction again.
**What I think:** Nesting try/catch around only JSON.parse keeps the cases separate;
feels heavy for six lines.
**Question:** Is the nested-try shape acceptable here, or would you rather I restructure
the effect into named steps?
```

Why it works: the maintainer can answer in one line ("nested is fine") because you
carried the investigation to the decision point. Anti-pattern: "the catch block is
confusing, how should I do this?" — outsourced thinking, unanswerable cheaply.

## Reporting a bug

Minimal reproduction or it didn't happen. For this repo that means: the seed data
(exact JSON), the actions, expected vs actual, environment if relevant.

```markdown
**Repro:** localStorage["jobtracker:data"] = '[{"id":"a","company":"X"}]' (no date field)
→ reload → click "Newest".
**Expected:** X listed, dated —.
**Actual:** [what you saw]
**Suspicion (unverified):** the comparator at L595 guards missing dates, but [—].
Happy to add the failing test if the report holds.
```

The last line — offering the failing test — is the highest-value sentence a junior can
write to a maintainer.

## Proposing a feature

Lead with the problem, not the solution; acknowledge the non-goals list
([SPEC §1](../../SPEC.md)) if you're near it; size it honestly; offer the smaller version.
[M5](../06-contribution-practice/02-mid-level-feature-tickets.md) is the worked example —
status tracking is an explicit non-goal, so the proposal *starts* from "I know this was
scoped out; here's what changed / here's the smallest version that helps."

## Responding to review

- Every comment gets a response: `Done`, `Done — <what changed>`, or a reasoned
  disagreement. Silent partial fixes force re-review of everything.
- Disagreeing: restate their concern *better than they said it*, then your case, then
  defer explicitly or escalate explicitly. "You're right that a second key means two
  reads at boot. I measured: 0.1ms. I still prefer it because [kata 4's count bug];
  but your call — say the word and I'll inline it."
- When you were wrong: "Good catch — fixed in abc123, and added the test that should
  have caught it." No self-flagellation; the added test *is* the apology.

## Triage habits (for when you're the maintainer)

Label fast (bug/feature/question), ask for the repro template above, close politely with
reasons ("out of scope per SPEC §1 — the notes field + export covers most of this;
reopening if that changes"). A closed-with-reason issue is documentation; a stale-open
issue is debt.

## Drill

Write the question message for the trickiest point in
[M3](../06-contribution-practice/02-mid-level-feature-tickets.md) (where does the deleted
record live during the undo window?). Grade yourself against the skeleton: does your
message end in a question a busy person can answer in one sentence?
