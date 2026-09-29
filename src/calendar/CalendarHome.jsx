import React, { useEffect, useRef, useState } from "react";
import {
  MONTHS,
  MONTHS_LONG,
  WEEKDAYS,
  addDays,
  addMonths,
  formatDate,
  isSameMonth,
  isToday,
  monthGrid,
  parseISO,
  todayISO,
  weekDays,
  weekdayName,
} from "../dates.js";
import { C, BODY, DISPLAY, MONO } from "../theme.js";

/**
 * Calendar — the home section, and the accountability half of the app.
 *
 * Homepage is today: what's on, what's done. Week and month views are the same
 * records read at a coarser grain, so all three share one list in state and one
 * write path. Like the Job Tracker, this owns its data and its centered column
 * but nothing about the page — the App shell brings the stylesheet.
 *
 *   await window.storage.get(key)  -> { value: string }   (throws if absent)
 *   await window.storage.set(key, value)
 */

const STORAGE_KEY = "timetrack:events";

/* ----------------------------------------------------------------- helpers */

/**
 * The five buckets an event can fall in. The tints live here rather than in
 * theme.js — they're calendar vocabulary, not app-wide tokens.
 */
const CATEGORIES = [
  { id: "work", label: "Work", bg: C.cobaltSoft, fg: C.cobalt },
  { id: "personal", label: "Personal", bg: "#EEE9FB", fg: "#5B3AC9" },
  { id: "job-hunt", label: "Job hunt", bg: "#E4F3EA", fg: "#1C7549" },
  { id: "health", label: "Health", bg: "#FBEBE4", fg: "#A85122" },
  { id: "other", label: "Other", bg: "#E7EBF1", fg: C.inkSoft },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Unknown or missing categories read as "Other" instead of vanishing. */
const catOf = (ev) => BY_ID.get(ev.category) || BY_ID.get("other");

/** "09:00–10:30", "09:00", or "all day" when the event carries no start. */
function timeLabel(ev) {
  const start = ev.start || "";
  if (!start) return "all day";
  return ev.end ? `${start}–${ev.end}` : start;
}

const hasNotes = (ev) => Boolean(ev.notes && ev.notes.trim());

/** Untimed events open the day; the rest go by the clock ("HH:MM" sorts as text). */
function sortEvents(list) {
  return [...list].sort((a, b) => {
    const as = a.start || "";
    const bs = b.start || "";
    if (as !== bs) {
      if (!as) return -1;
      if (!bs) return 1;
      return as.localeCompare(bs);
    }
    return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
  });
}

/** date -> its sorted events, so the week and month grids index instead of refiltering. */
function groupByDate(events) {
  const map = new Map();
  for (const ev of events) {
    const key = ev.date || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ev);
  }
  for (const [key, list] of map) map.set(key, sortEvents(list));
  return map;
}

/** "2 events · 1 done" — the accountability line under every period title. */
function summarize(list) {
  const done = list.filter((ev) => ev.done).length;
  return `${list.length} ${list.length === 1 ? "event" : "events"} · ${done} done`;
}

/** "Jul 28" — a day without its year, for grid headings. */
function shortDay(iso) {
  const d = parseISO(iso);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : "—";
}

/** "Jul 28 – Aug 3, 2026", collapsing whatever the two ends already share. */
function weekLabel(startIso, endIso) {
  const s = parseISO(startIso);
  const e = parseISO(endIso);
  if (!s || !e) return "";
  if (s.getFullYear() !== e.getFullYear()) {
    return `${shortDay(startIso)}, ${s.getFullYear()} – ${shortDay(endIso)}, ${e.getFullYear()}`;
  }
  const right = s.getMonth() === e.getMonth() ? `${e.getDate()}` : shortDay(endIso);
  return `${shortDay(startIso)} – ${right}, ${e.getFullYear()}`;
}

