# Daybook

A private, local-first planner with two connected parts:

- A day, week, and month calendar for events, notes, categories, and completion tracking.
- A job-search pipeline with stages, company and role details, full-text search, filters,
  posting links, and a dedicated interview-notes view.

There is no account or backend. Data stays in the browser unless the host supplies its own
compatible storage provider. The original product brief is in [`SPEC.md`](./SPEC.md).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 92 test cases in 7 files, Vitest + Testing Library
npm run build    # production bundle in dist/
```

Node 20.19+ or 22.12+ is required by the build toolchain.

## Project map

```text
index.html
src/
  main.jsx              mounts the app and installs the storage shim
  App.jsx               responsive shell, brand, navigation, skip link
  calendar/
    CalendarHome.jsx    calendar CRUD, day/week/month views, completion
  JobTracker.jsx        pipeline CRUD, search/filter, applications + notes
  theme.js              design tokens and shared responsive CSS
  dates.js              strict local-date parsing and date math
  storage.js            localStorage-backed async storage adapter
test/
  App.test.jsx          shell and section navigation
  Calendar.test.jsx     CRUD, views, navigation, notes, time validation
  JobTracker.test.jsx   CRUD, pipeline fields, search/filter, persistence
  dates.test.js         strict parsing, date math, month-end behavior
  storage.test.js       storage adapter contract
  smoke.test.jsx        real entry-point boot test
```

## Persistence

The calendar and pipeline are independent JSON arrays:

- `timetrack:events`
- `jobtracker:data`

Both use the same asynchronous interface:

```js
await window.storage.get(key); // { value: string }; rejects when absent
await window.storage.set(key, value);
```

`src/storage.js` installs a localStorage implementation when the host does not provide one.
Writes update the interface optimistically and surface failures without discarding the
on-screen change. Rapid writes are serialized so they cannot finish out of order. Separate
browser tabs can still overwrite one another.

Existing job records remain compatible: missing role, location, URL, or pipeline status
fields receive safe display defaults until the record is edited.

## Product and implementation notes

- Weeks start on Monday in every calendar view.
- Dates remain `YYYY-MM-DD` local-calendar strings. Strict parsing rejects impossible dates,
  and relative labels use calendar-day ordinals to avoid daylight-saving-time errors.
- End times must be later than start times when both are supplied.
- Interview notes are a filtered view of the application records, never a second copy.
- Posting links accept a hostname or full HTTP(S) URL and are normalized before storage.
- The interface includes responsive layouts, visible keyboard focus, a skip link, semantic
  controls, and reduced-motion support.
- Deletion is permanent and guarded by a confirmation prompt.

## Not included

Authentication, cloud sync, export/import, recurring events, duration totals, multi-tab
coordination, soft delete/undo, markdown rendering, and record audit timestamps.

## Junior SWE learning course

[Start the detailed Astra upskilling course](astraupskill/README.md): runtime schemas, atomic imports and asynchronous write ordering, with a codebase map, worked implementation, executable examples, debugging labs, exercises and solution discussions.
