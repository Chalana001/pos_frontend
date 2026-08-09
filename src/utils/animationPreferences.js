export const ANIMATION_LEVELS = Object.freeze({
  OFF: "off",
  BALANCED: "balanced",
  HIGH: "high",
});

export const ANIMATION_LEVEL_STORAGE_KEY = "pos_animation_level";

const validLevels = new Set(Object.values(ANIMATION_LEVELS));

const getSystemDefault = () => {
  if (typeof window === "undefined") return ANIMATION_LEVELS.BALANCED;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? ANIMATION_LEVELS.OFF
    : ANIMATION_LEVELS.BALANCED;
};

export const getAnimationLevel = () => {
  if (typeof window === "undefined") return ANIMATION_LEVELS.BALANCED;

  try {
    const storedLevel = window.localStorage.getItem(ANIMATION_LEVEL_STORAGE_KEY);
    return validLevels.has(storedLevel) ? storedLevel : getSystemDefault();
  } catch {
    return getSystemDefault();
  }
};

export const applyAnimationLevel = (level) => {
  const nextLevel = validLevels.has(level) ? level : getSystemDefault();
  if (typeof document !== "undefined") {
    document.documentElement.dataset.animationLevel = nextLevel;
  }
  return nextLevel;
};

export const setAnimationLevel = (level) => {
  const nextLevel = applyAnimationLevel(level);
  try {
    window.localStorage.setItem(ANIMATION_LEVEL_STORAGE_KEY, nextLevel);
  } catch {
    // The preference still applies for this page when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent("pos:animation-level-change", { detail: nextLevel }));
  return nextLevel;
};

export const subscribeToAnimationLevel = (listener) => {
  const handleChange = (event) => listener(event.detail || getAnimationLevel());
  const handleStorage = (event) => {
    if (event.key === ANIMATION_LEVEL_STORAGE_KEY) {
      listener(applyAnimationLevel(getAnimationLevel()));
    }
  };
  window.addEventListener("pos:animation-level-change", handleChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("pos:animation-level-change", handleChange);
    window.removeEventListener("storage", handleStorage);
  };
};
