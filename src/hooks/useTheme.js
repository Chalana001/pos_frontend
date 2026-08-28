import { useEffect, useState } from "react";

import {
  getTheme,
  setTheme as persistTheme,
  subscribeToTheme,
} from "../utils/themePreference";

/** Reads and sets the app theme. Same shape as useAnimationLevel. */
export const useTheme = () => {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => subscribeToTheme(setThemeState), []);

  const updateTheme = (next) => {
    setThemeState(persistTheme(next));
  };

  return [theme, updateTheme];
};

export default useTheme;
