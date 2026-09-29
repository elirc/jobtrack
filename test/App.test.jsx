import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

const STORAGE_KEY = "jobtracker:data";

const SEED = [{ id: "a1", company: "Vercel", stack: "TypeScript, Go", date: "2026-03-04", notes: "" }];

/** Minimal fake `window.storage` — get() rejects on a missing key, as the real one does. */
function fakeStorage(seed) {
  const map = new Map();
  if (seed !== undefined) map.set(STORAGE_KEY, JSON.stringify(seed));

  window.storage = {
    get: vi.fn(async (key) => {
      if (!map.has(key)) throw new Error(`no value for "${key}"`);
      return { key, value: map.get(key) };
    }),
    set: vi.fn(async (key, value) => {
      map.set(key, value);
      return { key, value };
    }),
  };
  return window.storage;
}

function mount(seed) {
  fakeStorage(seed);
  const user = userEvent.setup();
  render(<App />);
  return { user };
}

const nav = (label) => screen.getByRole("button", { name: label });

afterEach(() => {
  vi.restoreAllMocks();
  delete window.storage;
});

describe("app shell", () => {
  it("opens on the calendar section", () => {
    mount();

    expect(screen.getByText("Daybook")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add event" })).toBeInTheDocument();
    expect(screen.queryByText("Job Applications")).not.toBeInTheDocument();
  });

  it("switches to the job tracker and back from the nav", async () => {
    const { user } = mount(SEED);

    await user.click(nav("Job Tracker"));
    expect(await screen.findByText("Job Applications")).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: "Vercel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Add event" })).not.toBeInTheDocument();

    await user.click(nav("Calendar"));
    expect(screen.getByRole("button", { name: "+ Add event" })).toBeInTheDocument();
    expect(screen.queryByText("Job Applications")).not.toBeInTheDocument();
  });

  it("marks the current section with aria-pressed", async () => {
    const { user } = mount();

    expect(nav("Calendar")).toHaveAttribute("aria-pressed", "true");
    expect(nav("Job Tracker")).toHaveAttribute("aria-pressed", "false");

    await user.click(nav("Job Tracker"));
    expect(nav("Calendar")).toHaveAttribute("aria-pressed", "false");
    expect(nav("Job Tracker")).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the shell chrome above whichever section is showing", async () => {
    const { user } = mount(SEED);

    await user.click(nav("Job Tracker"));
    expect(screen.getByText("Daybook")).toBeInTheDocument();
    expect(nav("Calendar")).toBeInTheDocument();
  });

  it("injects the shared stylesheet exactly once", async () => {
    const { user } = mount(SEED);
    const sheets = () =>
      [...document.querySelectorAll("style")].filter((el) => el.textContent.includes(".jt-root"));

    expect(sheets()).toHaveLength(1);

    await user.click(nav("Job Tracker"));
    expect(sheets()).toHaveLength(1); // the section, not the shell, re-renders
  });
});
