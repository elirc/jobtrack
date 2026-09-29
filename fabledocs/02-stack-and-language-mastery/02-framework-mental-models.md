# React Mental Models

## Render vs commit — and why this file re-runs cheaply

Model: a render is React *calling your function* to compute what the UI should be; commit
is React applying the diff to the DOM. Renders must be pure; effects run after commit.

Every render of [`JobTracker` L495-L778](../../src/JobTracker.jsx#L495-L778) re-executes:
the sort ([L592-L597](../../src/JobTracker.jsx#L592-L597)), the filter
([L598](../../src/JobTracker.jsx#L598)), `canSubmit` ([L600](../../src/JobTracker.jsx#L600)),
and all the JSX. Nothing is memoized. That's not laziness — at this data size, recomputing
is cheaper than the bookkeeping (and the bugs) of caching. The transferable rule:
**memoization is an optimization with a correctness tax (dependency lists); pay it only
when a measurement says so** ([performance guide](../05-quality-engineering/04-performance-thinking.md)).

## State placement — the nine hooks

[L496-L505](../../src/JobTracker.jsx#L496-L505). Ask of each: *could this be derived
instead?* — the litmus test interviewers use.

| State | Could it be derived? | Why it's state |
|---|---|---|
| `apps` | No | Source of truth |
| `loaded` | No | Tracks an event ("read settled"), not data |
| `saveError` | No | Tracks the latest write outcome |
| `tab`, `sortBy` | No | User choices |
| `showForm`, `editingId`, `expandedId` | No | UI mode |
| `form` | No — but note it *duplicates* record fields during edit | Draft state: deliberately divergent until submit |
| `sorted`, `noted` | **They aren't state** — [L592-L598](../../src/JobTracker.jsx#L592-L598) | The lesson |

`form` during editing is the subtle one: it's a *copy* of a record's fields
([`startEdit` L552-L557](../../src/JobTracker.jsx#L552-L557)), which looks like it violates
"don't duplicate state" — but draft-vs-committed is a legitimate duplication with a clear
merge point ([`submit` L574-L577](../../src/JobTracker.jsx#L574-L577)). Being able to
articulate *when duplication is correct* (drafts, optimistic caches) beats reciting
"single source of truth."

Also note `useState(emptyForm)` at [L505](../../src/JobTracker.jsx#L505) — passing the
*function* enables lazy initialization: `emptyForm` runs once at mount, not every render.
Sharp edge: the initial form date is computed at *mount* time; every later reset goes
through `emptyForm()` freshly ([L546](../../src/JobTracker.jsx#L546)). Leave the tab open
past midnight and the *first* form open still shows mount-day. Real, tiny, documented
in [risk R5](../09-reference/risk-register.md) — and a perfect "what's the subtlest bug
here" interview answer.

## Effects — the two in this repo, and the discipline

1. **Load-on-mount** ([L508-L527](../../src/JobTracker.jsx#L508-L527)): empty dep array,
   cleanup sets `cancelled`. StrictMode dev behavior — mount, unmount, remount — runs it
   twice; the flag makes the first run's late resolution harmless. Reading storage twice
   is idempotent, so no further guard is needed. **Effects that only read are cheap to
   make StrictMode-safe; effects that write need idempotency** — interview line worth
   memorizing.
2. **AutoTextarea resize** ([L408-L418](../../src/JobTracker.jsx#L408-L418)): depends on
   `[value]`, touches the DOM (measure `scrollHeight`, set height) — a genuine
   *synchronize-with-an-external-system* effect, which is what effects are for. Note what
   is **not** an effect anywhere: no data-transform effects, no state-sync effects. The
   absence is the curriculum ("you might not need an effect" is an official React doc for
   a reason).

## Controlled inputs

The whole form is controlled: `value` from state, `onChange` into state
([L685-L726](../../src/JobTracker.jsx#L685-L726)), one curried handler
([`setField` L541](../../src/JobTracker.jsx#L541)). Cost: a render per keystroke.
Benefit: `canSubmit` ([L600](../../src/JobTracker.jsx#L600)) and pre-filling for edit
([L552-L557](../../src/JobTracker.jsx#L552-L557)) are trivial reads of state. At this
form size the cost is irrelevant; know that uncontrolled + `FormData` is the escape hatch
for giant forms.

## Keys and identity

Rows use `key={app.id}` ([L748](../../src/JobTracker.jsx#L748)) — identity, stable across
sorts, so React moves DOM nodes instead of rebuilding them, and `expandedId` stays attached
to the right row. The gutter number ([L426-L428](../../src/JobTracker.jsx#L426-L428)) is
*positional* and `aria-hidden` — position is presentation, not identity. Contrast:
`StackTokens` keys by `` `${t}-${i}` `` ([L389](../../src/JobTracker.jsx#L389)) — index-ish
keys are fine there because tokens are read-only leaves with no state attached. Being able
to say *when index keys are acceptable* (static, stateless, never reordered independently)
is a mid-level marker.

## Component boundaries

Four sub-components ([L383-L491](../../src/JobTracker.jsx#L383-L491)) and none of them own
app state — `ApplicationRow` receives `expanded` and callbacks; state stays lifted in the
parent. The split is by *render responsibility*, not by data ownership. When a candidate
says "I'd break JobTracker up," the follow-up is "where does state go?" — the honest
answer is: it stays lifted (or moves to context/reducer), and the split buys readability,
not decoupling.

## Interview angle

| Question | Card |
|---|---|
| "Derived state vs stored state — how do you decide?" | [F1](../08-interview-prep/02-frontend-framework-questions.md) |
| "Why does StrictMode run effects twice, and what breaks?" | [F2](../08-interview-prep/02-frontend-framework-questions.md) |
| "Controlled vs uncontrolled inputs — tradeoffs?" | [F3](../08-interview-prep/02-frontend-framework-questions.md) |
| "What do keys actually do? When are index keys OK?" | [F5](../08-interview-prep/02-frontend-framework-questions.md) |
| "When is duplicating state correct?" | [F6](../08-interview-prep/02-frontend-framework-questions.md) |
