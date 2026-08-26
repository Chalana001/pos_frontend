import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { applyAnimationLevel, getAnimationLevel } from "./utils/animationPreferences.js";

applyAnimationLevel(getAnimationLevel());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);

// Unsynced offline sales are the only copy of themselves — they exist in this browser
// profile's IndexedDB and nowhere else. Without persistence the browser is free to evict
// that storage under disk pressure and take the queue with it. An installed PWA is
// usually granted this automatically; asking explicitly covers the plain-tab case too.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((alreadyPersisted) => (alreadyPersisted ? true : navigator.storage.persist()))
    .then((granted) => {
      if (!granted) {
        console.warn("Persistent storage was not granted; the offline sales queue may be evicted.");
      }
    })
    .catch(() => {});
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      registration.update();
    }).catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}
