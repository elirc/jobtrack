import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { installStorage } from "./storage.js";

// Must run before the component mounts and reads STORAGE_KEY.
installStorage();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
