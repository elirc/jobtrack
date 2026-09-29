# Daybook — Technical Specification

**Version:** 2.0 · **Owner:** Personal project (single user) · **Status:** Implemented

---

## 1. Overview

Daybook is a single-user web app for personal accountability. The primary section is a
**calendar / time tracker**: what's on today, what got done, at day, week, and month grain.
The secondary section is the original **job application tracker** — company, tech stack,
date applied, and long-form interview notes — kept intact and moved under a shell.

The two sections share a page, a stylesheet, and a storage contract. They do not share
data, and neither knows the other exists. The design stays deliberately minimal: no auth,
no backend, no router, no sync service.

**Non-goals:** multi-user support, accounts, recurring events, reminders/notifications,
calendar import/export (ICS), external calendar sync, application status workflow
(Applied/Interviewing/Offer/Rejected), analytics, drag-to-reschedule, week/day hour grids.

### 1.1 What changed from v1.0

v1.0 was the job tracker alone, as one self-contained file. v2.0 adds the calendar section
and an app shell, and pulls the two things both sections need — design tokens and date math
— into `src/theme.js` and `src/dates.js`. The job tracker's behavior, storage key, and
record shape are unchanged; it lost only the page chrome it used to own (background,
typography, the injected stylesheet) to the shell.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | JavaScript (ES2020+) | No build-time type layer for an app this size |
| UI framework | React 18, function components + Hooks | `useState`/`useEffect` still cover every state need |
| Styling | Inline style objects from shared tokens + one injected `<style>` block | Pseudo-classes, media queries, and the font import live in the CSS string; everything else is a plain object |
| Fonts | Space Grotesk (display), Inter (body), IBM Plex Mono (data) | Loaded via Google Fonts `@import` inside the injected stylesheet |
| Persistence | `window.storage` key-value API (async) | Survives sessions; no backend required |
| Build/deps | Vite + React only | No router, no state library, no date library |
| Tests | Vitest + Testing Library (jsdom) | 74 tests across 6 files |

**Architecture:** a thin shell (`App`) owns the page; each section is one default-exported
component that owns its own state, its own storage key, and its own centered column.

```
index.html
src/
  main.jsx              installs the storage shim, mounts <App/>
  App.jsx               shell: brand, section nav, the one injected stylesheet
  calendar/
    CalendarHome.jsx    calendar / time tracker section
  JobTracker.jsx        job application tracker section
  theme.js              design tokens + the app-wide CSS string
  dates.js              ISO-string date helpers shared by both sections
  storage.js            localStorage-backed window.storage shim
```

**Why sections, not routes.** Section choice is one string of local state in `App`. A router
would add a dependency and a URL to keep in sync in exchange for deep links this app has no
use for — there is nothing to link *to* and nobody to link it *for*.

---

## 3. Application Shell

`App` renders a sticky top bar and one section below it.

- **Brand** — "Daybook", display font, left of the bar.
- **Nav** — a `<nav aria-label="Sections">` of two buttons, Calendar and Job Tracker, each
  carrying `aria-pressed`. The active tab is underlined in cobalt and bumped to 600 weight.
- **Body** — `{section === "calendar" ? <CalendarHome/> : <JobTracker/>}`. The inactive
  section unmounts; it reloads from storage when you switch back.
- **Stylesheet** — the single `CSS` string from `theme.js` is injected here, once, so no
  section carries page-level styling.

| State | Type | Initial | Purpose |
|---|---|---|---|
| `section` | `"calendar" \| "jobs"` | `"calendar"` | Which section is mounted |

**Calendar is home.** The app opens on the calendar because that is the accountability
half — the part with a reason to be checked daily. The job tracker is consulted in bursts.

