/** Shared design tokens and app-wide interaction/responsive rules. */

export const C = {
  ink: "#17201D",
  inkSoft: "#66706C",
  inkMuted: "#929A96",
  paper: "#F4F3EE",
  card: "#FFFFFF",
  cardTint: "#FAF9F5",
  line: "#E3E1D9",
  lineStrong: "#D2D0C7",
  cobalt: "#176B52",
  cobaltDark: "#0F543F",
  cobaltSoft: "#E2F0EA",
  accent: "#E66A3C",
  accentSoft: "#FCE9E1",
  danger: "#B33A3A",
};

export const DISPLAY = '"DM Sans", "Segoe UI", system-ui, sans-serif';
export const BODY = '"DM Sans", "Segoe UI", system-ui, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root { color-scheme: light; }
html { background: ${C.paper}; scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; }
button, input, textarea, select { font: inherit; }

.jt-root, .jt-root *, .jt-root *::before, .jt-root *::after { box-sizing: border-box; }
.jt-root button { font: inherit; color: inherit; cursor: pointer; }
.jt-root input, .jt-root textarea, .jt-root select { font: inherit; color: inherit; }
.jt-root :focus-visible { outline: 3px solid rgba(23,107,82,.28); outline-offset: 2px; }

.jt-skip {
  position: fixed; left: 16px; top: 10px; z-index: 100;
  transform: translateY(-160%); background: ${C.ink}; color: #fff;
  padding: 9px 14px; border-radius: 8px; text-decoration: none;
}
.jt-skip:focus { transform: translateY(0); }

.jt-row { transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
.jt-row:hover { border-color: ${C.lineStrong} !important; box-shadow: 0 10px 28px rgba(35,45,40,.07); transform: translateY(-1px); }

.jt-ghost, .jt-primary, .jt-tab, .jt-pill, .jt-link {
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}
.jt-ghost:hover { color: ${C.cobalt}; border-color: #9EBCAF !important; background: ${C.cobaltSoft} !important; }
.jt-primary:hover:not(:disabled) { background: ${C.cobaltDark} !important; box-shadow: 0 6px 16px rgba(23,107,82,.2); transform: translateY(-1px); }
.jt-primary:active:not(:disabled), .jt-ghost:active { transform: translateY(0); }
.jt-primary:disabled { opacity: .45; cursor: not-allowed; }
.jt-tab:hover { color: ${C.ink} !important; background: rgba(23,107,82,.05) !important; }
.jt-pill:hover { border-color: #9EBCAF !important; color: ${C.cobalt} !important; }
.jt-link:hover { color: ${C.cobaltDark} !important; text-decoration: underline; }
.jt-input { transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease; }
.jt-input:hover { border-color: ${C.lineStrong} !important; }
.jt-input:focus { border-color: ${C.cobalt} !important; box-shadow: 0 0 0 3px rgba(23,107,82,.12); outline: none; background: #fff !important; }
.jt-input::placeholder { color: #A1A8A4; }
.jt-danger:hover { color: ${C.danger} !important; border-color: #DCA9A9 !important; background: #FBEAEA !important; }
.jt-search::-webkit-search-cancel-button { cursor: pointer; }

@media (max-width: 680px) {
  .jt-shellbar { position: static !important; }
  .jt-bar-inner { padding: 13px 16px !important; align-items: center !important; }
  .jt-brand-copy { display: none !important; }
  .jt-main { padding: 28px 16px 72px !important; }
  .jt-header { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
  .jt-controls { flex-direction: column; align-items: stretch !important; }
  .jt-controls > * { width: 100%; }
  .jt-sorts { justify-content: flex-start; }
  .jt-rowbody { padding-left: 0 !important; }
  .jt-gutter { display: none !important; }
  .jt-toolbar { grid-template-columns: 1fr !important; }
  .jt-stats { grid-template-columns: repeat(2, 1fr) !important; }
  .jt-month-grid { gap: 3px !important; }
  .jt-month-cell { min-height: 72px !important; padding: 5px !important; }
  .jt-month-event { font-size: 0 !important; width: 7px; height: 7px; border-radius: 999px !important; padding: 0 !important; display: inline-block !important; margin-right: 3px; }
  .jt-month-more { display: none !important; }
}

@media (max-width: 420px) {
  .jt-brand-name { font-size: 16px !important; }
  .jt-nav { gap: 2px !important; padding: 3px !important; }
  .jt-nav-label { font-size: 12px; }
  .jt-section-title { font-size: 29px !important; }
  .jt-stats { grid-template-columns: 1fr !important; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .jt-root *, .jt-root *::before, .jt-root *::after { transition: none !important; animation: none !important; }
}
`;
