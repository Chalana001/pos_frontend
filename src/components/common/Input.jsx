import React, { forwardRef, useId } from 'react';

/**
 * The label was previously rendered without htmlFor and the input without an id,
 * so nothing tied them together. Because most pages build their forms from this
 * component, that one omission unlabelled the majority of the app's inputs:
 * tapping a label did not focus its field, and screen readers announced the
 * control with no name.
 *
 * Callers may still pass their own `id`; the generated one is only a fallback.
 */
const Input = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  // Point the input at whichever descriptions are actually on screen, so the
  // error text is announced on focus rather than sitting there unread.
  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-sm text-slate-500">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
