import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react";

import { loyaltyAPI } from "../../api/loyalty.api";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

const EMPTY_TIER = { name: "", minLifetimePoints: 0, earnMultiplier: 1, sortOrder: 0, active: true };

/**
 * The loyalty scheme: whether it runs, at what rates, and the tier ladder.
 *
 * <p>The two rates are shown side by side with the effective return spelled out underneath,
 * because that number is the whole cost of the scheme and it is not obvious from either rate on
 * its own — earning a point per rupee and spending them back at 0.25 is a 25% giveaway.
 */
const LoyaltySettingsPage = () => {
  const { user } = useAuth();
  const canEdit = hasPermission(user?.role, "MANAGE_LOYALTY_SETTINGS");

  const [settings, setSettings] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTier, setNewTier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, tiersRes] = await Promise.all([loyaltyAPI.settings(), loyaltyAPI.tiers()]);
      setSettings({
        enabled: !!settingsRes.data?.enabled,
        pointsPerCurrency: settingsRes.data?.pointsPerCurrency ?? 1,
        currencyPerPoint: settingsRes.data?.currencyPerPoint ?? 1,
        minRedemptionPoints: settingsRes.data?.minRedemptionPoints ?? 0,
        maxRedemptionPercent: settingsRes.data?.maxRedemptionPercent ?? "",
        roundEarnedDown: settingsRes.data?.roundEarnedDown !== false,
      });
      setTiers(Array.isArray(tiersRes.data) ? tiersRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load loyalty settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  // Earn one point per rupee and give it back at 0.25 and the scheme costs 25% of turnover.
  // Neither rate says that on its own, so the page says it.
  const returnRate = useMemo(() => {
    const earn = Number(settings?.pointsPerCurrency);
    const spend = Number(settings?.currencyPerPoint);
    if (!Number.isFinite(earn) || !Number.isFinite(spend) || earn <= 0 || spend <= 0) return null;
    return earn * spend * 100;
  }, [settings]);

  const save = async () => {
    try {
      setSaving(true);
      await loyaltyAPI.updateSettings({
        enabled: settings.enabled,
        pointsPerCurrency: Number(settings.pointsPerCurrency),
        currencyPerPoint: Number(settings.currencyPerPoint),
        minRedemptionPoints: Number(settings.minRedemptionPoints) || 0,
        maxRedemptionPercent: settings.maxRedemptionPercent === "" ? null : Number(settings.maxRedemptionPercent),
        roundEarnedDown: settings.roundEarnedDown,
      });
      toast.success("Loyalty settings saved");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveTier = async (tier) => {
    try {
      const payload = {
        name: tier.name?.trim(),
        minLifetimePoints: Number(tier.minLifetimePoints) || 0,
        earnMultiplier: Number(tier.earnMultiplier),
        sortOrder: Number(tier.sortOrder) || 0,
        active: tier.active !== false,
      };
      if (tier.id) await loyaltyAPI.updateTier(tier.id, payload);
      else await loyaltyAPI.createTier(payload);
      toast.success(tier.id ? "Tier updated" : "Tier added");
      setNewTier(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save tier");
    }
  };

  const removeTier = async (tier) => {
    try {
      await loyaltyAPI.deleteTier(tier.id);
      toast.success("Tier removed");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove tier");
    }
  };

  if (loading || !settings) {
    return <div className="py-16"><LoadingSpinner size="lg" text="Loading…" /></div>;
  }

  const tierRow = (tier, onChange, onCommit, onRemove) => (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-2">
      <label>
        <span className="text-xs font-medium text-slate-600">Name</span>
        <input
          value={tier.name} disabled={!canEdit}
          onChange={(event) => onChange({ ...tier, name: event.target.value })}
          placeholder="Gold"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label>
        <span className="text-xs font-medium text-slate-600">From lifetime points</span>
        <input
          type="number" min="0" step="1" value={tier.minLifetimePoints} disabled={!canEdit}
          onChange={(event) => onChange({ ...tier, minLifetimePoints: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label>
        <span className="text-xs font-medium text-slate-600">Earn multiplier</span>
        <input
          type="number" min="0" step="0.1" value={tier.earnMultiplier} disabled={!canEdit}
          onChange={(event) => onChange({ ...tier, earnMultiplier: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <Button size="sm" onClick={onCommit} disabled={!canEdit || !tier.name?.trim()}>Save</Button>
      {onRemove && <Button size="sm" variant="danger" onClick={onRemove} disabled={!canEdit} aria-label="Remove tier"><Trash2 size={14} /></Button>}
    </div>
  );

  return (
    <div className="page-enter space-y-6 pb-10">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-800">
          <Sparkles size={26} className="text-violet-600" /> Loyalty
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Points customers earn on a sale and spend against a later one.
        </p>
      </div>

      <Card className="admin-panel-card" title="Scheme">
        <div className="space-y-5">
          <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3">
            <span>
              <span className="block text-sm font-bold text-slate-800">Run a loyalty scheme</span>
              <span className="block text-xs text-slate-500">
                While this is off, nothing is earned and nothing can be spent.
              </span>
            </span>
            <input
              type="checkbox" checked={settings.enabled} disabled={!canEdit}
              onChange={(event) => update("enabled", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">Points earned per 1.00 spent</span>
              <input
                type="number" min="0" step="0.01" value={settings.pointsPerCurrency} disabled={!canEdit}
                onChange={(event) => update("pointsPerCurrency", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Value of 1 point when spent</span>
              <input
                type="number" min="0" step="0.01" value={settings.currencyPerPoint} disabled={!canEdit}
                onChange={(event) => update("currencyPerPoint", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          {returnRate != null && (
            <p className={`rounded-lg px-3 py-2 text-sm ${returnRate >= 10 ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}>
              This gives back <strong>{returnRate.toFixed(1)}%</strong> of what customers spend.
              {returnRate >= 10 && " That is a large scheme. Check it is what you meant."}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="text-sm font-medium text-slate-700">Minimum points to redeem</span>
              <input
                type="number" min="0" step="1" placeholder="No minimum"
                value={settings.minRedemptionPoints} disabled={!canEdit}
                onChange={(event) => update("minRedemptionPoints", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Most of a bill points may cover (%)</span>
              <input
                type="number" min="0" max="100" step="1" placeholder="The whole bill"
                value={settings.maxRedemptionPercent} disabled={!canEdit}
                onChange={(event) => update("maxRedemptionPercent", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">Round earned points down</span>
              <input
                type="checkbox" checked={settings.roundEarnedDown} disabled={!canEdit}
                onChange={(event) => update("roundEarnedDown", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
            </label>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                <Save size={16} className="mr-2" />{saving ? "Saving…" : "Save scheme"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card
        className="admin-panel-card"
        title="Tiers"
        action={canEdit && !newTier ? <Button size="sm" onClick={() => setNewTier({ ...EMPTY_TIER })}><Plus size={14} className="mr-1" />Add tier</Button> : null}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            A customer is on the highest tier their <strong>lifetime</strong> points have reached, and
            its multiplier applies to what they earn next. Lifetime, not the current balance. So
            spending points never demotes anyone.
          </p>
          {tiers.length === 0 && !newTier && (
            <p className="text-sm text-slate-500">No tiers. Everyone earns at the base rate.</p>
          )}
          {tiers.map((tier) => tierRow(
            tier,
            (next) => setTiers((prev) => prev.map((row) => (row.id === tier.id ? next : row))),
            () => saveTier(tiers.find((row) => row.id === tier.id)),
            () => setDeleteTarget(tier),
          ))}
          {newTier && tierRow(newTier, setNewTier, () => saveTier(newTier), () => setNewTier(null))}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => removeTier(deleteTarget)}
        title="Remove tier"
        icon={Trash2}
        message={`Remove "${deleteTarget?.name}"?`}
        detail="Customers on it drop to the next tier down. Their points are not affected."
        confirmLabel="Remove"
      />
    </div>
  );
};

export default LoyaltySettingsPage;