const VIEWS = [
  { id: "day", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const emptyForm = (date) => ({ title: "", date, start: "", end: "", category: "work", notes: "" });

/** randomUUID is missing outside secure contexts (a build opened over file://). */
const newId = () =>
  globalThis.crypto && globalThis.crypto.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ------------------------------------------------------------------ styles */

const S = {
  column: (wide) => ({ maxWidth: wide ? 1040 : 860, margin: "0 auto" }),

  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: ".16em",
    textTransform: "uppercase",
    color: C.inkSoft,
    margin: 0,
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 10,
  },
  title: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, lineHeight: 1.12, letterSpacing: "-.035em", margin: 0 },
  count: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, color: C.inkSoft, whiteSpace: "nowrap", margin: 0 },

  pills: { display: "inline-flex", gap: 3, padding: 4, marginTop: 24, background: "rgba(255,255,255,.7)", border: `1px solid ${C.line}`, borderRadius: 12 },
  pill: (active) => ({
    background: active ? C.card : "transparent",
    border: "none",
    color: active ? C.ink : C.inkSoft,
    borderRadius: 8,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    boxShadow: active ? "0 1px 4px rgba(28,36,32,.1)" : "none",
  }),

  overview: { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 18, padding: "14px 16px", margin: "18px 0", background: "rgba(255,255,255,.72)", border: `1px solid ${C.line}`, borderRadius: 12 },
  progressTrack: { height: 7, borderRadius: 999, overflow: "hidden", background: "#E7E8E4", marginTop: 7 },
  progressFill: (value) => ({ width: `${value}%`, height: "100%", borderRadius: 999, background: value === 100 ? C.cobalt : C.accent, transition: "width 240ms ease" }),
  overviewTitle: { fontSize: 13.5, fontWeight: 600 },
  overviewMeta: { fontFamily: MONO, color: C.inkSoft, fontSize: 11.5 },

  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "16px 0 18px",
  },
  nav: { display: "flex", alignItems: "center", gap: 6 },
  arrow: {
    background: C.card,
    border: `1px solid ${C.line}`,
    color: C.inkSoft,
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 15,
    lineHeight: 1.2,
  },
  jump: {
    background: C.card,
    border: `1px solid ${C.line}`,
    color: C.inkSoft,
    borderRadius: 8,
    padding: "5px 13px",
    fontSize: 13,
    fontWeight: 500,
  },

  primary: {
    background: C.cobalt,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
  },
  ghost: {
    background: C.card,
    border: `1px solid ${C.line}`,
    color: C.inkSoft,
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 500,
  },
  smallGhost: {
    background: "transparent",
    border: `1px solid ${C.line}`,
    color: C.inkSoft,
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 12.5,
    fontWeight: 500,
  },
  link: {
    background: "none",
    border: "none",
    padding: 0,
    color: C.cobalt,
    fontSize: 13,
    fontWeight: 500,
  },

  form: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    padding: 22,
    marginBottom: 22,
  },
  formTitle: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, margin: "0 0 16px" },
  fieldRow: { display: "flex", gap: 14, flexWrap: "wrap" },
  field: { display: "block", marginBottom: 14, flex: "1 1 220px", minWidth: 0 },
  narrow: { flex: "0 1 150px" },
  label: {
    display: "block",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: C.inkSoft,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#FBFCFD",
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    padding: "9px 11px",
    fontSize: 14.5,
    fontFamily: BODY,
  },
  textarea: {
    width: "100%",
    background: "#FBFCFD",
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    padding: "10px 11px",
    fontSize: 14.5,
    fontFamily: BODY,
    lineHeight: 1.6,
    resize: "vertical",
    minHeight: 92,
  },
  formActions: { display: "flex", gap: 10, alignItems: "center", marginTop: 4 },
  hint: { color: C.inkSoft, fontSize: 12.5 },

  list: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 },
  row: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    padding: "16px 18px",
  },
  rowMain: { display: "flex", alignItems: "flex-start", gap: 13 },
  check: { width: 18, height: 18, marginTop: 3, accentColor: C.cobalt, flex: "none" },
  rowBody: { flex: "1 1 auto", minWidth: 0 },
  rowHead: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  time: { fontFamily: MONO, fontSize: 12.5, color: C.inkSoft, whiteSpace: "nowrap" },
  eventTitle: (done) => ({
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 16.5,
    letterSpacing: "-.01em",
    margin: 0,
    color: done ? C.inkSoft : C.ink,
    textDecoration: done ? "line-through" : "none",
  }),
  chip: (cat) => ({
    fontFamily: MONO,
    fontSize: 11.5,
    background: cat.bg,
    color: cat.fg,
    borderRadius: 5,
    padding: "2px 8px",
    marginLeft: "auto",
    whiteSpace: "nowrap",
  }),
  rowFoot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 10,
  },
  actions: { display: "flex", gap: 8, marginLeft: "auto" },
  note: {
    whiteSpace: "pre-wrap",
    marginTop: 10,
    paddingLeft: 14,
    borderLeft: `3px solid ${C.cobaltSoft}`,
    color: "#2E3846",
    fontSize: 14.5,
    lineHeight: 1.7,
  },

  /* week */
  weekList: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 },
  weekDay: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    padding: "14px 17px",
  },
  weekHead: (today) => ({
    display: "flex",
    alignItems: "baseline",
    gap: 9,
    background: "none",
    border: "none",
    padding: 0,
    color: today ? C.cobalt : C.ink,
  }),
  weekName: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 15.5 },
  weekDate: { fontFamily: MONO, fontSize: 12.5, color: "inherit", opacity: 0.75 },
  weekEvents: { listStyle: "none", margin: "9px 0 0", padding: 0, display: "grid", gap: 6 },
  weekEvent: { display: "flex", alignItems: "baseline", gap: 9 },
  dot: (color) => ({
    width: 7,
    height: 7,
    borderRadius: 999,
    background: color,
    flex: "none",
    alignSelf: "center",
  }),
  weekTime: { fontFamily: MONO, fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap", minWidth: 92 },
  weekTitle: (done) => ({
    fontSize: 14.5,
    color: done ? C.inkSoft : C.ink,
    textDecoration: done ? "line-through" : "none",
  }),
  weekEmpty: { color: "#9AA4B2", fontSize: 13.5, margin: "8px 0 0" },

  /* month */
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 6,
    marginBottom: 6,
  },
  weekdayCell: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: C.inkSoft,
    textAlign: "center",
  },
  monthGrid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 },
  cell: (inMonth) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 3,
    minHeight: 104,
    padding: "6px 7px",
    textAlign: "left",
    background: inMonth ? C.card : "#F6F8FA",
    border: `1px solid ${C.line}`,
    borderRadius: 10,
    overflow: "hidden",
  }),
  cellNum: (today, inMonth) => ({
    alignSelf: "flex-start",
    fontFamily: MONO,
    fontSize: 12,
    borderRadius: 999,
    padding: today ? "1px 7px" : "1px 2px",
    background: today ? C.cobalt : "transparent",
    color: today ? "#fff" : inMonth ? C.ink : "#9AA4B2",
  }),
  cellEvent: (done, cat) => ({
    display: "block",
    fontSize: 11.5,
    lineHeight: 1.5,
    background: cat.bg,
    color: cat.fg,
    borderRadius: 4,
    padding: "0 4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    opacity: done ? 0.6 : 1,
    textDecoration: done ? "line-through" : "none",
  }),
  cellMore: { fontSize: 11, color: C.inkSoft, paddingLeft: 4 },

  empty: {
    background: C.card,
    border: `1px dashed ${C.line}`,
    borderRadius: 12,
    padding: "34px 22px",
    textAlign: "center",
    color: C.inkSoft,
    fontSize: 14.5,
  },
  loading: { fontFamily: MONO, fontSize: 13, color: C.inkSoft, padding: "40px 0" },
  errorBar: {
    background: "#FCECEC",
    border: "1px solid #F0C3C3",
    color: "#8E1B22",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13.5,
    marginBottom: 16,
  },
};

