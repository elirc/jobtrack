import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JobTracker from "../src/JobTracker.jsx";

const STORAGE_KEY = "jobtracker:data";

/* ------------------------------------------------------------------ fixtures */

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const SEED = [
  { id: "a1", company: "Vercel", stack: "TypeScript, Go", date: "2026-03-04", notes: "" },
  {
    id: "a2",
    company: "anthropic",
    stack: "Python, Rust, Postgres",
    date: "2026-05-19",
    notes: "Screen went long on evals.\n\nPrep: sampling, batching.",
  },
  { id: "a3", company: "Stripe", stack: "", date: "2026-01-12", notes: "   " },
];

/** Installs a fake `window.storage`, optionally pre-seeded. */
function fakeStorage({ seed, failWrites = false } = {}) {
  const map = new Map();
  if (seed !== undefined) map.set(STORAGE_KEY, typeof seed === "string" ? seed : JSON.stringify(seed));

  const api = {
    get: vi.fn(async (key) => {
      if (!map.has(key)) throw new Error(`no value for "${key}"`);
      return { key, value: map.get(key) };
    }),
    set: vi.fn(async (key, value) => {
      if (failWrites) throw new Error("write failed");
      map.set(key, value);
      return { key, value };
    }),
    _map: map,
  };
  window.storage = api;
  return api;
}

/** Last payload handed to storage.set, parsed. */
const lastWrite = (storage) => JSON.parse(storage.set.mock.calls.at(-1)[1]);

/** Company names in the order they're rendered. */
const rowOrder = () => screen.getAllByRole("article").map((el) => el.getAttribute("aria-label"));

async function mount(opts) {
  const storage = fakeStorage(opts);
  const user = userEvent.setup();
  render(<JobTracker />);
  // wait out the initial async read
  await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
  return { storage, user };
}

const openForm = (user) => user.click(screen.getByRole("button", { name: "+ Add application" }));

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.storage;
});

/* --------------------------------------------------------------------- load */

