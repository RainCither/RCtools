import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { TOOL_IDS } from "../generated/catalog";
const base = import.meta.env.BASE_URL;
const path = location.pathname.startsWith(base)
  ? location.pathname.slice(base.length).replace(/\/$/, "")
  : "";
if (path && !(TOOL_IDS as readonly string[]).includes(path)) location.replace(base);
else
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