**Unmount-on-switch is intentional.** Each section reads its key on mount, so switching
tabs re-syncs from storage instead of trusting a stale in-memory array. The cost is a
brief "Loading…" and the loss of ephemeral UI state (expanded notes, an open form, the
calendar's anchor); all of that is cheap to redo and none of it is data.

---

## 4. Data Model

Two independent stores, one key each, each holding a JSON array of records.

```js
// src/calendar/CalendarHome.jsx
const STORAGE_KEY = "timetrack:events";

// Event record
{
  id: string,       // crypto.randomUUID(), with a timestamp+random fallback
  title: string,    // required, non-empty after trim
  date: string,     // ISO date "YYYY-MM-DD" — the day the event is filed under
  start: string,    // "HH:MM" or "" (empty = all-day / untimed)
  end: string,      // "HH:MM" or ""
  category: string, // one of: work | personal | job-hunt | health | other
  notes: string,    // optional long-form text, may contain newlines/paragraphs
  done: boolean     // accountability flag; set false at creation
}
```

```js
// src/JobTracker.jsx  (unchanged from v1.0)
const STORAGE_KEY = "jobtracker:data";

// Application record
{
  id: string,      // Date.now().toString(36) at creation
  company: string, // required, non-empty after trim
  stack: string,   // free text, comma-separated by convention ("TypeScript, Go, Postgres")
  date: string,    // ISO date "YYYY-MM-DD" (date applied)
  notes: string    // optional long-form text
}
```

**Design decisions**

- **Two stores, not one.** A single `daybook:data` document holding both arrays would make
  every calendar write also rewrite the job list, would couple the two sections' schemas,
  and would let a corrupt record in one half blank the other on parse. Separate keys keep
  the blast radius of a bad write or a bad parse inside one section — and they are what
  made adding the calendar a purely additive change: `jobtracker:data` was never migrated,
  never touched, and still loads v1.0 data as-is.
- **Single key, whole array, per store.** Within a store all records are written together
  in one `storage.set`. This avoids sequential round-trips and makes last-write-wins
  semantics trivial for a single user.
- **Two id schemes, deliberately.** The calendar mints `crypto.randomUUID()`; the job
  tracker still mints `Date.now().toString(36)`. Both only ever need to be unique inside
  their own array, so unifying them would mean migrating existing job records for no
  behavioral gain. `randomUUID` is the better default for new code (two events created in
  the same millisecond collide under the timestamp scheme; two applications realistically
  cannot), so the calendar uses it — and falls back to `Date.now().toString(36)` plus a
  random suffix, because `crypto.randomUUID` is undefined outside secure contexts, e.g. a
  built bundle opened over `file://`.
- **Dates are strings, times are strings.** `"YYYY-MM-DD"` and `"HH:MM"` both sort
  lexicographically, so ordering, week membership, and same-month tests are string
  operations. No date library, and no `Date` object ever crosses a boundary.
- **`start`/`end` are labels, not a duration.** Nothing computes elapsed time or validates
  that `end` follows `start`. An event with an end before its start is displayed as typed.
  Duration math is a v3 concern (see §11) and adding it later requires no schema change.
- **Category is a closed set with an open read.** Writes come from a `<select>`, so only
  the five ids can be stored. Reads go through `catOf`, which falls back to *Other* — an
  unknown or missing category renders as Other instead of crashing the row.
- **Notes are stored once, in both sections.** The job tracker's Interview Notes view is a
  *filtered projection* of the same array (`notes.trim() !== ""`), not a copy; the
  calendar's expandable note reads the same field the form writes. There is no second copy
  to keep in sync anywhere.
- **Stack is free text.** Splitting on commas happens only at render time to produce visual
  tokens; the stored value is untouched user input.

---

## 5. State

Nothing outside the two record arrays is persisted. Every view/selection state below is
ephemeral by design (see §5.3).

### 5.1 Calendar (`CalendarHome`)

| State | Type | Initial | Purpose |
|---|---|---|---|
| `events` | `Array<Event>` | `[]` | Source of truth for all events |
| `loaded` | `boolean` | `false` | Gates rendering until the initial read resolves |
| `saveError` | `boolean` | `false` | Shows a non-blocking error bar if a write fails |
| `view` | `"day" \| "week" \| "month"` | `"day"` | Active grain |
| `anchor` | ISO date string | `todayISO()` | The day/week/month being looked at |
| `showForm` | `boolean` | `false` | Add/edit form visibility |
| `editingId` | `string \| null` | `null` | `null` = creating; otherwise the record being edited |
| `expandedId` | `string \| null` | `null` | Which row's notes are expanded (one at a time) |
| `form` | `{title, date, start, end, category, notes}` | empty + today + `work` | Controlled form values |

### 5.2 Job Tracker (`JobTracker`) — unchanged from v1.0

| State | Type | Initial | Purpose |
|---|---|---|---|
| `apps` | `Array<App>` | `[]` | Source of truth for all records |
| `loaded` | `boolean` | `false` | Gates rendering until the initial read resolves |
| `saveError` | `boolean` | `false` | Shows a non-blocking error bar if a write fails |
| `tab` | `"apps" \| "notes"` | `"apps"` | Active view |
| `sortBy` | `"date" \| "alpha"` | `"date"` | Active sort mode |
| `showForm` | `boolean` | `false` | Add/edit form visibility |
| `editingId` | `string \| null` | `null` | `null` = creating; otherwise the record being edited |
| `expandedId` | `string \| null` | `null` | Which row's notes are expanded |
| `form` | `{company, stack, date, notes}` | empty + today | Controlled form values |

### 5.3 View state is ephemeral, on purpose

`section`, `view`, and `anchor` are never written to storage. A refresh returns you to the
calendar, on the day view, anchored to today.

That is the correct default for an accountability tool: the question it exists to answer is
"what is on *today*", and restoring a session that ended three weeks deep in a month view
would answer a question nobody asked. It also removes a whole class of bugs — a persisted
`anchor` goes stale the moment the date rolls over, and "today" would silently stop meaning
today. Getting back to any other view costs one click.

---

## 6. Persistence Behavior

Both sections implement the identical pattern against the same async key-value contract.
The duplication is two ~20-line blocks; the alternative — a shared hook — would have to be
generic over the shape it loads and would couple the sections' failure handling together
for no reduction in real complexity.

```js
await window.storage.get(key); // -> { value: string }, REJECTS if the key is absent
await window.storage.set(key, value);
```

### 6.1 Load (on mount)

```js
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const result = await window.storage.get(STORAGE_KEY);
      if (result && result.value) {
        const parsed = JSON.parse(result.value);
        if (!cancelled && Array.isArray(parsed)) setEvents(parsed);
      }
    } catch (e) {
      // First run throws on the missing key, and corrupt JSON lands here too.
      // Both mean "start empty" — the stored value is left alone until a save.
    } finally {
      if (!cancelled) setLoaded(true);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

- A missing key **throws**; expected on first run, swallowed.
- Corrupt JSON throws into the same handler. The bad value is **not** overwritten — nothing
  writes until the user makes a change, so a corrupt store stays recoverable by hand.
- A non-array parse result is ignored rather than assigned, so a stored object or string
  can't make the render path iterate a non-list.
- The `cancelled` flag makes the effect's cleanup a no-op guard: unmounting mid-read (easy
  now that switching sections unmounts) can't set state on a dead component.
- UI renders "Loading…" until `loaded` flips, preventing a flash of the empty state.

### 6.2 Save (on every mutation)

```js
const persist = async (next) => {
  setEvents(next);               // optimistic UI update first
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(next));
    setSaveError(false);
  } catch (e) {
    setSaveError(true);          // non-blocking error bar; data stays in memory
  }
};
```

- **Optimistic writes:** the UI updates immediately; a failed write shows an error bar but
  never rolls back in-memory state. Losing the user's typing to a storage quota error would
  be a worse outcome than a stale disk.
- Every mutation routes through `persist` — calendar: create, update, delete, toggle-done;
  job tracker: create, update, delete.
- **Known limit:** `persist` is not serialized. Two writes started close together resolve in
  whatever order storage completes them, and each carries a whole-array snapshot taken from
  the state it closed over. Single user, one tab, human-speed input — it has never mattered
  in practice, and it is written down here so it isn't rediscovered as a surprise.

---

## 7. Calendar — Features & Behavior

Eyebrow "Time log"; the heading is the current period; beside it a running
`N events · M done` for that period.

### 7.1 Views and navigation

| Pill | View | Heading | Column |
|---|---|---|---|
| Today | `day` | `Friday · Jul 31, 2026` | 760px |
| Week | `week` | `Jul 27 – Aug 2, 2026`, collapsing whatever the ends share (`Jul 6 – 12, 2026`) | 760px |
| Month | `month` | `July 2026` | 980px |

- The three view pills carry `aria-pressed`; they change grain without moving the anchor.
- A period nav group holds **‹**, **Today**, **›**. The arrows are labeled
  `Previous {view}` / `Next {view}` and step by one day, one week (7 days), or one calendar
  month depending on the active view. **Today** (`aria-label="Jump to today"`) resets the
  anchor without changing the view — it is labeled explicitly because the day pill is also
  called "Today" and the two would otherwise be indistinguishable to a screen reader.
- Month stepping clamps: from Jan 31, "next" lands on Feb 28 (Feb 29 in a leap year), not a
  spill into March.
- **Weeks start on Monday**, everywhere — grid headings, week view, month rows. A working
  log wants the work week contiguous and the weekend as one block at the end; a Sunday
  start splits it. `WEEKDAYS` is Monday-first and `weekdayName` re-indexes `getDay()`
  accordingly, so there is exactly one place that decides this.

### 7.2 Day view (home)

Sorted events for the anchor date, one row each:

- **Checkbox** — toggles `done` and persists immediately. Label: `Mark {title} done`.
- **Time** — `09:00–10:30`, `09:00` when there's no end, or **all day** when there's no start.
- **Title** — display font; struck through and greyed when done.
- **Category chip** — the category label in its own tint, right-aligned.
- **Show notes / Hide notes** — only when notes exist; expands inline with `white-space:
  pre-wrap`. One row expanded at a time (`expandedId`).
- **Edit / Delete**.

**Ordering:** untimed events open the day, then events by `start` ascending (`"HH:MM"` sorts
as text), ties broken by title, case-insensitively. All-day-first is the call because an
untimed item is a commitment for the whole day, not a 00:00 one.

Empty state: "Nothing scheduled today. Add an event to get started." on today, "Nothing
scheduled this day." on any other date — there is nothing to *get started* about on a
Tuesday in March.

### 7.3 Week view

Seven stacked day cards, Monday through Sunday, for the week containing the anchor. Each
card heads with the weekday and `Jul 28`; today's heading is cobalt. The heading is a button
— clicking it sets the anchor to that day and switches to the day view. Events render as
dot (category color) + time + title, struck through when done. Empty days say "No events"
rather than collapsing, so a blank day reads as a fact instead of a rendering gap.

### 7.4 Month view

Whole Monday-start weeks covering the anchor's month, so the first and last rows carry
neighbouring-month days (four rows to six, depending on the month). Each cell is a button
(`aria-label="Jul 31, 2026, 2 events"`) that opens that day. Cells show the day number —
a filled cobalt pill on today — then up to **three** event titles in category tints, then
`+N more`. Out-of-month cells are greyed but fully live: they navigate like any other day.

The three-event cap keeps every row the same height at a fixed cell size; the overflow count
preserves the honest signal ("this day is full") without the cell growing to prove it.

### 7.5 Create / Update

- **+ Add event** toggles the inline form; the button becomes **Cancel**. There is no second
  cancel button inside the form — duplicating the accessible name would be an a11y wart.
- Fields: Title (required, autofocused), Date, Start, End, Category, Notes.
- The form opens pre-dated to the **anchor**, not to today: new events land on the day you
  are looking at.
- Submit is disabled while `title.trim()` is empty, with the hint "Title is required." No
  other validation — no end-after-start check, no overlap detection.
- On create: `{ id: newId(), ...values, done: false }` appended.
- **Edit** pre-fills from the record (an unknown category resolves to Other, an absent date
  to the anchor), sets `editingId`, opens the form, scrolls to top. Submit reads **Save
  changes**; the record is merged in place, so `id` and `done` survive the edit.
- **Empty date falls back to the anchor.** `<input type="date">` can be cleared to `""`, and
  an event with no date would be filed nowhere — invisible in all three views and
  unreachable, since every view indexes by date. Rather than reject the submit or invent a
  fourth "undated" surface, the submit fills in the day being viewed. Every other field is
  stored exactly as typed.

### 7.6 Delete

Guarded by `confirm()` ("Delete this event? This can't be undone."). Permanent — no undo, no
trash. Deleting the expanded row clears `expandedId`; deleting the row being edited closes
the form, so neither can point at a record that no longer exists.

### 7.7 Done semantics

`done` is a per-event boolean toggled directly from the row, and it is the only thing in the
app that records that something actually happened. It is deliberately not a status enum and
carries no timestamp: this is a log of *what I said I'd do vs what I did*, and one bit
answers that. Done events stay in place, struck through, and still count toward the period's
event total — the `N events · M done` line only means something if the denominator keeps
the misses in it.

---

## 8. Job Tracker — Features & Behavior

Unchanged from v1.0 except for its home: it renders its own centered column inside the
shell, and no longer owns the page background, typography, or stylesheet.

### 8.1 Create

- **+ Add application** toggles the inline form; the button becomes **Cancel**.
- Fields: Company (required), Date applied (`<input type="date">`, defaults to today), Tech
  stack (free text), Notes (6-row auto-resizing textarea).
- Submit is disabled while `company.trim()` is empty. No other validation.
- On submit a new record with `id = Date.now().toString(36)` is appended; the form resets and
  closes.

### 8.2 Read / List (Applications tab)

Each row renders:

- **Gutter number** — zero-padded position in the current sort (`01`, `02`, …),
  editor-line-number style. Reflects sort order, not insertion order.
- **Company** (display font) and **date** — `Mon D, YYYY` plus a relative label (`today`,
  `1 day ago`, `N days ago`; future dates read `in N days`).
- **Stack tokens** — the stored string split on `,`, trimmed, rendered as mono chips. Empty
  stack renders nothing.
- **Show notes / Hide notes** — only when notes exist; expands inline (`white-space:
  pre-wrap`). One row at a time.
- **Edit / Delete**.

Empty state: "No applications yet. Add your first one to get started."

### 8.3 Update

**Edit** pre-fills the form, sets `editingId`, opens the form, switches to the Applications
tab, and scrolls to top. Submit reads **Save changes**; the record is replaced in place with
its `id` preserved.

### 8.4 Delete

Guarded by `confirm()` ("Delete this application? This can't be undone."). Permanent.

### 8.5 Sorting

| Mode | Comparator | Direction |
|---|---|---|
| Newest (default) | `(b.date \|\| "").localeCompare(a.date \|\| "")` — safe because ISO dates sort lexicographically | Descending by date |
| A–Z | `(a.company \|\| "").localeCompare(b.company \|\| "", undefined, { sensitivity: "base" })` | Ascending, case-insensitive |

Sorting always operates on a copy (`[...apps].sort(...)`); stored order is never mutated.

### 8.6 Interview Notes tab

- Shows `sorted.filter(hasNotes)` — every application with non-whitespace notes, in the
  current sort order. The tab label carries a count badge when > 0.
- Each card: company, date, stack tokens, full note text, and an **Edit** button that
  switches to the Applications tab with the form pre-filled.
- Empty state: "No interview notes yet. Add notes to any application and they'll collect
  here."

---

## 9. UI / Design Tokens

All tokens live in `src/theme.js` and are imported by every section. Hexes outside that
file are the exceptions worth naming: the calendar's category tints (§9.2), and a scatter
of one-off values — the form field fill `#FBFCFD`, the error bar's three reds, the muted
grey `#9AA4B2`, the note body `#2E3846`, the out-of-month cell fill, and the hover shades
in the CSS string. None of them are reused enough across sections to earn a token.