/* ------------------------------------------------------------- sub-renders */

function EventRow({ ev, expanded, onToggleDone, onToggleNotes, onEdit, onDelete }) {
  const done = Boolean(ev.done);
  const notes = hasNotes(ev);
  const cat = catOf(ev);
  return (
    <li>
      <article className="jt-row" style={S.row} aria-label={ev.title}>
        <div style={S.rowMain}>
          <input
            type="checkbox"
            style={S.check}
            checked={done}
            onChange={onToggleDone}
            aria-label={`Mark ${ev.title} done`}
            title={done ? "Mark incomplete" : "Mark complete"}
          />
          <div style={S.rowBody}>
            <div style={S.rowHead}>
              <span style={S.time}>{timeLabel(ev)}</span>
              <h3 style={S.eventTitle(done)}>{ev.title}</h3>
              <span style={S.chip(cat)}>{cat.label}</span>
            </div>

            <div style={S.rowFoot}>
              {notes && (
                <button
                  type="button"
                  className="jt-link"
                  style={S.link}
                  aria-expanded={expanded}
                  onClick={onToggleNotes}
                >
                  {expanded ? "Hide notes" : "Show notes"}
                </button>
              )}
              <div style={S.actions}>
                <button type="button" className="jt-ghost" style={S.smallGhost} onClick={onEdit}>
                  Edit
                </button>
                <button
                  type="button"
                  className="jt-ghost jt-danger"
                  style={S.smallGhost}
                  onClick={onDelete}
                >
                  Delete
                </button>
              </div>
            </div>

            {notes && expanded && <div style={S.note}>{ev.notes}</div>}
          </div>
        </div>
      </article>
    </li>
  );
}

