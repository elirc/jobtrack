import { commitJobBackup, exportJobBackup, MAX_BACKUP_BYTES } from './jobBackup.js';
import React, { useEffect, useRef, useState } from "react";
import { formatDate, relativeLabel, todayISO } from "./dates.js";
import { C, BODY, DISPLAY, MONO } from "./theme.js";

/**
 * Job Application Tracker — the Job Tracker section.
 *
 * State and persistence live here; the page itself (background, typography,
 * the injected stylesheet) belongs to the App shell, so this renders only its
 * own centered column. The one external contract is `window.storage`, an async
 * key-value API:
 *
 *   await window.storage.get(key)  -> { value: string }   (throws if absent)
 *   await window.storage.set(key, value)
 *
 * See src/storage.js for the localStorage-backed shim used in the browser.
 */

const STORAGE_KEY = "jobtracker:data";

const STATUSES = [
  { id: "applied", label: "Applied", color: "#316A9E", bg: "#E7F0F8" },
  { id: "screening", label: "Screening", color: "#8A5B16", bg: "#F8EED8" },
  { id: "interview", label: "Interview", color: "#6D45A3", bg: "#EFE8F8" },
  { id: "offer", label: "Offer", color: "#176B52", bg: "#E2F0EA" },
  { id: "closed", label: "Closed", color: "#6C7370", bg: "#ECEEED" },
];
const STATUS_BY_ID = new Map(STATUSES.map((status) => [status.id, status]));
const statusOf = (app) => STATUS_BY_ID.get(app.status) || STATUSES[0];

/* ----------------------------------------------------------------- helpers */