| Token | Value | Use |
|---|---|---|
| `ink` | `#141B26` | Primary text |
| `inkSoft` | `#5B6675` | Secondary text |
| `paper` | `#EDF0F4` | Page background |
| `card` | `#FFFFFF` | Row/card/form/bar surfaces |
| `line` | `#D6DBE3` | Borders |
| `cobalt` | `#2450E6` | Accent: active states, primary buttons, links, today |
| `cobaltSoft` | `#E8EDFD` | Accent fills: chips, active pills, note rule |

### 9.1 Type roles

Space Grotesk 700 for the brand, period/page titles, event and company names, and counts;
Inter for body and UI; IBM Plex Mono for all data-flavored text — dates, times, stack
tokens, gutter numbers, weekday headings, eyebrow labels.

### 9.2 Category tints

Calendar vocabulary, so they live in `CalendarHome.jsx` rather than `theme.js` — promoting
them to app-wide tokens would imply the job tracker might use them, and it never will.

| Category | Fill | Text |
|---|---|---|
| Work | `cobaltSoft` | `cobalt` |
| Personal | `#EEE9FB` | `#5B3AC9` |
| Job hunt | `#E4F3EA` | `#1C7549` |
| Health | `#FBEBE4` | `#A85122` |
| Other | `#E7EBF1` | `inkSoft` |

