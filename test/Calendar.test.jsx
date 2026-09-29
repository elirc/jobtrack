import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarHome from "../src/calendar/CalendarHome.jsx";

const STORAGE_KEY = "timetrack:events";

/* ------------------------------------------------------------------ fixtures */

// The calendar always opens on the real today, so the fixtures are built from
// it — with their own date arithmetic, so a bug in src/dates.js can't hide here.
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const pad = (n) => String(n).padStart(2, "0");
const dateOf = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (iso, days) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
};

/** "Jul 31, 2026" — matches what formatDate renders. */
const fmt = (iso) => {
  const d = dateOf(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
/** "Friday · Jul 31, 2026" — the day view's heading. */
const dayHeading = (iso) => `${WEEKDAY_NAMES[(dateOf(iso).getDay() + 6) % 7]} · ${fmt(iso)}`;
/** "Friday, Jul 31, 2026" — a week view day button. */
const dayButton = (iso) => `${WEEKDAY_NAMES[(dateOf(iso).getDay() + 6) % 7]}, ${fmt(iso)}`;

const TODAY = isoOf(new Date());
const TOMORROW = shift(TODAY, 1);
const MONDAY = shift(TODAY, -((dateOf(TODAY).getDay() + 6) % 7));
const WEEK_DAYS = Array.from({ length: 7 }, (_, i) => shift(MONDAY, i));
const WEDNESDAY = WEEK_DAYS[2];
/** A day in the current month that is never today, so its cell stays isolated. */
const OTHER_DAY = `${TODAY.slice(0, 8)}${TODAY.endsWith("15") ? "16" : "15"}`;

const SEED = [
  { id: "e1", title: "Standup", date: TODAY, start: "09:30", end: "09:45", category: "work", notes: "", done: false },
  {
    id: "e2",
    title: "Gym",
    date: TODAY,
    start: "07:00",
    end: "08:00",
    category: "health",
    notes: "Leg day.",
    done: true,
  },
  {
    id: "e3",
    title: "Read the spec",
    date: TODAY,
    start: "",
    end: "",
    category: "job-hunt",
    notes: "Two pages left.",
    done: false,
  },
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

/** Event titles in the order the day view renders them. */
const rowOrder = () => screen.getAllByRole("article").map((el) => el.getAttribute("aria-label"));

async function mount(opts) {
  const storage = fakeStorage(opts);
  const user = userEvent.setup();
  render(<CalendarHome />);
  // wait out the initial async read
  await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
  return { storage, user };
}

const openForm = (user) => user.click(screen.getByRole("button", { name: "+ Add event" }));
const switchTo = (user, label) => user.click(screen.getByRole("button", { name: label }));

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.storage;
});

/* --------------------------------------------------------------------- load */

describe("loading", () => {
  it("treats a missing key as an empty day (first run)", async () => {
    const { storage } = await mount();

    expect(storage.get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(screen.getByRole("heading", { level: 1, name: dayHeading(TODAY) })).toBeInTheDocument();
    expect(
      screen.getByText("Nothing scheduled today. Add an event to get started.")
    ).toBeInTheDocument();
    expect(screen.getByText("0 events · 0 done")).toBeInTheDocument();
  });

  it("shows a loading state until the read resolves", async () => {
    let release;
    window.storage = {
      get: vi.fn(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ value: JSON.stringify(SEED) });
          })
      ),
      set: vi.fn(async () => {}),
    };
    render(<CalendarHome />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Standup")).not.toBeInTheDocument();

    release();
    expect(await screen.findByText("Standup")).toBeInTheDocument();
  });

  it("puts untimed events first, then runs the day by the clock", async () => {
    await mount({ seed: SEED });

    expect(rowOrder()).toEqual(["Read the spec", "Gym", "Standup"]);
    expect(screen.getByText("3 events · 1 done")).toBeInTheDocument();

    const spec = screen.getByRole("article", { name: "Read the spec" });
    expect(within(spec).getByText("all day")).toBeInTheDocument();
    const gym = screen.getByRole("article", { name: "Gym" });
    expect(within(gym).getByText("07:00–08:00")).toBeInTheDocument();
    expect(within(gym).getByRole("checkbox")).toBeChecked();
  });

  it("renders partial records without inventing data", async () => {
    await mount({ seed: [{ id: "p1", title: "Legacy", date: TODAY }] });

    const row = screen.getByRole("article", { name: "Legacy" });
    expect(within(row).getByText("all day")).toBeInTheDocument();
    expect(within(row).getByText("Other")).toBeInTheDocument(); // unknown category
    expect(within(row).getByRole("checkbox")).not.toBeChecked();
    expect(within(row).queryByRole("button", { name: /notes/i })).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- create */

describe("creating", () => {
  it("blocks submit until the title has non-whitespace text", async () => {
    const { user } = await mount();
    await openForm(user);

    const submit = screen.getByRole("button", { name: "Add event" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/title/i), "   ");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/title/i), "Standup");
    expect(submit).toBeEnabled();
  });

  it("appends an event with the whole payload and resets the form", async () => {
    const { storage, user } = await mount();
    await openForm(user);

    await user.type(screen.getByLabelText(/title/i), "  Recruiter call  ");
    await user.type(screen.getByLabelText("Start"), "11:00");
    await user.type(screen.getByLabelText("End"), "11:30");
    await user.selectOptions(screen.getByLabelText("Category"), "job-hunt");
    await user.type(screen.getByLabelText("Notes"), "Ask about the team split.");
    await user.click(screen.getByRole("button", { name: "Add event" }));

    const written = lastWrite(storage);
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      title: "Recruiter call", // trimmed
      date: TODAY,
      start: "11:00",
      end: "11:30",
      category: "job-hunt",
      notes: "Ask about the team split.",
      done: false,
    });
    expect(written[0].id).toEqual(expect.any(String));

    // form closed and cleared
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    await openForm(user);
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText("Start")).toHaveValue("");
  });

  it("defaults the date to the day being viewed", async () => {
    const { storage, user } = await mount();

    await user.click(screen.getByRole("button", { name: "Next day" }));
    await openForm(user);
    expect(screen.getByLabelText("Date")).toHaveValue(TOMORROW);

    await user.type(screen.getByLabelText(/title/i), "Dentist");
    await user.click(screen.getByRole("button", { name: "Add event" }));

    expect(lastWrite(storage)[0].date).toBe(TOMORROW);
    expect(screen.getByRole("article", { name: "Dentist" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- update */

describe("editing", () => {
  it("pre-fills the form and replaces the event in place, keeping its id", async () => {
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Gym" });
    await user.click(within(row).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText(/title/i)).toHaveValue("Gym");
    expect(screen.getByLabelText("Start")).toHaveValue("07:00");
    expect(screen.getByLabelText("Category")).toHaveValue("health");
    expect(screen.getByLabelText("Notes")).toHaveValue("Leg day.");

    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Gym — legs");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const written = lastWrite(storage);
    expect(written).toHaveLength(3);
    expect(written.find((e) => e.id === "e2")).toMatchObject({
      title: "Gym — legs",
      start: "07:00",
      done: true, // untouched fields survive the edit
    });
    expect(screen.getByRole("article", { name: "Gym — legs" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- delete */

describe("deleting", () => {
  it("removes the event after confirmation", async () => {
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Standup" });
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete this event? This can't be undone.");
    expect(lastWrite(storage).map((e) => e.id)).toEqual(["e2", "e3"]);
    expect(screen.queryByText("Standup")).not.toBeInTheDocument();
  });

  it("keeps the event when the confirmation is dismissed", async () => {
    window.confirm.mockReturnValue(false);
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Standup" });
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    expect(storage.set).not.toHaveBeenCalled();
    expect(screen.getByRole("article", { name: "Standup" })).toBeInTheDocument();
  });
});

/* --------------------------------------------------------- accountability */

describe("marking done", () => {
  it("persists the checkbox and strikes the title through", async () => {
    const { storage, user } = await mount({ seed: SEED });

    const row = screen.getByRole("article", { name: "Standup" });
    await user.click(within(row).getByRole("checkbox"));

    expect(lastWrite(storage).find((e) => e.id === "e1").done).toBe(true);
    expect(within(row).getByRole("checkbox")).toBeChecked();
    expect(within(row).getByText("Standup")).toHaveStyle({ textDecoration: "line-through" });
    expect(screen.getByText("3 events · 2 done")).toBeInTheDocument();
  });
});

describe("notes", () => {
  it("expands one note at a time", async () => {
    const { user } = await mount({ seed: SEED });

    const gym = screen.getByRole("article", { name: "Gym" });
    await user.click(within(gym).getByRole("button", { name: "Show notes" }));
    expect(screen.getByText("Leg day.")).toBeInTheDocument();

    const spec = screen.getByRole("article", { name: "Read the spec" });
    await user.click(within(spec).getByRole("button", { name: "Show notes" }));
    expect(screen.getByText("Two pages left.")).toBeInTheDocument();
    expect(screen.queryByText("Leg day.")).not.toBeInTheDocument();

    await user.click(within(spec).getByRole("button", { name: "Hide notes" }));
    expect(screen.queryByText("Two pages left.")).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------- views */

describe("switching views", () => {
  it("moves between day, week and month and marks the active pill", async () => {
    const { user } = await mount({ seed: SEED });

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");

    await switchTo(user, "Week");
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("article")).not.toBeInTheDocument(); // day rows are gone

    await switchTo(user, "Month");
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `${MONTH_NAMES_LONG[dateOf(TODAY).getMonth()]} ${dateOf(TODAY).getFullYear()}`,
      })
    ).toBeInTheDocument();

    await switchTo(user, "Today");
    expect(screen.getByRole("heading", { level: 1, name: dayHeading(TODAY) })).toBeInTheDocument();
  });

  it("lists the seven days of the week and jumps into one of them", async () => {
    const { user } = await mount({
      seed: [...SEED, { id: "e4", title: "Team sync", date: WEDNESDAY, start: "14:00", end: "", category: "work", notes: "", done: false }],
    });

    await switchTo(user, "Week");
    for (const iso of WEEK_DAYS) {
      expect(screen.getByRole("button", { name: dayButton(iso) })).toBeInTheDocument();
    }
    expect(screen.getByText("Team sync")).toBeInTheDocument();
    expect(screen.getAllByText("No events").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: dayButton(WEDNESDAY) }));
    expect(screen.getByRole("heading", { level: 1, name: dayHeading(WEDNESDAY) })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Team sync" })).toBeInTheDocument();
  });

  it("shows events in the month grid and opens the day you click", async () => {
    const { user } = await mount({
      seed: [{ id: "m1", title: "Dentist", date: OTHER_DAY, start: "08:15", end: "", category: "health", notes: "", done: false }],
    });

    await switchTo(user, "Month");
    expect(screen.getByText("Dentist")).toBeInTheDocument();

    const cell = screen.getByRole("button", { name: `${fmt(OTHER_DAY)}, 1 event` });
    await user.click(cell);

    expect(screen.getByRole("heading", { level: 1, name: dayHeading(OTHER_DAY) })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Dentist" })).toBeInTheDocument();
  });
});

/* --------------------------------------------------------------- navigation */

describe("moving through time", () => {
  it("steps by a day, a week or a month depending on the view", async () => {
    const { user } = await mount({ seed: SEED });

    await user.click(screen.getByRole("button", { name: "Next day" }));
    expect(screen.getByRole("heading", { level: 1, name: dayHeading(TOMORROW) })).toBeInTheDocument();
    expect(screen.getByText("Nothing scheduled this day.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous day" }));
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(
      screen.getByRole("heading", { level: 1, name: dayHeading(shift(TODAY, -1)) })
    ).toBeInTheDocument();

    // back to today, then a week forward
    await user.click(screen.getByRole("button", { name: "Jump to today" }));
    await switchTo(user, "Week");
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("button", { name: dayButton(shift(MONDAY, 7)) })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dayButton(MONDAY) })).not.toBeInTheDocument();

    // back to today again — a week's step may already have crossed a month
    await user.click(screen.getByRole("button", { name: "Jump to today" }));
    await switchTo(user, "Month");
    await user.click(screen.getByRole("button", { name: "Next month" }));
    const nextMonth = new Date(dateOf(TODAY).getFullYear(), dateOf(TODAY).getMonth() + 1, 1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `${MONTH_NAMES_LONG[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`,
      })
    ).toBeInTheDocument();
  });

  it("returns to today from wherever you wandered off to", async () => {
    const { user } = await mount({ seed: SEED });

    await user.click(screen.getByRole("button", { name: "Next day" }));
    await user.click(screen.getByRole("button", { name: "Next day" }));
    expect(screen.queryByRole("article", { name: "Standup" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Jump to today" }));
    expect(screen.getByRole("heading", { level: 1, name: dayHeading(TODAY) })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Standup" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------- write errors */

describe("write failures", () => {
  it("shows a non-blocking error bar and keeps the change on screen", async () => {
    const { user } = await mount({ failWrites: true });
    await openForm(user);

    await user.type(screen.getByLabelText(/title/i), "Standup");
    await user.click(screen.getByRole("button", { name: "Add event" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save your last change/);
    expect(screen.getByRole("article", { name: "Standup" })).toBeInTheDocument(); // no rollback
  });
});

describe("time validation", () => {
  it("does not allow an event to end before it starts", async () => {
    const { user } = await mount();
    await openForm(user);
    await user.type(screen.getByLabelText(/title/i), "Backwards meeting");
    await user.type(screen.getByLabelText("Start"), "14:00");
    await user.type(screen.getByLabelText("End"), "13:00");

    expect(screen.getByText("End time must be after start time.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add event" })).toBeDisabled();
  });
});
