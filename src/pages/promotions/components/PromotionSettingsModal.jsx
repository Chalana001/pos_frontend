import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { promotionsAPI } from "../../../api/promotions.api";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";

const EMPTY = {
  approvalRequired: false,
  approvalThresholdPercent: "",
  approvalThresholdAmount: "",
  cashierManualStacking: true,
};

/**
 * How careful this shop wants to be. Approval is off by default because a one-owner shop has
 * nobody to approve to; switched on, a promotion at or over the threshold waits for an admin
 * other than the person who submitted it.
 */
const PromotionSettingsModal = ({ isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await promotionsAPI.settings();
        if (cancelled) return;
        setForm({
          approvalRequired: !!response.data?.approvalRequired,
          approvalThresholdPercent: response.data?.approvalThresholdPercent ?? "",
          approvalThresholdAmount: response.data?.approvalThresholdAmount ?? "",
          cashierManualStacking: response.data?.cashierManualStacking !== false,
        });
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    try {
      setSaving(true);
      await promotionsAPI.updateSettings({
        approvalRequired: form.approvalRequired,
        approvalThresholdPercent: form.approvalThresholdPercent === "" ? null : Number(form.approvalThresholdPercent),
        approvalThresholdAmount: form.approvalThresholdAmount === "" ? null : Number(form.approvalThresholdAmount),
        cashierManualStacking: form.cashierManualStacking,
      });
      toast.success("Settings saved");
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Promotion settings" size="md">
      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-5">
          <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3">
            <span>
              <span className="block text-sm font-bold text-slate-800">Require approval for deep discounts</span>
              <span className="block text-xs text-slate-500">
                A promotion at or over the threshold waits for a second admin. Someone other than whoever submitted it.
              </span>
            </span>
            <input
              type="checkbox" checked={form.approvalRequired}
              onChange={(event) => update("approvalRequired", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          {form.approvalRequired && (
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="text-xs font-medium text-slate-600">Deepest cut of at least (%)</span>
                <input
                  type="number" min="0" max="100" step="0.5" placeholder="e.g. 30"
                  value={form.approvalThresholdPercent}
                  onChange={(event) => update("approvalThresholdPercent", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">Or a flat amount of at least</span>
                <input
                  type="number" min="0" step="0.01" placeholder="e.g. 1000"
                  value={form.approvalThresholdAmount}
                  onChange={(event) => update("approvalThresholdAmount", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}

          <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3">
            <span>
              <span className="block text-sm font-bold text-slate-800">Cashiers can discount a promoted line</span>
              <span className="block text-xs text-slate-500">
                Off means only a manager or admin may add a manual discount on top of a promotion.
              </span>
            </span>
            <input
              type="checkbox" checked={form.cashierManualStacking}
              onChange={(event) => update("cashierManualStacking", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PromotionSettingsModal;
