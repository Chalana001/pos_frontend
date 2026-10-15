import React, { useEffect, useState } from "react";
import { Coins, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import Button from "../common/Button";
import { shiftsAPI } from "../../api/shifts.api";
import { hasShopModule } from "../../utils/subscriptionFeatures";

const DEFAULT_SETTINGS = {
  enabled: false,
  denominations: [5000, 2000, 1000, 500, 100, 50, 20, 10, 5, 2, 1],
};

const formatRupees = (value) => `Rs ${Number(value).toLocaleString("en-LK")}`;

const ShiftCashCountSettings = () => {
  const featureEnabled = hasShopModule("SHIFTS_DENOMINATION_COUNT");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [newDenomination, setNewDenomination] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!featureEnabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    shiftsAPI.getCashCountSettings()
      .then(({ data }) => {
        if (!cancelled) {
          setLoadError(false);
          setSettings({
            enabled: data?.enabled === true,
            denominations: Array.isArray(data?.denominations) && data.denominations.length
              ? [...data.denominations].sort((a, b) => b - a)
              : DEFAULT_SETTINGS.denominations,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          toast.error("Could not load cash count settings");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [featureEnabled]);

  if (!featureEnabled) return null;

  const addDenomination = () => {
    const amount = Number(newDenomination);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      toast.error("Enter a whole amount between Rs 1 and Rs 1,000,000");
      return;
    }
    if (settings.denominations.includes(amount)) {
      toast.error("That denomination is already on the list");
      return;
    }
    if (settings.denominations.length >= 30) {
      toast.error("You can add up to 30 denominations");
      return;
    }
    setSettings((current) => ({
      ...current,
      denominations: [...current.denominations, amount].sort((a, b) => b - a),
    }));
    setNewDenomination("");
  };

  const removeDenomination = (amount) => {
    if (settings.denominations.length <= 1) {
      toast.error("Keep at least one denomination");
      return;
    }
    setSettings((current) => ({
      ...current,
      denominations: current.denominations.filter((value) => value !== amount),
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await shiftsAPI.updateCashCountSettings(settings);
      setSettings({ enabled: data.enabled, denominations: data.denominations });
      toast.success("Cash count settings saved");
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Could not save cash count settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-700"><Coins size={18} /></span>
          <div>
            <h3 className="font-semibold text-slate-800">Shift Cash Denominations</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Let cashiers count notes and coins at shift close. The counted cash total is calculated automatically and saved with the shift.</p>
          </div>
        </div>
        <input
          aria-label="Enable denomination counting"
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
          disabled={loading || loadError || saving}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      <div className={`mt-4 ${settings.enabled ? "" : "opacity-60"}`}>
        {loadError && <p role="alert" className="mb-3 text-sm text-red-600">Could not load the saved settings. Refresh this page before making changes.</p>}
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Available denominations</p>
          <span className="text-xs text-slate-500">Saved for this shop</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.denominations.map((amount) => (
            <span key={amount} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-1 py-1 text-sm text-slate-700">
              {formatRupees(amount)}
              <button
                type="button"
                aria-label={`Remove ${formatRupees(amount)}`}
                onClick={() => removeDenomination(amount)}
                disabled={loading || loadError || saving || settings.denominations.length <= 1}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
              ><Trash2 size={13} /></button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <label htmlFor="shift-cash-new-denomination" className="sr-only">New denomination in rupees</label>
          <input
            id="shift-cash-new-denomination"
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={newDenomination}
            onChange={(event) => setNewDenomination(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDenomination(); } }}
            className="input min-w-0 flex-1"
            placeholder="Add denomination (Rs)"
            disabled={loading || loadError || saving}
          />
          <Button type="button" variant="secondary" onClick={addDenomination} disabled={loading || loadError || saving || !newDenomination}>
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={save} disabled={loading || loadError || saving || settings.denominations.length === 0}>
          <Save size={15} className="mr-2" />{saving ? "Saving..." : "Save Cash Count Settings"}
        </Button>
      </div>
    </section>
  );
};

export default ShiftCashCountSettings;
