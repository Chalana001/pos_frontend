import React, { useEffect, useState } from "react";
import { History } from "lucide-react";

import { promotionsAPI } from "../../../api/promotions.api";

const LABELS = {
  CREATED: "Created",
  UPDATED: "Edited",
  SUBMITTED: "Sent for approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ACTIVATED: "Activated",
  PAUSED: "Paused",
  RESUMED: "Resumed",
  ARCHIVED: "Retired",
  DUPLICATED: "Created as a copy",
};

const TONES = {
  APPROVED: "text-emerald-700",
  ACTIVATED: "text-emerald-700",
  RESUMED: "text-emerald-700",
  REJECTED: "text-red-700",
  PAUSED: "text-amber-700",
  ARCHIVED: "text-slate-500",
  SUBMITTED: "text-violet-700",
};

/** Who did what to this promotion, newest first. */
const PromotionAuditPanel = ({ promotionId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await promotionsAPI.audit(promotionId);
        if (!cancelled) setRows(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load promotion activity", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [promotionId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <History size={14} /> Activity
      </h2>
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">Nothing recorded yet.</div>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="w-36 shrink-0 text-xs text-slate-500">
                {row.at ? new Date(row.at).toLocaleString() : "-"}
              </span>
              <span className={`font-semibold ${TONES[row.action] || "text-slate-800"}`}>
                {LABELS[row.action] || row.action}
              </span>
              <span className="text-slate-600">by {row.username || "-"}</span>
              {row.note && <span className="text-slate-500">, {row.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default PromotionAuditPanel;
