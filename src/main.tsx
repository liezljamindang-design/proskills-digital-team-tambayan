import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./hq/components/ErrorBoundary";
import { Headquarters } from "./hq/Headquarters";
import "./hq/styles/tokens.css";
import "./hq/styles/base.css";
import "./hq/styles/playground.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Headquarters />
    </ErrorBoundary>
  </StrictMode>,
);

// Makes the site installable as an app on phones and computers.
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/sw.js").catch(() => undefined); });
}
