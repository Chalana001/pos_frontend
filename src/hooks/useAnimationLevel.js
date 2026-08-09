import { useEffect, useState } from "react";

import {
  getAnimationLevel,
  setAnimationLevel,
  subscribeToAnimationLevel,
} from "../utils/animationPreferences";

export const useAnimationLevel = () => {
  const [animationLevel, setLevelState] = useState(getAnimationLevel);

  useEffect(() => subscribeToAnimationLevel(setLevelState), []);

  const updateAnimationLevel = (level) => {
    const nextLevel = setAnimationLevel(level);
    setLevelState(nextLevel);
  };

  return [animationLevel, updateAnimationLevel];
};
