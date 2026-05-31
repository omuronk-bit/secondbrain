import { createRoot } from "react-dom/client";
import App from "./App";
import { ConnectGate } from "./components/ConnectGate";
import "./index.css";

// Apply the saved theme before first paint so the connect screen is styled too.
const theme = localStorage.getItem("secondbrain_theme") || "light";
document.documentElement.classList.add(theme);

// Register the service worker (push notifications + install).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
  });
}

createRoot(document.getElementById("root")!).render(
  <ConnectGate>
    <App />
  </ConnectGate>,
);
