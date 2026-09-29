import React, { useState } from "react";
import CalendarHome from "./calendar/CalendarHome.jsx";
import JobTracker from "./JobTracker.jsx";
import { C, BODY, CSS, DISPLAY } from "./theme.js";

const SECTIONS = [
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "jobs", label: "Job Tracker", icon: "briefcase" },
];

function Icon({ name }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "briefcase") return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>;
  return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>;
}

const S = {
  root: { fontFamily: BODY, color: C.ink, background: `radial-gradient(circle at 8% 0%, #E7F0EA 0, transparent 28%), ${C.paper}`, minHeight: "100vh", fontSize: 15, lineHeight: 1.55, WebkitFontSmoothing: "antialiased" },
  bar: { background: "rgba(255,255,255,.88)", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(14px)", boxShadow: "0 1px 0 rgba(32,40,36,.02)" },
  barInner: { maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 },
  brand: { display: "flex", alignItems: "center", gap: 11 },
  mark: { width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", color: "#fff", background: C.cobalt, boxShadow: "0 5px 12px rgba(23,107,82,.2)" },
  brandName: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-.025em", margin: 0, lineHeight: 1.1 },
  brandCopy: { margin: "3px 0 0", color: C.inkSoft, fontSize: 11.5, lineHeight: 1.1 },
  nav: { display: "flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 12, background: C.paper, border: `1px solid ${C.line}` },
  navTab: (active) => ({ display: "flex", alignItems: "center", gap: 7, background: active ? C.card : "transparent", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? C.ink : C.inkSoft, boxShadow: active ? "0 1px 4px rgba(28,36,32,.09)" : "none" }),
  main: { padding: "46px 24px 100px" },
};

export default function App() {
  const [section, setSection] = useState("calendar");

  return (
    <div className="jt-root" style={S.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="jt-skip" href="#main-content">Skip to content</a>
      <header className="jt-shellbar" style={S.bar}>
        <div className="jt-bar-inner" style={S.barInner}>
          <div style={S.brand} aria-label="Daybook">
            <span style={S.mark}><Icon name="calendar" /></span>
            <div>
              <p className="jt-brand-name" style={S.brandName}>Daybook</p>
              <p className="jt-brand-copy" style={S.brandCopy}>Plan the work. Track the progress.</p>
            </div>
          </div>
          <nav className="jt-nav" style={S.nav} aria-label="Sections">
            {SECTIONS.map((item) => (
              <button key={item.id} type="button" className="jt-tab" style={S.navTab(section === item.id)} aria-pressed={section === item.id} onClick={() => setSection(item.id)}>
                <Icon name={item.icon} /><span className="jt-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="jt-main" style={S.main} tabIndex="-1">
        {section === "calendar" ? <CalendarHome /> : <JobTracker />}
      </main>
    </div>
  );
}
