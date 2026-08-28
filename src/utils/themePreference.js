export const THEMES = Object.freeze({
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
});

export const THEME_STORAGE_KEY = "pos_theme";

const validThemes = new Set(Object.values(THEMES));

/**
 * Theme preference for the whole app.
 *
 * Mirrors utils/animationPreferences.js on purpose: same storage shape, same
 * event, same subscribe contract, so there is one pattern to learn.
 *
 * The default is LIGHT, not SYSTEM. An earlier attempt keyed dark mode straight
 * off `prefers-color-scheme`, which flipped tills into a half-dark state nobody
 * asked for. Dark is now something a person picks. SYSTEM is still offered, and
 * when it is chosen it does follow the OS live — but choosing it is the point.
 */

const prefersDark = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

/** The theme actually painted, once SYSTEM has been resolved. */
export const resolveTheme = (theme) =>
  theme === THEMES.SYSTEM ? (prefersDark() ? THEMES.DARK : THEMES.LIGHT) : theme;

export const getTheme = () => {
  if (typeof window === "undefined") return THEMES.LIGHT;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return validThemes.has(stored) ? stored : THEMES.LIGHT;
  } catch {
    return THEMES.LIGHT;
  }
};

/**
 * Stamps the resolved theme on <html>. Light stamps too rather than leaving the
 * attribute off, so an explicit light choice is always visible in the DOM.
 */
export const applyTheme = (theme) => {
  const next = validThemes.has(theme) ? theme : THEMES.LIGHT;

  if (typeof document !== "undefined") {
    const resolved = resolveTheme(next);
    document.documentElement.dataset.theme = resolved;
    // Lets the browser paint native controls, scrollbars and form widgets to match.
    document.documentElement.style.colorScheme = resolved;
  }

  return next;
};

export const setTheme = (theme) => {
  const next = applyTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The choice still applies to this page when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent("pos:theme-change", { detail: next }));
  return next;
};

export const subscribeToTheme = (listener) => {
  const handleChange = (event) => listener(event.detail || getTheme());

  // Another tab on the same till changed it.
  const handleStorage = (event) => {
    if (event.key === THEME_STORAGE_KEY) {
      listener(applyTheme(getTheme()));
    }
  };

  // Only meaningful while SYSTEM is the selection; re-applying is cheap and
  // resolves to the same value otherwise.
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const handleSystem = () => {
    if (getTheme() === THEMES.SYSTEM) {
      applyTheme(THEMES.SYSTEM);
      listener(THEMES.SYSTEM);
    }
  };

  window.addEventListener("pos:theme-change", handleChange);
  window.addEventListener("storage", handleStorage);
  media?.addEventListener?.("change", handleSystem);

  return () => {
    window.removeEventListener("pos:theme-change", handleChange);
    window.removeEventListener("storage", handleStorage);
    media?.removeEventListener?.("change", handleSystem);
  };
};
