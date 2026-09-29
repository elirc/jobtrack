import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom has no layout engine, so scrollTo is unimplemented and logs on every
// call. The app scrolls to the form when you hit Edit; stub it out.
window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
});
