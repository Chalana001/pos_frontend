import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import Modal from './Modal';
import Button from './Button';
import Input from './Input';

/**
 * The one way this app asks "are you sure?".
 *
 * Nine screens had hand-rolled confirmation modals, and they had already
 * drifted: the dismiss button was "Cancel" here, "Go Back" there, "Keep
 * editing" somewhere else; two destructive confirms were styled blue with raw
 * classes; every page restated the icon plate and the footer row. One
 * component holds the shape - icon, message, optional detail, optional reason
 * input, Cancel-left / act-right - and pages supply only the words.
 *
 * `tone` picks the icon plate and the confirm button together, so a
 * destructive confirm cannot quietly ship in blue again:
 *   danger  - red plate, red button (deleting, cancelling an order)
 *   warning - amber plate, amber button (overriding a guard)
 *   primary - blue plate, blue button (a choice, nothing destroyed)
 *
 * `input` asks for a line of text with the confirm disabled until it exists -
 * onConfirm then receives the trimmed value. `children` carries anything
 * richer (a shortage list, row counts) between the message and the footer.
 */
const TONES = {
  danger: {
    chip: 'bg-red-100 text-red-600',
    confirmVariant: 'danger',
    confirmClassName: '',
  },
  warning: {
    chip: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    confirmVariant: 'primary',
    // The proven combo from the old POS override button: the raw amber pair
    // rides on top of btn-primary.
    confirmClassName: 'bg-amber-600 text-white shadow-md shadow-amber-200 hover:bg-amber-700',
  },
  primary: {
    chip: 'bg-blue-50 text-blue-600',
    confirmVariant: 'primary',
    confirmClassName: '',
  },
};

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  children,
  tone = 'danger',
  icon: Icon = AlertTriangle,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  confirmDisabled = false,
  input,
  size = 'sm',
}) => {
  const toneStyles = TONES[tone] ?? TONES.danger;
  const [value, setValue] = useState('');

  // A closed dialog forgets its text, so the next question never opens with
  // the previous answer in it.
  useEffect(() => {
    if (!isOpen) setValue('');
  }, [isOpen]);

  const needsText = Boolean(input) && !value.trim();

  const submit = (event) => {
    event?.preventDefault?.();
    if (busy || confirmDisabled || needsText) return;
    onConfirm(input ? value.trim() : undefined);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={submit} className="space-y-5">
        {(message || detail) && (
          <div className="flex gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneStyles.chip}`}>
              <Icon size={20} />
            </div>
            <div>
              {message && <p className="text-sm font-semibold text-slate-900">{message}</p>}
              {detail && <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>}
            </div>
          </div>
        )}

        {children}

        {input && (
          input.multiline ? (
            <textarea
              className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              rows={input.rows ?? 3}
              placeholder={input.placeholder}
              aria-label={input.label ?? input.placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          ) : (
            <Input
              label={input.label}
              placeholder={input.placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          )
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={toneStyles.confirmVariant}
            className={toneStyles.confirmClassName}
            disabled={busy || confirmDisabled || needsText}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ConfirmDialog;
