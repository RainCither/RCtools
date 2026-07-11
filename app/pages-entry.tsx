import { createRoot } from "react-dom/client";
import "./globals.css";
import { ToolboxApp } from "./toolbox-app";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element for the GitHub Pages entry.");
}

createRoot(root).render(<ToolboxApp />);
