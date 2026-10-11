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