/** Stack is stored as free text; commas only become tokens at render time. */
function stackTokens(stack) {
  return (stack || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

const hasNotes = (app) => Boolean(app.notes && app.notes.trim());

const gutter = (i) => String(i + 1).padStart(2, "0");

const emptyForm = () => ({ company: "", role: "", location: "", url: "", status: "applied", stack: "", date: todayISO(), notes: "" });

function safeUrl(value) {
  const input = (value || "").trim();
  if (!input) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ styles */

const S = {
  column: { maxWidth: 920, margin: "0 auto" },

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
  title: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 38, letterSpacing: "-.035em", margin: 0, lineHeight: 1.1 },
  count: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, color: C.inkSoft, whiteSpace: "nowrap" },
  countNum: { color: C.cobalt },

  tabs: {
    display: "flex",
    gap: 24,
    borderBottom: `1px solid ${C.line}`,
    marginTop: 26,
  },
  tab: (active) => ({
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? C.cobalt : "transparent"}`,
    padding: "0 0 10px",
    marginBottom: -1,
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    color: active ? C.ink : C.inkSoft,
  }),
  badge: {
    fontFamily: MONO,
    fontSize: 11,
    marginLeft: 7,
    padding: "1px 6px",
    borderRadius: 999,
    background: C.cobaltSoft,
    color: C.cobalt,
  },
  stats: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 22 },
  stat: { background: "rgba(255,255,255,.72)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 15px" },
  statValue: { display: "block", fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, lineHeight: 1.2 },
  statLabel: { color: C.inkSoft, fontSize: 12.5 },

  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "22px 0 18px",
  },
  toolbar: { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 12, margin: "18px 0" },
  searchWrap: { position: "relative" },
  search: { width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 38px 10px 13px", fontSize: 14 },
  clearSearch: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: C.inkSoft, width: 28, height: 28, borderRadius: 6, fontSize: 18 },
  filter: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 32px 9px 11px", color: C.inkSoft, fontSize: 13.5 },
  sorts: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sortLabel: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: C.inkSoft,
    marginRight: 2,
  },
  pill: (active) => ({
    background: active ? C.cobaltSoft : C.card,
    border: `1px solid ${active ? C.cobalt : C.line}`,
    color: active ? C.cobalt : C.inkSoft,
    borderRadius: 999,
    padding: "5px 13px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
  }),

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
    minHeight: 132,
    overflow: "hidden",
  },
  formActions: { display: "flex", gap: 10, alignItems: "center", marginTop: 4 },
  hint: { color: C.inkSoft, fontSize: 12.5 },

  list: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 },
  row: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    padding: "16px 18px",
  },
  rowBody: { position: "relative", paddingLeft: 42 },
  gutterNum: {
    position: "absolute",
    left: 0,
    top: 2,
    fontFamily: MONO,
    fontSize: 12.5,
    color: "#9AA4B2",
    userSelect: "none",
  },
  rowHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  company: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 17.5, margin: 0, letterSpacing: "-.01em" },
  role: { color: C.inkSoft, fontSize: 14, marginTop: 2 },
  meta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 9 },
  status: (status) => ({ fontFamily: MONO, fontSize: 11, fontWeight: 500, background: status.bg, color: status.color, borderRadius: 999, padding: "3px 8px" }),
  location: { color: C.inkSoft, fontSize: 12.5 },
  external: { color: C.cobalt, fontSize: 12.5, textDecoration: "none", fontWeight: 600 },
  date: { fontFamily: MONO, fontSize: 12.5, color: C.inkSoft, whiteSpace: "nowrap" },
  dateRel: { color: "#9AA4B2" },
  tokens: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  token: {
    fontFamily: MONO,
    fontSize: 12,
    background: C.cobaltSoft,
    color: C.cobalt,
    borderRadius: 5,
    padding: "2px 8px",
  },
  rowFoot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 12,
  },
  actions: { display: "flex", gap: 8, marginLeft: "auto" },
  note: {
    whiteSpace: "pre-wrap",
    marginTop: 12,
    paddingLeft: 14,
    borderLeft: `3px solid ${C.cobaltSoft}`,
    color: "#2E3846",
    fontSize: 14.5,
    lineHeight: 1.7,
  },

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

function StackTokens({ stack }) {
  const tokens = stackTokens(stack);
  if (tokens.length === 0) return null;
  return (
    <ul style={{ ...S.tokens, listStyle: "none", padding: 0 }}>
      {tokens.map((t, i) => (
        <li key={`${t}-${i}`} style={S.token}>
          {t}
        </li>
      ))}
    </ul>
  );
}

function DateStamp({ date }) {
  const rel = relativeLabel(date);
  return (
    <span style={S.date}>
      {formatDate(date)}
      {rel && <span style={S.dateRel}> · {rel}</span>}
    </span>
  );
}

/** Textarea that grows with its content, starting at 6 rows. */
function AutoTextarea({ value, onChange, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // jsdom reports 0 for scrollHeight; leave the CSS min-height in charge there.
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={6} value={value} onChange={onChange} {...rest} />;
}

function ApplicationRow({ app, index, expanded, onToggleNotes, onEdit, onDelete }) {
  const notes = hasNotes(app);
  const status = statusOf(app);
  const url = safeUrl(app.url);
  return (
    <li>
      <article className="jt-row" style={S.row} aria-label={app.company}>
        <div className="jt-rowbody" style={S.rowBody}>
          <span className="jt-gutter" style={S.gutterNum} aria-hidden="true">
            {gutter(index)}
          </span>

          <div style={S.rowHead}>
            <div>
              <h3 style={S.company}>{app.company}</h3>
              {app.role && <div style={S.role}>{app.role}</div>}
            </div>
            <DateStamp date={app.date} />
          </div>

          <div style={S.meta}>
            <span style={S.status(status)}>{status.label}</span>
            {app.location && <span style={S.location}>{app.location}</span>}
            {url && <a style={S.external} href={url} target="_blank" rel="noreferrer">View posting ↗</a>}
          </div>

          <StackTokens stack={app.stack} />

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

          {notes && expanded && <div style={S.note}>{app.notes}</div>}
        </div>
      </article>
    </li>
  );
}

function NoteCard({ app, onEdit }) {
  const status = statusOf(app);
  return (
    <li>
      <article className="jt-row" style={S.row} aria-label={app.company}>
        <div style={S.rowHead}>
          <div><h3 style={S.company}>{app.company}</h3>{app.role && <div style={S.role}>{app.role}</div>}</div>
          <DateStamp date={app.date} />
        </div>
        <div style={S.meta}><span style={S.status(status)}>{status.label}</span></div>
        <StackTokens stack={app.stack} />
        <div style={S.note}>{app.notes}</div>
        <div style={S.rowFoot}>
          <div style={S.actions}>
            <button type="button" className="jt-ghost" style={S.smallGhost} onClick={onEdit}>
              Edit
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}

/* ------------------------------------------------------------- the app */

export default function JobTracker() {
  const [apps, setApps] = useState([]);
  const [importing, setImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [tab, setTab] = useState("apps");
  const [sortBy, setSortBy] = useState("date");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const writeQueue = useRef(Promise.resolve());

  /* load once on mount ---------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          if (!cancelled && Array.isArray(parsed)) setApps(parsed);
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
    setApps(next); // optimistic: the UI never waits on, or rolls back for, storage
    // Serialize host writes so two quick edits can never finish out of order.
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() => window.storage.set(STORAGE_KEY, JSON.stringify(next)));
    try { await writeQueue.current; setSaveError(false); }
    catch { setSaveError(true); }
  };

  const exportApplications = () => {
    try {
      const text = exportJobBackup(apps);
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'daybook-applications.json';
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage('Application backup exported. Calendar events are separate.');
    } catch (error) { setBackupMessage(error.message); }
  };

  const importApplications = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a JSON backup no larger than 2 MB.');
      const text = await file.text();
      // Join the existing write queue so an older edit cannot overwrite import.
      const operation = writeQueue.current.catch(() => {}).then(() => commitJobBackup(window.storage, text));
      writeQueue.current = operation;
      const next = await operation;
      setApps(next);
      closeForm(); setExpandedId(null); setSaveError(false);
      setBackupMessage(`Imported ${next.length} applications. Calendar events were not changed.`);
    } catch (error) {
      setBackupMessage(`Import failed: ${error.message} Existing applications are unchanged.`);
    } finally { setImporting(false); }
  };

  /* form ------------------------------------------------------------------ */
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const toggleForm = () => (showForm ? closeForm() : setShowForm(true));

  const startEdit = (app) => {
    setForm({
      company: app.company || "",
      role: app.role || "",
      location: app.location || "",
      url: app.url || "",
      status: statusOf(app).id,
      stack: app.stack || "",
      date: app.date || "",
      notes: app.notes || "",
    });
    setEditingId(app.id);
    setShowForm(true);
    setTab("apps");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      /* non-browser host, or scrolling unsupported */
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const company = form.company.trim();
    if (!company) return;

    // stack and notes keep whatever the user typed; only company is normalized
    const values = {
      company,
      role: form.role.trim(),
      location: form.location.trim(),
      url: safeUrl(form.url),
      status: form.status,
      stack: form.stack,
      date: form.date,
      notes: form.notes,
    };

    if (editingId) {
      persist(apps.map((a) => (a.id === editingId ? { ...a, ...values } : a)));
    } else {
      persist([...apps, { id: Date.now().toString(36), ...values }]);
    }
    closeForm();
  };

  const remove = (app) => {
    if (!window.confirm("Delete this application? This can't be undone.")) return;
    if (expandedId === app.id) setExpandedId(null);
    if (editingId === app.id) closeForm();
    persist(apps.filter((a) => a.id !== app.id));
  };

  /* derived --------------------------------------------------------------- */
  const sorted = [...apps].sort(
    sortBy === "date"
      ? // ISO dates sort lexicographically; undated records fall to the bottom
        (a, b) => (b.date || "").localeCompare(a.date || "")
      : (a, b) => (a.company || "").localeCompare(b.company || "", undefined, { sensitivity: "base" })
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = sorted.filter((app) => {
    const matchesStatus = statusFilter === "all" || statusOf(app).id === statusFilter;
    const haystack = [app.company, app.role, app.location, app.stack, app.notes].join(" ").toLocaleLowerCase();
    return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
  const noted = filtered.filter(hasNotes);
  const activeCount = apps.filter((app) => !["closed"].includes(statusOf(app).id)).length;
  const interviewCount = apps.filter((app) => statusOf(app).id === "interview").length;
  const offerCount = apps.filter((app) => statusOf(app).id === "offer").length;

  const canSubmit = form.company.trim().length > 0;

  /* render ---------------------------------------------------------------- */
  return (
    <fieldset disabled={importing} style={{ ...S.column, border: 0, padding: 0, minWidth: 0 }}>
      <div aria-label="Application backups" style={{ ...S.row, marginBottom: 20 }}>
        <button type="button" className="jt-ghost" style={{ ...S.ghost, marginRight: 12 }} disabled={!loaded} onClick={exportApplications}>Export applications</button>{' '}
        <label>Import applications (replaces current list)
          <input type="file" accept=".json,application/json" disabled={!loaded} onChange={importApplications} />
        </label>
        <p role="status" style={{ ...S.hint, marginBottom: 0 }}>{importing ? 'Validating and saving backup…' : backupMessage}</p>
      </div>
      <p style={S.eyebrow}>Application log</p>
      <div className="jt-header" style={S.header}>
        <div>
          <h1 className="jt-section-title" style={S.title}>Job Applications</h1>
          <p style={{ margin: "7px 0 0", color: C.inkSoft, fontSize: 14 }}>Keep every opportunity and next step in one place.</p>
        </div>
        <p style={S.count}>
          <span style={S.countNum}>{apps.length}</span> sent
        </p>
      </div>

      <div className="jt-stats" style={S.stats} aria-label="Pipeline summary">
        <div style={S.stat}><span style={S.statValue}>{activeCount} active</span><span style={S.statLabel}>In your pipeline</span></div>
        <div style={S.stat}><span style={{ ...S.statValue, color: "#8A5B16" }}>{apps.filter((app) => statusOf(app).id === "screening").length} screening</span><span style={S.statLabel}>Early conversations</span></div>
        <div style={S.stat}><span style={{ ...S.statValue, color: "#6D45A3" }}>{interviewCount} interviewing</span><span style={S.statLabel}>In process</span></div>
        <div style={S.stat}><span style={{ ...S.statValue, color: C.cobalt }}>{offerCount} offers</span><span style={S.statLabel}>Ready to decide</span></div>
      </div>

      <div style={S.tabs} role="tablist" aria-label="Views">
        <button
          type="button"
          role="tab"
          className="jt-tab"
          aria-selected={tab === "apps"}
          style={S.tab(tab === "apps")}
          onClick={() => setTab("apps")}
        >
          Applications
        </button>
        <button
          type="button"
          role="tab"
          className="jt-tab"
          aria-selected={tab === "notes"}
          style={S.tab(tab === "notes")}
          onClick={() => setTab("notes")}
        >
          Interview Notes
          {noted.length > 0 && <span style={S.badge}>{noted.length}</span>}
        </button>
      </div>

      <div className="jt-controls" style={S.controls}>
        <div className="jt-sorts" style={S.sorts}>
          <span style={S.sortLabel}>Sort</span>
          <button
            type="button"
            className="jt-pill"
            style={S.pill(sortBy === "date")}
            aria-pressed={sortBy === "date"}
            onClick={() => setSortBy("date")}
          >
            Newest
          </button>
          <button
            type="button"
            className="jt-pill"
            style={S.pill(sortBy === "alpha")}
            aria-pressed={sortBy === "alpha"}
            onClick={() => setSortBy("alpha")}
          >
            A–Z
          </button>
        </div>
        <button
          type="button"
          className={showForm ? "jt-ghost" : "jt-primary"}
          style={showForm ? S.ghost : S.primary}
          onClick={toggleForm}
        >
          {showForm ? "Cancel" : "+ Add application"}
        </button>
      </div>

      <div className="jt-toolbar" style={S.toolbar}>
        <div style={S.searchWrap}>
          <input
            type="search"
            className="jt-input jt-search"
            style={S.search}
            aria-label="Search applications"
            placeholder="Search company, role, stack, or notes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <button type="button" style={S.clearSearch} aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
        </div>
        <select className="jt-input" style={S.filter} aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </select>
      </div>

      {saveError && (
        <div style={S.errorBar} role="alert">
          Couldn't save your last change. It's still on screen, but it may not survive a refresh.
        </div>
      )}

      {showForm && (
        <form style={S.form} onSubmit={submit}>
          <h2 style={S.formTitle}>{editingId ? "Edit application" : "New application"}</h2>

          <div style={S.fieldRow}>
            <label style={S.field}>
              <span style={S.label}>Company *</span>
              <input
                className="jt-input"
                style={S.input}
                value={form.company}
                onChange={setField("company")}
                placeholder="Vercel"
                autoFocus
              />
            </label>
            <label style={{ ...S.field, flex: "0 1 200px" }}>
              <span style={S.label}>Date applied</span>
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
            <label style={S.field}>
              <span style={S.label}>Role</span>
              <input className="jt-input" style={S.input} value={form.role} onChange={setField("role")} placeholder="Senior product engineer" />
            </label>
            <label style={S.field}>
              <span style={S.label}>Location</span>
              <input className="jt-input" style={S.input} value={form.location} onChange={setField("location")} placeholder="Remote · Seattle" />
            </label>
          </div>

          <div style={S.fieldRow}>
            <label style={S.field}>
              <span style={S.label}>Status</span>
              <select className="jt-input" style={S.input} value={form.status} onChange={setField("status")}>
                {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </label>
            <label style={S.field}>
              <span style={S.label}>Job posting</span>
              <input type="text" inputMode="url" className="jt-input" style={S.input} value={form.url} onChange={setField("url")} placeholder="https://company.com/jobs/…" />
            </label>
          </div>

          <label style={{ ...S.field, flex: "1 1 100%" }}>
            <span style={S.label}>Tech stack</span>
            <input
              className="jt-input"
              style={S.input}
              value={form.stack}
              onChange={setField("stack")}
              placeholder="TypeScript, Go, Postgres"
            />
          </label>

          <label style={{ ...S.field, flex: "1 1 100%" }}>
            <span style={S.label}>Notes</span>
            <AutoTextarea
              className="jt-input"
              style={S.textarea}
              value={form.notes}
              onChange={setField("notes")}
              placeholder="Recruiter screen went long on distributed tracing. Prep: consistent hashing, the outbox pattern."
            />
          </label>

          <div style={S.formActions}>
            <button type="submit" className="jt-primary" style={S.primary} disabled={!canSubmit}>
              {editingId ? "Save changes" : "Add application"}
            </button>
            <button type="button" className="jt-ghost" style={S.ghost} onClick={closeForm}>Discard</button>
            {!canSubmit && <span style={S.hint}>Company is required.</span>}
          </div>
        </form>
      )}

      {!loaded ? (
        <p style={S.loading}>Loading…</p>
      ) : tab === "apps" ? (
        <div role="tabpanel" aria-label="Applications">
          {filtered.length === 0 ? (
            <p style={S.empty}>{apps.length === 0 ? "No applications yet. Add your first one to get started." : "No applications match your search and filters."}</p>
          ) : (
            <ol style={S.list}>
              {filtered.map((app, i) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  index={i}
                  expanded={expandedId === app.id}
                  onToggleNotes={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onEdit={() => startEdit(app)}
                  onDelete={() => remove(app)}
                />
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Interview Notes">
          {noted.length === 0 ? (
            <p style={S.empty}>
              No interview notes yet. Add notes to any application and they'll collect here.
            </p>
          ) : (
            <ol style={S.list}>
              {noted.map((app) => (
                <NoteCard key={app.id} app={app} onEdit={() => startEdit(app)} />
              ))}
            </ol>
          )}
        </div>
      )}
    </fieldset>
  );
}
