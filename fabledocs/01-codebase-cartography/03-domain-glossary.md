# Domain Glossary

Small domain, but the near-synonyms here are exactly the kind that cause real bugs in
bigger repos. Learn to build this table for any codebase — ambiguous vocabulary is where
teams ship inconsistent behavior.

| Term | Meaning here | Code home | Confusable with |
|---|---|---|---|
| **application** (`app`) | One job application record: `{id, company, stack, date, notes}` | [SPEC.md §3](../../SPEC.md), created at [JobTracker.jsx#L579](../../src/JobTracker.jsx#L579) | "the app" (the program). The plural state is `apps` ([L496](../../src/JobTracker.jsx#L496)) — in any other repo that would mean applications-the-software |
| **stack** | Free-text tech-stack string, comma-separated *by convention only* | stored raw, split at render by [`stackTokens` L126-L131](../../src/JobTracker.jsx#L126-L131) | A parsed list. It is **not** stored as an array — that's a deliberate decision (see [pattern card 6](../03-architecture-and-patterns/05-pattern-catalog.md)) |
| **token** | One rendered chip from splitting `stack` | [`StackTokens` L383-L395](../../src/JobTracker.jsx#L383-L395) | Auth tokens (none exist here), design tokens (`C`, [L19-L27](../../src/JobTracker.jsx#L19-L27)) — three meanings of "token" in one file! |
| **notes** | Long-form free text on an application; whitespace-only counts as none | [`hasNotes` L133](../../src/JobTracker.jsx#L133) | "Interview Notes" the *view* — which is a projection, not a place notes live |
| **noted** | The derived list of apps having notes | [L598](../../src/JobTracker.jsx#L598) | `notes` the field. One letter apart; keep them straight when reading |
| **date** | Date *applied*, ISO `YYYY-MM-DD` string, may be `""` | sorted at [L595](../../src/JobTracker.jsx#L595) | A JS `Date` object — only [`parseISO` L89-L94](../../src/JobTracker.jsx#L89-L94) ever creates one |
| **persist** | The single mutation path: set state, then write storage | [L530-L538](../../src/JobTracker.jsx#L530-L538) | "persistence" the layer. `persist` is a verb here — an action, not a module |
| **storage** | The async KV contract `window.storage` | consumed [L512](../../src/JobTracker.jsx#L512)/[L533](../../src/JobTracker.jsx#L533), shimmed in [storage.js](../../src/storage.js) | `localStorage` — the shim's private detail, never referenced by the component |
| **loaded** | "The initial read has *settled*" (success or failure) | [L497](../../src/JobTracker.jsx#L497), flipped in `finally` [L520-L522](../../src/JobTracker.jsx#L520-L522) | "data exists." `loaded && apps.length === 0` is a legitimate state — the empty list |
| **expandedId** | Which one row shows its notes inline (max one) | [L504](../../src/JobTracker.jsx#L504), toggled [L752](../../src/JobTracker.jsx#L752) | `editingId` ([L503](../../src/JobTracker.jsx#L503)) — which record the *form* is editing. Independent states; both can be non-null at once |
| **gutter** | Zero-padded position number in the *current sort* | [`gutter` L135](../../src/JobTracker.jsx#L135), rendered [L426-L428](../../src/JobTracker.jsx#L426-L428) | A stable record number. It renumbers on every sort/delete — it is positional, not identity |

## The senior habit

Notice the pattern in the "confusable with" column: almost every hazard is a **noun used
for both a value and a view of it** (notes/Notes tab, stack/tokens, app/apps). In interviews,
precision here signals seniority: *"the Notes tab is a projection of the applications
array, filtered on a trimmed notes field"* is a mid-level sentence; *"the notes page shows
the notes"* is not.

## Drill

Cover the "Code home" column. For each term, name the file and roughly where it lives,
then check. **Basic:** 6/11. **Solid:** 10/11 plus both meanings of every confusable.
**Strong:** you can also say which two terms would most likely cause a production bug in
a team setting and why (`expandedId` vs `editingId`, and `loaded` vs "data exists").
