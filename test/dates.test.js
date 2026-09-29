import { describe, expect, it } from "vitest";
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
  startOfWeek,
  toISO,
  todayISO,
  weekDays,
  weekdayName,
} from "../src/dates.js";

/* ------------------------------------------------------------------ tables */

describe("labels", () => {
  it("keeps twelve months in both lengths and seven Monday-first weekdays", () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS_LONG).toHaveLength(12);
    expect(MONTHS_LONG[6]).toBe("July");
    expect(WEEKDAYS[0]).toBe("Mon");
    expect(WEEKDAYS[6]).toBe("Sun");
  });
});

/* ------------------------------------------------------------- conversions */

describe("toISO", () => {
  it("round-trips a local date without the UTC shift toISOString would add", () => {
    expect(toISO(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toISO(new Date(2026, 11, 31))).toBe("2026-12-31");
    // local midnight on the 1st is the previous day in any negative-offset zone
    expect(formatDate(toISO(new Date(2026, 6, 4)))).toBe("Jul 4, 2026");
  });

  it("returns an empty string for anything that isn't a usable Date", () => {
    expect(toISO(new Date("nope"))).toBe("");
    expect(toISO("2026-01-01")).toBe("");
    expect(toISO(null)).toBe("");
  });

  it("still reports today as a plain ISO day", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayISO()).toBe(toISO(new Date()));
  });
});

describe("strict parsing", () => {
  it("rejects calendar dates that JavaScript would silently roll forward", () => {
    expect(formatDate("2026-02-31")).toBe("—");
    expect(formatDate("2026-13-01")).toBe("—");
    expect(formatDate("2026-00-10")).toBe("—");
  });
});

/* ---------------------------------------------------------------- addDays */

describe("addDays", () => {
  it("moves forward and back across month and year boundaries", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-08-01", -1)).toBe("2026-07-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // leap year
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("is a no-op for zero and empty for junk", () => {
    expect(addDays("2026-07-31", 0)).toBe("2026-07-31");
    expect(addDays("", 3)).toBe("");
    expect(addDays("last tuesday", 3)).toBe("");
  });
});

/* -------------------------------------------------------------- addMonths */

describe("addMonths", () => {
  it("clamps to the end of a shorter target month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // leap February
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-05-31", 1)).toBe("2026-06-30");
  });

  it("keeps the day of the month when it fits, and rolls the year", () => {
    expect(addMonths("2026-07-15", 1)).toBe("2026-08-15");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2026-07-15", 12)).toBe("2027-07-15");
  });

  it("returns empty for junk", () => {
    expect(addMonths("", 1)).toBe("");
  });

  it("does not compound the clamp — stepping back returns to the shorter day", () => {
    // Jan 31 -> Feb 28 -> Jan 28: months are lossy, which is why the view keeps
    // its own anchor rather than replaying steps
    expect(addMonths(addMonths("2026-01-31", 1), -1)).toBe("2026-01-28");
  });
});

/* ------------------------------------------------------------ startOfWeek */

describe("startOfWeek", () => {
  it("returns the Monday on or before the date", () => {
    expect(startOfWeek("2026-07-27")).toBe("2026-07-27"); // a Monday
    expect(startOfWeek("2026-07-31")).toBe("2026-07-27"); // Friday
    expect(startOfWeek("2026-08-02")).toBe("2026-07-27"); // Sunday closes the week
    expect(startOfWeek("2026-08-03")).toBe("2026-08-03"); // next Monday
  });

  it("walks back into the previous year when the week straddles it", () => {
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
    expect(startOfWeek("2026-01-03")).toBe("2025-12-29");
    expect(startOfWeek("2026-01-01")).toBe("2025-12-29");
  });

  it("returns empty for junk", () => {
    expect(startOfWeek("")).toBe("");
  });
});

/* -------------------------------------------------------------- weekDays */

describe("weekDays", () => {
  it("lists seven consecutive days, Monday first, containing the date", () => {
    const days = weekDays("2026-07-31");
    expect(days).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
    expect(days).toContain("2026-07-31");
  });

  it("returns nothing usable for junk", () => {
    expect(weekDays("nope")).toEqual([]);
  });
});

/* ------------------------------------------------------------- monthGrid */

describe("monthGrid", () => {
  it("covers the month in whole Monday-start weeks", () => {
    const weeks = monthGrid("2026-07-15");
    expect(weeks.every((w) => w.length === 7)).toBe(true);

    const flat = weeks.flat();
    expect(startOfWeek(flat[0])).toBe(flat[0]); // opens on a Monday
    expect(flat[0]).toBe("2026-06-29");
    expect(flat.at(-1)).toBe("2026-08-02");

    // every day of July is on the page exactly once
    for (let d = 1; d <= 31; d += 1) {
      const iso = `2026-07-${String(d).padStart(2, "0")}`;
      expect(flat.filter((x) => x === iso)).toHaveLength(1);
    }
  });

  it("uses four rows for a 28-day February that opens on a Monday", () => {
    const weeks = monthGrid("2021-02-10");
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe("2021-02-01");
    expect(weeks[3][6]).toBe("2021-02-28");
  });

  it("uses six rows when a 31-day month opens on a Saturday", () => {
    const weeks = monthGrid("2026-08-15");
    expect(weeks).toHaveLength(6);
    expect(weeks[0][0]).toBe("2026-07-27"); // leading days from July
    expect(weeks[5][6]).toBe("2026-09-06"); // trailing days from September
  });

  it("returns nothing usable for junk", () => {
    expect(monthGrid("")).toEqual([]);
  });
});

/* ---------------------------------------------------------------- predicates */

describe("isToday and isSameMonth", () => {
  it("recognises today and nothing else", () => {
    expect(isToday(todayISO())).toBe(true);
    expect(isToday("1999-01-01")).toBe(false);
    expect(isToday("")).toBe(false);
  });

  it("compares month and year together", () => {
    expect(isSameMonth("2026-07-01", "2026-07-31")).toBe(true);
    expect(isSameMonth("2026-07-31", "2026-08-01")).toBe(false);
    expect(isSameMonth("2025-07-15", "2026-07-15")).toBe(false);
    expect(isSameMonth("", "2026-07-15")).toBe(false);
  });
});

/* ------------------------------------------------------------ weekdayName */

describe("weekdayName", () => {
  it("names the day long by default and short on request", () => {
    expect(weekdayName("2026-07-31")).toBe("Friday");
    expect(weekdayName("2026-07-31", "short")).toBe("Fri");
    expect(weekdayName("2026-08-02")).toBe("Sunday");
    expect(weekdayName("2026-08-02", "short")).toBe("Sun");
  });

  it("lines up with the WEEKDAYS headings across a whole week", () => {
    weekDays("2026-07-31").forEach((iso, i) => {
      expect(weekdayName(iso, "short")).toBe(WEEKDAYS[i]);
    });
  });

  it("returns empty for junk", () => {
    expect(weekdayName("")).toBe("");
  });
});
