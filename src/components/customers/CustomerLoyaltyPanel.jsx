import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Sparkles } from "lucide-react";

import { loyaltyAPI } from "../../api/loyalty.api";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/formatters";
import { hasPermission } from "../../utils/permissions";

const TYPE_LABELS = {
  EARN: "Earned",
  REDEEM: "Spent",
  ADJUST: "Adjusted",
  REVERSAL: "Reversed",
};

/**
 * One customer's points: what they have, how they got there, and a way to correct it.
 *
 * <p>Renders nothing when the shop does not run loyalty, so a scheme that is switched off does
 * not leave an empty panel on every customer.
 */
const CustomerLoyaltyPanel = ({ customerId }) => {
  const { user } = useAuth();
  const canAdjust = hasPermission(user?.role, "MANAGE_LOYALTY");

  const [account, setAccount] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const accountRes = await loyaltyAPI.account(customerId);
      setAccount(accountRes.data);
      if (accountRes.data?.enabled && canAdjust) {
        const historyRes = await loyaltyAPI.history(customerId);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      }
    } catch (error) {
      console.error("Failed to load loyalty", error);
    } finally {
      setLoading(false);
    }
  }, [customerId, canAdjust]);

  useEffect(() => { load(); }, [load]);

  const adjust = async () => {
    const points = parseInt(adjustPoints, 10);
    if (!Number.isFinite(points) || points === 0) {
      toast.error("Enter a number of points to add or take away");
      return;
    }
    try {
      setSaving(true);
      await loyaltyAPI.adjust(customerId, { points, note: adjustNote.trim() || null });
      toast.success(points > 0 ? `${points} points added` : `${Math.abs(points)} points taken back`);
      setAdjustOpen(false);
      setAdjustPoints("");
      setAdjustNote("");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to adjust points");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-6 text-sm text-slate-500">Loading points…</div>;
  if (!account?.enabled) {
    return <div className="py-6 text-sm text-slate-500">This shop does not run a loyalty scheme.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="flex items-center gap-1 text-xs font-bold uppercase text-violet-700">
            <Sparkles size={12} /> Points
          </p>
          <p className="mt-2 text-2xl font-black text-violet-900">{account.pointsBalance}</p>
          <p className="text-xs text-violet-700">worth {formatCurrency(account.pointsValue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Tier</p>
          <p className="mt-2 text-2xl font-black text-slate-800">{account.tierName || "-"}</p>
          {account.earnMultiplier && Number(account.earnMultiplier) !== 1 && (
            <p className="text-xs text-slate-500">earns {Number(account.earnMultiplier)}×</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Lifetime</p>
          <p className="mt-2 text-2xl font-black text-slate-800">{account.lifetimePoints}</p>
          <p className="text-xs text-slate-500">what the tier is measured on</p>
        </div>
      </div>

      {canAdjust && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setAdjustOpen(true)}>Adjust points</Button>
        </div>
      )}

      {canAdjust && (
        <div className="app-table-wrap">
          <table className="app-table min-w-[560px]">
            <thead className="app-table-head">
              <tr>
                <th className="app-table-head-cell">When</th>
                <th className="app-table-head-cell">What</th>
                <th className="app-table-head-cell text-right">Points</th>
                <th className="app-table-head-cell text-right">Balance</th>
                <th className="app-table-head-cell">Note</th>
              </tr>
            </thead>
            <tbody className="app-table-body">
              {history.length === 0 ? (
                <tr><td colSpan="5" className="app-table-empty">Nothing yet.</td></tr>
              ) : history.map((row) => (
                <tr key={row.id} className={row.reversed ? "opacity-50" : undefined}>
                  <td className="app-table-cell text-xs text-slate-600">
                    {row.at ? new Date(row.at).toLocaleString() : "-"}
                  </td>
                  <td className="app-table-cell">
                    {TYPE_LABELS[row.type] || row.type}
                    {row.reversed && <span className="ml-1 text-xs text-slate-500">(reversed)</span>}
                  </td>
                  <td className={`app-table-cell text-right font-bold ${row.points < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {row.points > 0 ? `+${row.points}` : row.points}
                  </td>
                  <td className="app-table-cell text-right text-slate-600">{row.balanceAfter}</td>
                  <td className="app-table-cell text-xs text-slate-500">{row.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust points" size="sm">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Points</span>
            <input
              type="number" value={adjustPoints}
              onChange={(event) => setAdjustPoints(event.target.value)}
              placeholder="e.g. 100, or -50 to take back"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Positive adds and counts towards their tier. Negative takes points back.
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reason</span>
            <input
              value={adjustNote}
              onChange={(event) => setAdjustNote(event.target.value)}
              placeholder="Goodwill after a complaint"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={adjust} disabled={saving}>{saving ? "Saving…" : "Apply"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerLoyaltyPanel;