describe("loading", () => {
  it("renders stored applications, newest first", async () => {
    await mount({ seed: SEED });

    expect(rowOrder()).toEqual(["anthropic", "Vercel", "Stripe"]);
    expect(screen.getByText("3")).toBeInTheDocument(); // header count
  });

  it("treats a missing key as an empty list (first run)", async () => {
    const { storage } = await mount();

    expect(storage.get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(
      screen.getByText("No applications yet. Add your first one to get started.")
    ).toBeInTheDocument();
  });

  it("falls back to empty on corrupt JSON without overwriting what's stored", async () => {
    const { storage } = await mount({ seed: "{not json" });

    expect(
      screen.getByText("No applications yet. Add your first one to get started.")
    ).toBeInTheDocument();
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage._map.get(STORAGE_KEY)).toBe("{not json");
  });

  it("shows a loading state until the read resolves", async () => {
    let release;
    window.storage = {
      get: vi.fn(() => new Promise((resolve) => {
        release = () => resolve({ value: JSON.stringify(SEED) });
      })),
      set: vi.fn(async () => {}),
    };
    render(<JobTracker />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Vercel")).not.toBeInTheDocument();

    release();
    expect(await screen.findByText("Vercel")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- create */

describe("creating", () => {
  it("blocks submit until company has non-whitespace text", async () => {
    const { user } = await mount();
    await openForm(user);

    const submit = screen.getByRole("button", { name: "Add application" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/company/i), "   ");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/company/i), "Figma");
    expect(submit).toBeEnabled();
  });

  it("appends a record, persists it, and resets the form", async () => {
    const { storage, user } = await mount();
    await openForm(user);

    await user.type(screen.getByLabelText(/company/i), "Figma");
    await user.type(screen.getByLabelText(/tech stack/i), "TypeScript, WebGL");
    await user.clear(screen.getByLabelText(/date applied/i));
    await user.type(screen.getByLabelText(/date applied/i), "2026-06-02");
    await user.type(screen.getByLabelText("Notes"), "Take-home: shader debugging.");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    const written = lastWrite(storage);
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      company: "Figma",
      stack: "TypeScript, WebGL",
      date: "2026-06-02",
      notes: "Take-home: shader debugging.",
    });
    expect(written[0].id).toEqual(expect.any(String));

    // form closed and cleared
    expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument();
    await openForm(user);
    expect(screen.getByLabelText(/company/i)).toHaveValue("");
  });

  it("defaults the date to today and trims the company name", async () => {
    const { storage, user } = await mount();
    await openForm(user);

    expect(screen.getByLabelText(/date applied/i)).toHaveValue(isoDaysAgo(0));

    await user.type(screen.getByLabelText(/company/i), "  Linear  ");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(lastWrite(storage)[0].company).toBe("Linear");
    expect(screen.getByText(/today/)).toBeInTheDocument();
  });

  it("toggles the form open and closed from one button", async () => {
    const { user } = await mount();
    await openForm(user);
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add application" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- update */

describe("editing", () => {
  it("pre-fills the form and replaces the record in place, keeping its id", async () => {
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Vercel" });
    await user.click(within(row).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText(/company/i)).toHaveValue("Vercel");
    expect(screen.getByLabelText(/tech stack/i)).toHaveValue("TypeScript, Go");
    expect(screen.getByLabelText(/date applied/i)).toHaveValue("2026-03-04");

    await user.clear(screen.getByLabelText(/company/i));
    await user.type(screen.getByLabelText(/company/i), "Vercel Inc");
    await user.type(screen.getByLabelText("Notes"), "Follow up Friday.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const written = lastWrite(storage);
    expect(written).toHaveLength(3);
    const edited = written.find((a) => a.id === "a1");
    expect(edited).toMatchObject({ company: "Vercel Inc", notes: "Follow up Friday." });
    expect(screen.getByText("Vercel Inc")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- delete */

describe("deleting", () => {
  it("removes the record after confirmation", async () => {
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Stripe" });
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete this application? This can't be undone.");
    expect(lastWrite(storage).map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(screen.queryByText("Stripe")).not.toBeInTheDocument();
  });

  it("keeps the record when the confirmation is dismissed", async () => {
    window.confirm.mockReturnValue(false);
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Stripe" });
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    expect(storage.set).not.toHaveBeenCalled();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ sorting */

describe("sorting", () => {
  it("sorts A–Z case-insensitively and renumbers the gutter", async () => {
    const { user } = await mount({ seed: SEED });

    await user.click(screen.getByRole("button", { name: "A–Z" }));
    expect(rowOrder()).toEqual(["anthropic", "Stripe", "Vercel"]);

    const first = screen.getAllByRole("article")[0];
    expect(within(first).getByText("01")).toBeInTheDocument();
    const last = screen.getAllByRole("article")[2];
    expect(within(last).getByText("03")).toBeInTheDocument();
  });

  it("puts undated records last in Newest and renders an em dash for the date", async () => {
    const seed = [
      { id: "d1", company: "Undated", stack: "", date: "", notes: "" },
      ...SEED,
    ];
    await mount({ seed });

    expect(rowOrder()).toEqual(["anthropic", "Vercel", "Stripe", "Undated"]);
    const row = screen.getByRole("article", { name: "Undated" });
    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("labels dates relative to today", async () => {
    await mount({
      seed: [
        { id: "r0", company: "Today Co", stack: "", date: isoDaysAgo(0), notes: "" },
        { id: "r1", company: "Yesterday Co", stack: "", date: isoDaysAgo(1), notes: "" },
        { id: "r9", company: "Nine Co", stack: "", date: isoDaysAgo(9), notes: "" },
      ],
    });

    expect(within(screen.getByRole("article", { name: "Today Co" })).getByText(/today/)).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "Yesterday Co" })).getByText(/1 day ago/)
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "Nine Co" })).getByText(/9 days ago/)
    ).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- render */

describe("row rendering", () => {
  it("splits the stack on commas and renders nothing when it's empty", async () => {
    await mount({ seed: SEED });

    const vercel = screen.getByRole("article", { name: "Vercel" });
    expect(within(vercel).getByText("TypeScript")).toBeInTheDocument();
    expect(within(vercel).getByText("Go")).toBeInTheDocument();

    const stripe = screen.getByRole("article", { name: "Stripe" });
    expect(within(stripe).queryByRole("list")).not.toBeInTheDocument();
  });

  it("expands one note at a time and hides the toggle when there are no notes", async () => {
    const seed = [
      ...SEED,
      { id: "a4", company: "Netlify", stack: "", date: "2026-04-01", notes: "Second note." },
    ];
    const { user } = await mount({ seed });

    // whitespace-only notes count as no notes
    const stripe = screen.getByRole("article", { name: "Stripe" });
    expect(within(stripe).queryByRole("button", { name: /notes/i })).not.toBeInTheDocument();

    const anthropic = screen.getByRole("article", { name: "anthropic" });
    await user.click(within(anthropic).getByRole("button", { name: "Show notes" }));
    expect(screen.getByText(/Screen went long on evals/)).toBeInTheDocument();

    const netlify = screen.getByRole("article", { name: "Netlify" });
    await user.click(within(netlify).getByRole("button", { name: "Show notes" }));
    expect(screen.getByText("Second note.")).toBeInTheDocument();
    expect(screen.queryByText(/Screen went long on evals/)).not.toBeInTheDocument();

    await user.click(within(netlify).getByRole("button", { name: "Hide notes" }));
    expect(screen.queryByText("Second note.")).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------- notes tab */

describe("interview notes tab", () => {
  it("lists only applications with notes and badges the count", async () => {
    const { user } = await mount({ seed: SEED });

    const notesTab = screen.getByRole("tab", { name: /Interview Notes/ });
    expect(within(notesTab).getByText("1")).toBeInTheDocument();

    await user.click(notesTab);
    expect(rowOrder()).toEqual(["anthropic"]);
    expect(screen.getByText(/Screen went long on evals/)).toBeInTheDocument();
  });

  it("shows an empty state when nothing has notes", async () => {
    const { user } = await mount({ seed: [SEED[0], SEED[2]] });

    await user.click(screen.getByRole("tab", { name: /Interview Notes/ }));
    expect(
      screen.getByText("No interview notes yet. Add notes to any application and they'll collect here.")
    ).toBeInTheDocument();
  });

  it("sends Edit back to the Applications tab with the form pre-filled", async () => {
    const { user } = await mount({ seed: SEED });

    await user.click(screen.getByRole("tab", { name: /Interview Notes/ }));
    const card = screen.getByRole("article", { name: "anthropic" });
    await user.click(within(card).getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("tab", { name: "Applications" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText(/company/i)).toHaveValue("anthropic");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("keeps both views in sync — notes added on an application show up here", async () => {
    const { user } = await mount({ seed: [SEED[0]] });

    const row = screen.getByRole("article", { name: "Vercel" });
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Notes"), "Onsite scheduled.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await user.click(screen.getByRole("tab", { name: /Interview Notes/ }));
    expect(screen.getByText("Onsite scheduled.")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------- write errors */

describe("write failures", () => {
  it("shows a non-blocking error bar and keeps the change on screen", async () => {
    const { user } = await mount({ failWrites: true });
    await openForm(user);

    await user.type(screen.getByLabelText(/company/i), "Figma");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save your last change/);
    expect(screen.getByText("Figma")).toBeInTheDocument(); // no rollback
  });

  it("clears the error bar once a write succeeds", async () => {
    const { storage, user } = await mount({ failWrites: true });
    await openForm(user);
    await user.type(screen.getByLabelText(/company/i), "Figma");
    await user.click(screen.getByRole("button", { name: "Add application" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    storage.set.mockImplementation(async () => {});
    const row = screen.getByRole("article", { name: "Figma" });
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("pipeline tools", () => {
  it("searches across application details and filters by status", async () => {
    const seed = [
      { ...SEED[0], role: "Frontend Engineer", status: "interview" },
      { ...SEED[1], role: "Research Engineer", status: "screening" },
      { ...SEED[2], status: "closed" },
    ];
    const { user } = await mount({ seed });

    await user.type(screen.getByRole("searchbox", { name: "Search applications" }), "frontend");
    expect(screen.getByRole("article", { name: "Vercel" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "anthropic" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.selectOptions(screen.getByLabelText("Filter by status"), "screening");
    expect(screen.getByRole("article", { name: "anthropic" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Vercel" })).not.toBeInTheDocument();
  });

  it("persists the richer pipeline fields and normalizes posting links", async () => {
    const { storage, user } = await mount();
    await openForm(user);

    await user.type(screen.getByLabelText(/company/i), "Linear");
    await user.type(screen.getByLabelText("Role"), "Product Engineer");
    await user.type(screen.getByLabelText("Location"), "Remote");
    await user.selectOptions(screen.getByLabelText("Status"), "interview");
    await user.type(screen.getByLabelText("Job posting"), "linear.app/careers/123");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(lastWrite(storage)[0]).toMatchObject({
      company: "Linear",
      role: "Product Engineer",
      location: "Remote",
      status: "interview",
      url: "https://linear.app/careers/123",
    });
  });
});
