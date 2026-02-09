import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function dismissSplash() {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.classList.add("fade-out");
    setTimeout(() => splash.remove(), 600);
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);

window.addEventListener("load", () => {
  setTimeout(dismissSplash, 1200);
});
