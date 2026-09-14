import { useRef, useEffect } from "react";

export function useSearchOnType(setter, existingRef) {
  const ownRef = useRef(null);
  const ref = existingRef ?? ownRef;
  const setterRef = useRef(setter);
  setterRef.current = setter;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // A dialog owns the keyboard while it is up. Without this a scan made while the
      // batch picker or the checkout panel was open typed into the search box behind it
      // and its Enter added a second item to the cart, with nothing on screen to show it.
      // Read from the DOM rather than from a list of open-modal flags: the flags would be
      // a second source of truth and the next modal added would be forgotten. Every modal
      // in this app unmounts when closed, so this only matches one that is genuinely open.
      if (document.querySelector('[role="dialog"]')) return;

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

      // A disabled search box cannot be typed into, focused, or emptied by hand, so
      // capturing for it only fills state nobody can see: the item grid filters itself
      // down to "No items found" and nothing says why. A scan arriving at the till before
      // a shift is open is exactly that. Escape above still clears, so a query captured
      // before the box was disabled is not stuck there.
      if (ref.current?.disabled) return;

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
