import { useRef, useEffect } from "react";

export function useSearchOnType(setter, existingRef) {
  const ownRef = useRef(null);
  const ref = existingRef ?? ownRef;
  const setterRef = useRef(setter);
  setterRef.current = setter;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      const isInOtherField =
        (tag === "input" || tag === "textarea" || tag === "select" || active?.isContentEditable) &&
        active !== ref.current;

      if (isInOtherField) return;

      if (e.key === "Escape") {
        setterRef.current("");
        ref.current?.focus();
        return;
      }

      if (active === ref.current) return;

      if (e.key.length === 1) {
        e.preventDefault();
        setterRef.current((prev) => prev + e.key);
        ref.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return ref;
}