/** Seven stacked days. Each heading jumps the day view to that date. */
function WeekView({ days, byDate, onPick }) {
  return (
    <ol style={S.weekList}>
      {days.map((iso) => {
        const list = byDate.get(iso) || [];
        return (
          <li key={iso} style={S.weekDay}>
            <button
              type="button"
              style={S.weekHead(isToday(iso))}
              aria-label={`${weekdayName(iso)}, ${formatDate(iso)}`}
              onClick={() => onPick(iso)}
            >
              <span style={S.weekName}>{weekdayName(iso, "short")}</span>
              <span style={S.weekDate}>{shortDay(iso)}</span>
            </button>

            {list.length === 0 ? (
              <p style={S.weekEmpty}>No events</p>
            ) : (
              <ul style={S.weekEvents}>
                {list.map((ev) => (
                  <li key={ev.id} style={S.weekEvent}>
                    <span style={S.dot(catOf(ev).fg)} aria-hidden="true" />
                    <span style={S.weekTime}>{timeLabel(ev)}</span>
                    <span style={S.weekTitle(Boolean(ev.done))}>{ev.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The month page. Cells are buttons: clicking one opens that day. */
function MonthView({ weeks, anchor, byDate, onPick }) {
  return (
    <div>
      <div style={S.weekdayRow} aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} style={S.weekdayCell}>
            {w}
          </span>
        ))}
      </div>

      <div className="jt-month-grid" style={S.monthGrid}>
        {weeks.flat().map((iso) => {
          const list = byDate.get(iso) || [];
          const shown = list.slice(0, 3);
          const inMonth = isSameMonth(iso, anchor);
          return (
            <button
              key={iso}
              type="button"
              className="jt-row jt-month-cell"
              style={S.cell(inMonth)}
              aria-label={`${formatDate(iso)}, ${list.length} ${list.length === 1 ? "event" : "events"}`}
              onClick={() => onPick(iso)}
            >
              <span style={S.cellNum(isToday(iso), inMonth)}>{parseISO(iso).getDate()}</span>
              {shown.map((ev) => (
                <span key={ev.id} className="jt-month-event" style={S.cellEvent(Boolean(ev.done), catOf(ev))}>
                  {ev.title}
                </span>
              ))}
              {list.length > shown.length && (
                <span className="jt-month-more" style={S.cellMore}>{`+${list.length - shown.length} more`}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- the app */

export default function CalendarHome() {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [view, setView] = useState("day");
  const [anchor, setAnchor] = useState(todayISO);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(todayISO()));
  const writeQueue = useRef(Promise.resolve());

  /* load once on mount ---------------------------------------------------- */
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
    return () => {
      cancelled = true;
    };
  }, []);

  /* every mutation goes through here -------------------------------------- */
  const persist = async (next) => {
    setEvents(next); // optimistic: the UI never waits on, or rolls back for, storage
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() => window.storage.set(STORAGE_KEY, JSON.stringify(next)));
    try { await writeQueue.current; setSaveError(false); }
    catch { setSaveError(true); }
  };

  /* form ------------------------------------------------------------------ */
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm(anchor));
  };

  const toggleForm = () => {
    if (showForm) return closeForm();
    setEditingId(null);
    setForm(emptyForm(anchor)); // new events land on the day you're looking at
    setShowForm(true);
  };

  const startEdit = (ev) => {
    setForm({
      title: ev.title || "",
      date: ev.date || anchor,
      start: ev.start || "",
      end: ev.end || "",
      category: catOf(ev).id,
      notes: ev.notes || "",
    });
    setEditingId(ev.id);
    setShowForm(true);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      /* non-browser host, or scrolling unsupported */
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    // a cleared date field would file the event nowhere, so it falls back to the
    // day being viewed; everything else is kept exactly as typed
    const values = {
      title,
      date: form.date || anchor,
      start: form.start,
      end: form.end,
      category: form.category,
      notes: form.notes,
    };

    if (editingId) {
      persist(events.map((ev) => (ev.id === editingId ? { ...ev, ...values } : ev)));
    } else {
      persist([...events, { id: newId(), ...values, done: false }]);
    }
    closeForm();
  };

  const remove = (ev) => {
    if (!window.confirm("Delete this event? This can't be undone.")) return;
    if (expandedId === ev.id) setExpandedId(null);
    if (editingId === ev.id) closeForm();
    persist(events.filter((e) => e.id !== ev.id));
  };

  const toggleDone = (ev) => {
    persist(events.map((e) => (e.id === ev.id ? { ...e, done: !e.done } : e)));
  };

  /* navigation ------------------------------------------------------------ */
  const step = (n) =>
    setAnchor(
      view === "day" ? addDays(anchor, n) : view === "week" ? addDays(anchor, 7 * n) : addMonths(anchor, n)
    );

  /** Week and month cells both hand the day view a date. */
  const openDay = (iso) => {
    setAnchor(iso);
    setView("day");
  };

  /* derived --------------------------------------------------------------- */
  const byDate = groupByDate(events);
  const days = weekDays(anchor);
  const grid = monthGrid(anchor);
  const anchorDate = parseISO(anchor);

  const dayEvents = byDate.get(anchor) || [];
  const period =
    view === "day"
      ? dayEvents
      : view === "week"
      ? events.filter((ev) => days.includes(ev.date || ""))
      : events.filter((ev) => isSameMonth(ev.date || "", anchor));

  const title =
    view === "day"
      ? `${weekdayName(anchor)} · ${formatDate(anchor)}`
      : view === "week"
      ? weekLabel(days[0], days[6])
      : anchorDate
      ? `${MONTHS_LONG[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`
      : "";

  const timeInvalid = Boolean(form.start && form.end && form.end <= form.start);
  const canSubmit = form.title.trim().length > 0 && !timeInvalid;
  const completedCount = period.filter((ev) => ev.done).length;
  const completion = period.length ? Math.round((completedCount / period.length) * 100) : 0;

  /* render ---------------------------------------------------------------- */
  return (
    <div style={S.column(view === "month")}>
      <p style={S.eyebrow}>Time log</p>
      <div className="jt-header" style={S.header}>
        <div>
          <h1 className="jt-section-title" style={S.title}>{title}</h1>
          <p style={{ margin: "7px 0 0", color: C.inkSoft, fontSize: 14 }}>
            {view === "day" ? "Make today intentional, one block at a time." : view === "week" ? "See the shape of your week." : "Plan ahead without losing the details."}
          </p>
        </div>
        <p style={S.count}>{summarize(period)}</p>
      </div>

      <div style={S.pills} role="group" aria-label="Calendar views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="jt-pill"
            style={S.pill(view === v.id)}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="jt-controls" style={S.controls}>
        <div style={S.nav} role="group" aria-label="Period">
          <button
            type="button"
            className="jt-ghost"
            style={S.arrow}
            aria-label={`Previous ${view}`}
            onClick={() => step(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          {/* the day pill is also called Today, so this one names itself for
              screen readers and tests */}
          <button
            type="button"
            className="jt-ghost"
            style={S.jump}
            aria-label="Jump to today"
            onClick={() => setAnchor(todayISO())}
          >
            Today
          </button>
          <button
            type="button"
            className="jt-ghost"
            style={S.arrow}
            aria-label={`Next ${view}`}
            onClick={() => step(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <button
          type="button"
          className={showForm ? "jt-ghost" : "jt-primary"}
          style={showForm ? S.ghost : S.primary}
          onClick={toggleForm}
        >
          {showForm ? "Cancel" : "+ Add event"}
        </button>
      </div>

      {period.length > 0 && (
        <div style={S.overview} aria-label={`${completion}% complete`}>
          <div>
            <div style={S.overviewTitle}>{completion === 100 ? "Everything complete" : `${period.length - completedCount} remaining`}</div>
            <div style={S.progressTrack} aria-hidden="true"><div style={S.progressFill(completion)} /></div>
          </div>
          <span style={S.overviewMeta}>{completion}% complete</span>
        </div>
      )}

      {saveError && (
        <div style={S.errorBar} role="alert">
          Couldn't save your last change. It's still on screen, but it may not survive a refresh.
        </div>
      )}

      {showForm && (
        <form style={S.form} onSubmit={submit}>
          <h2 style={S.formTitle}>{editingId ? "Edit event" : "New event"}</h2>

          <div style={S.fieldRow}>
            <label style={S.field}>
              <span style={S.label}>Title *</span>
              <input
                className="jt-input"
                style={S.input}
                value={form.title}
                onChange={setField("title")}
                placeholder="Standup"
                autoFocus
              />
            </label>
            <label style={{ ...S.field, ...S.narrow }}>
              <span style={S.label}>Date</span>
              <input
                type="date"
                className="jt-input"
                style={{ ...S.input, fontFamily: MONO }}
                value={form.date}
                onChange={setField("date")}
              />
            </label>
          </div>

          <div style={S.fieldRow}>
            <label style={{ ...S.field, ...S.narrow }}>
              <span style={S.label}>Start</span>
              <input
                type="time"
                className="jt-input"
                style={{ ...S.input, fontFamily: MONO }}
                value={form.start}
                onChange={setField("start")}
              />
            </label>
            <label style={{ ...S.field, ...S.narrow }}>
              <span style={S.label}>End</span>
              <input
                type="time"
                className="jt-input"
                style={{ ...S.input, fontFamily: MONO }}
                value={form.end}
                onChange={setField("end")}
                aria-invalid={timeInvalid || undefined}
                aria-describedby={timeInvalid ? "event-time-error" : undefined}
              />
            </label>
            <label style={{ ...S.field, ...S.narrow }}>
              <span style={S.label}>Category</span>
              <select
                className="jt-input"
                style={S.input}
                value={form.category}
                onChange={setField("category")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ ...S.field, flex: "1 1 100%" }}>
            <span style={S.label}>Notes</span>
            <textarea
              className="jt-input"
              style={S.textarea}
              rows={4}
              value={form.notes}
              onChange={setField("notes")}
              placeholder="Ran long. Follow up on the staging deploy."
            />
          </label>

          <div style={S.formActions}>
            <button type="submit" className="jt-primary" style={S.primary} disabled={!canSubmit}>
              {editingId ? "Save changes" : "Add event"}
            </button>
            <button type="button" className="jt-ghost" style={S.ghost} onClick={closeForm}>Discard</button>
            {!form.title.trim() && <span style={S.hint}>Title is required.</span>}
            {timeInvalid && <span id="event-time-error" style={{ ...S.hint, color: C.danger }}>End time must be after start time.</span>}
          </div>
        </form>
      )}

      {!loaded ? (
        <p style={S.loading}>Loading…</p>
      ) : view === "day" ? (
        dayEvents.length === 0 ? (
          <p style={S.empty}>
            {isToday(anchor)
              ? "Nothing scheduled today. Add an event to get started."
              : "Nothing scheduled this day."}
          </p>
        ) : (
          <ol style={S.list}>
            {dayEvents.map((ev) => (
              <EventRow
                key={ev.id}
                ev={ev}
                expanded={expandedId === ev.id}
                onToggleDone={() => toggleDone(ev)}
                onToggleNotes={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                onEdit={() => startEdit(ev)}
                onDelete={() => remove(ev)}
              />
            ))}
          </ol>
        )
      ) : view === "week" ? (
        <WeekView days={days} byDate={byDate} onPick={openDay} />
      ) : (
        <MonthView weeks={grid} anchor={anchor} byDate={byDate} onPick={openDay} />
      )}
    </div>
  );
}
