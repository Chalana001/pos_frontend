import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusable = (root) =>
  root ? Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null) : [];

/**
 * Escape and body-scroll locking were already handled. What was missing was the
 * rest of the dialog contract: Tab walked straight out of the panel and carried
 * on through the page underneath, the dialog announced itself as a plain div,
 * and closing left focus wherever it happened to be.
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const panelRef = useRef(null);
  const titleId = useId();

  // Callers pass inline arrows for onClose, so its identity changes every render.
  // Keeping it in a ref lets the effect depend on `isOpen` alone — otherwise the
  // cleanup below would run on every render and yank focus back to the opener
  // while the dialog is still up.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const opener = document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable(panelRef.current);

      // Nothing to land on — keep focus on the panel rather than letting it
      // escape to the page behind the overlay.
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog; leaving it on the trigger behind the overlay
    // means the first Tab lands somewhere invisible. React applies autoFocus
    // during commit, before this effect runs, so a child that asked for focus
    // already has it — respect that instead of dragging focus to the close button.
    if (!panelRef.current?.contains(document.activeElement)) {
      const [firstFocusable] = getFocusable(panelRef.current);
      (firstFocusable || panelRef.current)?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      // Send focus back where it came from, so the keyboard does not restart
      // at the top of the page after every dialog.
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="modal-overlay-enter fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : 'Dialog'}
          tabIndex={-1}
          className={`modal-panel-enter shell-surface relative w-full max-h-[90vh] overflow-hidden rounded-xl focus:outline-none ${sizes[size]}`}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            {title ? <h2 id={titleId} className="text-xl font-semibold text-slate-800">{title}</h2> : <div />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-140px)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
