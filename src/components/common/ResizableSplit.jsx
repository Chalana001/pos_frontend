import React, { useEffect, useRef, useState } from "react";

import PanelResizeHandle from "./PanelResizeHandle";

/**
 * Two panes side by side with the POS screen's drag handle between them.
 *
 * The form-and-list screens (promotions, dining tables, expense types) all
 * used a fixed grid: the form column's width was whatever the minmax said,
 * and both panes shared the page's one scrollbar, so a long target list on
 * the left dragged the results out of view on the right. This wraps the same
 * two children in the POS panel treatment instead: the left pane keeps a
 * draggable width, remembered per screen, and from xl up each pane scrolls
 * on its own. Below xl the panes stack exactly like the grid they replace.
 *
 * Usage: exactly two children - the left pane, then the right pane.
 */
const ResizableSplit = ({
  children,
  storageKey,
  initialWidth = 420,
  min = 320,
  max = 640,
  className = "",
}) => {
  const [left, right] = React.Children.toArray(children);

  const [width, setWidth] = useState(() => {
    if (storageKey) {
      try {
        const stored = Number(window.localStorage.getItem(storageKey));
        if (stored >= min && stored <= max) return stored;
      } catch {
        /* storage unavailable - fall through to the default */
      }
    }
    return initialWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const leftRef = useRef(null);
  const stateRef = useRef({ startX: 0, startWidth: width, nextWidth: width });
  const frameRef = useRef(null);

  const handleResizeStart = (event) => {
    stateRef.current = { startX: event.clientX, startWidth: width, nextWidth: width };
    setIsResizing(true);
  };

  // Same rhythm as the POS cart resize: track on window, paint through
  // requestAnimationFrame, commit the width once on mouseup.
  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event) => {
      const delta = event.clientX - stateRef.current.startX;
      const nextWidth = Math.max(min, Math.min(max, stateRef.current.startWidth + delta));
      stateRef.current.nextWidth = nextWidth;
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        leftRef.current?.style.setProperty("--split-w", `${stateRef.current.nextWidth}px`);
      });
    };

    const handleMouseUp = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const settled = stateRef.current.nextWidth || stateRef.current.startWidth;
      setWidth(settled);
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, String(settled));
        } catch {
          /* storage unavailable - the session still keeps the width in state */
        }
      }
      setIsResizing(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isResizing, min, max, storageKey]);

  return (
    <div className={`flex flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-0 ${className}`}>
      <div
        ref={leftRef}
        style={{ "--split-w": `${width}px` }}
        className="min-w-0 custom-scrollbar xl:w-[var(--split-w)] xl:shrink-0 xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto"
      >
        {left}
      </div>
      <PanelResizeHandle
        onMouseDown={handleResizeStart}
        isResizing={isResizing}
        breakpointClassName="xl:flex"
        minHeightClassName="min-h-[240px]"
      />
      <div className="min-w-0 flex-1 custom-scrollbar xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto">
        {right}
      </div>
    </div>
  );
};

export default ResizableSplit;