### 9.3 Layout

Sticky top bar (brand + section nav) over a single centered column: 760px everywhere except
the calendar's month view, which widens to 980px because seven columns at 760 make cells too
narrow to read a title in.

### 9.4 Accessibility baseline

Visible `:focus-visible` outlines on every interactive element; semantic `<ol>`/`<article>`/
`<label>`/`<nav>` markup; `aria-pressed` on the section nav and view pills, `role="tablist"`
on the job tracker's tabs, `aria-expanded` on note toggles, `role="alert"` on the save-error
bar, `aria-label` on the checkbox, arrows, jump button, and month cells; decorative glyphs
(`‹`, `›`, category dots, the weekday header row) marked `aria-hidden`;
`prefers-reduced-motion` respected; layout responsive to mobile via flex-wrap and one
`max-width: 560px` block.

**Known wart:** the shared stylesheet still carries three job-tracker-only selectors
(`.jt-sorts`, `.jt-rowbody`, `.jt-gutter`) in that mobile block. They're inert in the
calendar section. Splitting the CSS string per section would cost more than it buys at this
size.

---

## 10. Edge Cases & Error Handling

| Case | Behavior |
|---|---|
| First run (no stored key) | `storage.get` throws → caught → empty list. Independently per store: an existing v1.0 `jobtracker:data` loads while `timetrack:events` starts empty |
| Corrupt stored JSON | `JSON.parse` throws into the same handler → empty list; the stored value is **not** overwritten until the next save |
| Stored value parses to a non-array | Ignored; state stays `[]` |
| Partial / old records | Every read site tolerates missing fields: absent `title`/`company` sorts as `""`, absent `date` renders `—` (jobs) or files nowhere (calendar), absent `start` reads "all day", absent/unknown `category` renders as *Other*, absent `notes` shows no toggle, absent `done` is falsy |
| Write failure | Error bar: "Couldn't save your last change. It's still on screen, but it may not survive a refresh."; in-memory state preserved, no rollback |
| Empty title / whitespace-only company | Submit disabled, with a hint |
| Empty date on an event | Falls back to the anchor date at submit |
| Whitespace-only notes | Treated as no notes (no toggle; excluded from the Interview Notes tab) |
| `end` before `start`, or `end` with no `start` | Accepted and rendered as typed; no duration is computed |
| Two events at the same time | Both listed, ordered by title |
| Month step from a 31st | Clamped to the target month's last day |
| `crypto.randomUUID` unavailable (non-secure context) | Falls back to `Date.now().toString(36)` + random suffix |
| Day with more than 3 events, month view | First three shown, then `+N more`; the day view has the full list |
| `window.scrollTo` unsupported (non-browser host) | Wrapped in try/catch; edit still opens |
| Section switch mid-load | Effect cleanup sets `cancelled`; no state is set after unmount |
| Concurrent tabs/devices | Last write wins, per store, whole-array. A tab that loaded before another tab's write will clobber it on its next save. Acceptable for single-user scope; the two stores fail independently, so a calendar write can't lose job data |

---

## 11. Future Enhancements (out of scope for v2)

- Search/filter — by title, category, or company/stack token
- CSV / JSON export, and a combined backup of both stores
- Recurring events
- Duration totals per category per week (the payoff `start`/`end` is already shaped for)
- Cross-section link: file a job-hunt event from an application, or vice versa
- Multi-tab awareness via the `storage` event instead of silent last-write-wins
- Serialized writes (a promise queue behind `persist`)
- Soft delete with undo
- Markdown rendering in notes
- Per-record timestamps (`createdAt` / `updatedAt`) for audit ordering
