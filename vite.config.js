import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    css: false,
    // userEvent types one character at a time through jsdom; the longer form
    // tests run well past vitest's 5s default on a slow machine.
    testTimeout: 30000,
  },
});
