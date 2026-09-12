import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Plus, RefreshCw, Trash2, Users } from "lucide-react";

import { promotionsAPI } from "../../api/promotions.api";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Modal from "../../components/common/Modal";
import { formatCurrency } from "../../utils/formatters";

const EMPTY = {
  name: "",
  description: "",
  minTotalSpend: "",
  minOrderCount: "",
  minAvgOrderValue: "",
  purchasedWithinDays: "",
  inactiveForDays: "",
  active: true,
};

/**
 * Customer segments — the rules a promotion targets instead of a list of names.
 *
 * <p>Membership is a snapshot, not a live query: the rules are aggregates over every completed
 * order, which is not something to run at a till. The screen says when each was last worked out
 * and offers to redo it, rather than implying the count is current to the second.
 */
const CustomerSegmentsPage = () => {
  const navigate = useNavigate();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await promotionsAPI.segments();
      setSegments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load segments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setEditing((prev) => ({ ...prev, [key]: value }));

  const numberOrNull = (value) => (value === "" || value == null ? null : Number(value));

  const save = async () => {
    const payload = {
      name: editing.name?.trim(),
      description: editing.description?.trim() || null,
      minTotalSpend: numberOrNull(editing.minTotalSpend),
      minOrderCount: numberOrNull(editing.minOrderCount),
      minAvgOrderValue: numberOrNull(editing.minAvgOrderValue),
      purchasedWithinDays: numberOrNull(editing.purchasedWithinDays),
      inactiveForDays: numberOrNull(editing.inactiveForDays),
      active: editing.active !== false,
    };
    try {
      setBusy(true);
      const saved = editing.id
        ? await promotionsAPI.updateSegment(editing.id, payload)
        : await promotionsAPI.createSegment(payload);
      toast.success(`"${saved.data.name}" matches ${saved.data.memberCount} customer${saved.data.memberCount === 1 ? "" : "s"}`);
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save segment");
    } finally {
      setBusy(false);
    }
  };

  const recompute = async (segment) => {
    try {
      setBusy(true);
      const response = await promotionsAPI.recomputeSegment(segment.id);
      toast.success(`${response.data.memberCount} customer${response.data.memberCount === 1 ? "" : "s"} in "${segment.name}"`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to recompute");
    } finally {
      setBusy(false);
    }
  };

  const recomputeAll = async () => {
    try {
      setBusy(true);
      await promotionsAPI.recomputeSegments();
      toast.success("All segments refreshed");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to refresh");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (segment) => {
    try {
      await promotionsAPI.deleteSegment(segment.id);
      toast.success("Segment removed");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove segment");
    }
  };

  /** The rules in the words an operator would use, so the table is readable without the form. */
  const describe = (segment) => {
    const parts = [];
    if (segment.minTotalSpend) parts.push(`spent ${formatCurrency(segment.minTotalSpend)}+`);
    if (segment.minOrderCount) parts.push(`${segment.minOrderCount}+ orders`);
    if (segment.minAvgOrderValue) parts.push(`avg ${formatCurrency(segment.minAvgOrderValue)}+`);
    if (segment.purchasedWithinDays) parts.push(`bought in ${segment.purchasedWithinDays} days`);
    if (segment.inactiveForDays) parts.push(`quiet ${segment.inactiveForDays}+ days`);
    return parts.length ? parts.join(" · ") : "-";
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/promotions")}>
            <ArrowLeft size={15} />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Users size={22} className="text-blue-600" /> Customer Segments
            </h1>
            <p className="text-sm text-slate-500">
              Rules a promotion can target, instead of picking customers one by one.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={recomputeAll} disabled={busy || segments.length === 0}>
            <RefreshCw size={16} className="mr-2" /> Refresh all
          </Button>
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={16} className="mr-2" /> New segment
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="py-12"><LoadingSpinner size="lg" text="Loading segments..." /></div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table min-w-[820px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Segment</th>
                  <th className="app-table-head-cell">Rules</th>
                  <th className="app-table-head-cell text-right">Members</th>
                  <th className="app-table-head-cell">Last worked out</th>
                  <th className="app-table-head-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {segments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="app-table-empty">
                      No segments yet. Create one and a customer promotion can target it.
                    </td>
                  </tr>
                ) : segments.map((segment) => (
                  <tr key={segment.id} className={segment.active ? undefined : "opacity-60"}>
                    <td className="app-table-cell">
                      <div className="font-semibold text-slate-800">{segment.name}</div>
                      {segment.description && <div className="text-xs text-slate-500">{segment.description}</div>}
                      {!segment.active && <div className="text-xs text-slate-500">Inactive</div>}
                    </td>
                    <td className="app-table-cell text-xs text-slate-600">{describe(segment)}</td>
                    <td className="app-table-cell text-right font-bold text-slate-800">{segment.memberCount}</td>
                    <td className="app-table-cell text-xs text-slate-500">
                      {segment.lastEvaluatedAt ? new Date(segment.lastEvaluatedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="app-table-cell">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => recompute(segment)}
                                disabled={busy} aria-label="Recompute">
                          <RefreshCw size={14} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing({
                          ...segment,
                          minTotalSpend: segment.minTotalSpend ?? "",
                          minOrderCount: segment.minOrderCount ?? "",
                          minAvgOrderValue: segment.minAvgOrderValue ?? "",
                          purchasedWithinDays: segment.purchasedWithinDays ?? "",
                          inactiveForDays: segment.inactiveForDays ?? "",
                          description: segment.description ?? "",
                        })}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(segment)} aria-label="Delete">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Membership is worked out when you save or refresh, not on every sale. The rules add up
        every completed order, which is too much to do at a till. A customer who crosses a
        threshold joins at the next refresh.
      </p>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)}
             title={editing?.id ? "Edit segment" : "New segment"} size="lg">
        {editing && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={editing.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Regulars"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Description</span>
                <input
                  value={editing.description}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="Shop here most weeks"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div>
              <span className="text-sm font-bold text-slate-800">Rules</span>
              <p className="mb-3 text-xs text-slate-500">
                A customer must satisfy every rule you set. Leave a box empty and it is not a rule.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <label>
                  <span className="text-xs font-medium text-slate-600">Spent at least (lifetime)</span>
                  <input type="number" min="0" step="0.01" placeholder="Any"
                    value={editing.minTotalSpend}
                    onChange={(event) => update("minTotalSpend", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">At least this many orders</span>
                  <input type="number" min="0" step="1" placeholder="Any"
                    value={editing.minOrderCount}
                    onChange={(event) => update("minOrderCount", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">Average order at least</span>
                  <input type="number" min="0" step="0.01" placeholder="Any"
                    value={editing.minAvgOrderValue}
                    onChange={(event) => update("minAvgOrderValue", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">Bought within (days)</span>
                  <input type="number" min="0" step="1" placeholder="Any"
                    value={editing.purchasedWithinDays}
                    onChange={(event) => update("purchasedWithinDays", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">Not bought for (days)</span>
                  <input type="number" min="0" step="1" placeholder="Any"
                    value={editing.inactiveForDays}
                    onChange={(event) => update("inactiveForDays", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">Active</span>
                  <input type="checkbox" checked={editing.active !== false}
                    onChange={(event) => update("active", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                &quot;Bought within&quot; and &quot;not bought for&quot; can be combined to find someone
                who is still shopping but has gone quiet lately. The quiet window has to be the
                shorter of the two, or nobody could ever match.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={busy || !editing.name?.trim()}>
                {busy ? "Saving…" : "Save & work out members"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove(deleteTarget)}
        title="Remove segment"
        icon={Trash2}
        message={`Remove "${deleteTarget?.name}"?`}
        detail="Any promotion targeting it stops matching through it. Customers are not affected."
        confirmLabel="Remove"
      />
    </div>
  );
};

export default CustomerSegmentsPage;
