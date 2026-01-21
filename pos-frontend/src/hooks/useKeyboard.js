import { useEffect } from 'react';

export const useKeyboard = (key, callback, deps = []) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ...deps]);
};