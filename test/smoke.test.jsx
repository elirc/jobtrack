import { expect, it } from "vitest";
import { waitFor } from "@testing-library/react";

// This file exercises the real entry point — shim install, createRoot, mount —
// rather than rendering the component directly. No RTL render(), so opt out of
// its act environment (which also rules out fireEvent: clicks go through the
// DOM directly).
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

/** The nav button whose label matches, once the shell has painted. */
const navButton = (label) =>
  [...document.querySelectorAll("nav button")].find((b) => b.textContent.trim() === label);

it("main.jsx boots the shell and switches to the job tracker", async () => {
  document.body.innerHTML = '<div id="root"></div>';
  window.localStorage.setItem(
    "jobtracker:data",
    JSON.stringify([{ id: "x1", company: "Ramp", stack: "Go, Postgres", date: "2026-02-02", notes: "" }])
  );

  await import("../src/main.jsx");

  // home section: shell chrome plus the calendar
  await waitFor(() => expect(navButton("Job Tracker")).toBeTruthy());
  expect(typeof window.storage.get).toBe("function");
  expect(document.body.textContent).toContain("Daybook");
  expect(document.body.textContent).toContain("+ Add event");
  expect(document.body.textContent).not.toContain("Job Applications");

  navButton("Job Tracker").click();

  await waitFor(() => expect(document.body.textContent).toContain("Ramp"));
  expect(document.body.textContent).toContain("Job Applications");
  expect(document.body.textContent).toContain("Postgres");
});
