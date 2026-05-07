import React from "react";

const PanelResizeHandle = ({
  onMouseDown,
  isResizing = false,
  className = "",
  minHeightClassName = "min-h-[520px]",
}) => {
  return (
    <div className={`hidden flex-shrink-0 items-stretch overflow-visible lg:flex lg:w-3 ${className}`}>
      <button
        type="button"
        aria-label="Resize panels"
        onMouseDown={onMouseDown}
        className={`group relative flex w-full cursor-col-resize items-center justify-center rounded-full bg-transparent outline-none transition ${
          isResizing ? "opacity-100" : "opacity-80 hover:opacity-100"
        } ${minHeightClassName}`}
      >
        <span
          className={`absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full transition ${
            isResizing ? "bg-blue-500" : "bg-slate-200 group-hover:bg-slate-300"
          }`}
        />
        <span
          className={`relative flex h-14 w-5 items-center justify-center rounded-full border bg-white shadow-sm transition ${
            isResizing ? "border-blue-300" : "border-slate-200 group-hover:border-slate-300"
          }`}
        >
          <span className="h-8 w-[3px] rounded-full bg-slate-300" />
        </span>
      </button>
    </div>
  );
};

export default PanelResizeHandle;
