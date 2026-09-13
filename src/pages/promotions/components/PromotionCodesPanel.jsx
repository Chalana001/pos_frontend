import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Copy, Download, KeyRound, Plus } from "lucide-react";

import { promotionsAPI } from "../../../api/promotions.api";
import Button from "../../../components/common/Button";
import CustomSelect from "../../../components/common/CustomSelect";

const CODE_TYPES = [
  { key: "PUBLIC", label: "Public", hint: "Anyone can use it, as often as the limits allow" },
  { key: "SINGLE_USE", label: "Single use", hint: "One redemption in total" },
  { key: "PER_CUSTOMER", label: "Once per customer", hint: "Each customer once; needs a customer on the sale" },
];

const INITIAL_GENERATE = {
  mode: "NAMED",
  code: "",
  count: 50,
  prefix: "",
  codeType: "PUBLIC",
  maxRedemptions: "",
  perCustomerLimit: "",
  validFrom: "",
  validTo: "",
};

/**
 * The codes that gate a promotion. A promotion with any codes applies only when one is
 * presented at the till; with none it applies automatically.
 *
 * <p>Codes need a saved promotion to belong to, so this panel only appears in edit mode.
 */
const PromotionCodesPanel = ({ promotionId }) => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState(INITIAL_GENERATE);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await promotionsAPI.listCodes(promotionId);
      setCodes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load codes", error);
      toast.error(error?.response?.data?.message || "Failed to load codes");
    } finally {
      setLoading(false);
    }
  }, [promotionId]);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const generate = async () => {
    try {
      setGenerating(true);
      const payload = {
        code: form.mode === "NAMED" ? form.code.trim() : null,
        count: form.mode === "NAMED" ? 1 : Number(form.count) || 1,
        prefix: form.mode === "BATCH" ? form.prefix.trim() : null,
        codeType: form.codeType,
        maxRedemptions: form.maxRedemptions === "" ? null : Number(form.maxRedemptions),
        perCustomerLimit: form.perCustomerLimit === "" ? null : Number(form.perCustomerLimit),
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      const response = await promotionsAPI.generateCodes(promotionId, payload);
      const created = Array.isArray(response.data) ? response.data.length : 0;
      toast.success(created === 1 ? `Code ${response.data[0].code} created` : `${created} codes created`);
      setForm(INITIAL_GENERATE);
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create codes");
    } finally {
      setGenerating(false);
    }
  };

  const toggle = async (code) => {
    try {
      await promotionsAPI.setCodeActive(promotionId, code.id, !code.active);
      setCodes((prev) => prev.map((row) => (row.id === code.id ? { ...row, active: !code.active } : row)));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update code");
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${value} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const exportCsv = () => {
    const header = "code,type,used,max_uses,per_customer,valid_from,valid_to,active,batch";
    const rows = codes.map((row) => [
      row.code, row.codeType, row.redemptionsUsed, row.maxRedemptions ?? "",
      row.perCustomerLimit ?? "", row.validFrom ?? "", row.validTo ?? "", row.active ? "yes" : "no", row.batchId ?? "",
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `promotion-${promotionId}-codes.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => ({
    used: codes.reduce((sum, row) => sum + Number(row.redemptionsUsed || 0), 0),
    active: codes.filter((row) => row.active).length,
  }), [codes]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">6 · Promo codes</h2>
          <p className="mt-1 text-xs text-slate-500">
            {codes.length === 0
              ? "No codes. This promotion applies automatically. Add one and it will only apply when a code is presented."
              : `${codes.length} code${codes.length === 1 ? "" : "s"}, ${totals.active} active, used ${totals.used} time${totals.used === 1 ? "" : "s"}. This promotion only applies when one is presented.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!codes.length}>
            <Download size={14} className="mr-1" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowForm((prev) => !prev)}>
            <Plus size={14} className="mr-1" /> {showForm ? "Cancel" : "Add codes"}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
            {[{ key: "NAMED", label: "One named code" }, { key: "BATCH", label: "A batch of random codes" }].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => update("mode", option.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  form.mode === option.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {form.mode === "NAMED" ? (
              <label className="md:col-span-2">
                <span className="text-xs font-medium text-slate-600">Code</span>
                <input
                  value={form.code}
                  onChange={(event) => update("code", event.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
                />
              </label>
            ) : (
              <>
                <label>
                  <span className="text-xs font-medium text-slate-600">How many</span>
                  <input
                    type="number" min="1" max="5000"
                    value={form.count}
                    onChange={(event) => update("count", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">Prefix</span>
                  <input
                    value={form.prefix}
                    onChange={(event) => update("prefix", event.target.value.toUpperCase())}
                    placeholder="XMAS"
                    maxLength={8}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
                  />
                </label>
              </>
            )}
            <label className="md:col-span-2">
              <span className="text-xs font-medium text-slate-600">Type</span>
              <CustomSelect
                value={form.codeType}
                onChange={(v) => update("codeType", v)}
                options={CODE_TYPES.map((type) => ({ value: type.key, label: `${type.label}, ${type.hint}` }))}
                className="mt-1 w-full"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-slate-600">Max uses</span>
              <input
                type="number" min="1" placeholder="Unlimited"
                value={form.maxRedemptions}
                onChange={(event) => update("maxRedemptions", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-slate-600">Per customer</span>
              <input
                type="number" min="1" placeholder="Unlimited"
                value={form.perCustomerLimit}
                onChange={(event) => update("perCustomerLimit", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-slate-600">Valid from</span>
              <input
                type="datetime-local" value={form.validFrom}
                onChange={(event) => update("validFrom", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-slate-600">Valid to</span>
              <input
                type="datetime-local" value={form.validTo}
                onChange={(event) => update("validTo", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={generate} disabled={generating || (form.mode === "NAMED" && !form.code.trim())}>
              <KeyRound size={14} className="mr-1" />
              {generating ? "Creating…" : form.mode === "NAMED" ? "Create code" : `Create ${Number(form.count) || 1} codes`}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
      ) : codes.length > 0 && (
        <div className="app-table-wrap">
          <table className="app-table min-w-[720px]">
            <thead className="app-table-head">
              <tr>
                <th className="app-table-head-cell">Code</th>
                <th className="app-table-head-cell">Type</th>
                <th className="app-table-head-cell text-right">Used</th>
                <th className="app-table-head-cell">Valid</th>
                <th className="app-table-head-cell text-center">Status</th>
                <th className="app-table-head-cell" />
              </tr>
            </thead>
            <tbody className="app-table-body">
              {codes.map((row) => {
                const exhausted = row.maxRedemptions != null && row.redemptionsUsed >= row.maxRedemptions;
                return (
                  <tr key={row.id}>
                    <td className="app-table-cell font-mono font-bold text-slate-800">{row.code}</td>
                    <td className="app-table-cell text-slate-600">
                      {CODE_TYPES.find((type) => type.key === row.codeType)?.label || row.codeType}
                      {row.perCustomerLimit ? ` · ${row.perCustomerLimit}/customer` : ""}
                    </td>
                    <td className="app-table-cell text-right text-slate-700">
                      {row.redemptionsUsed}{row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ""}
                    </td>
                    <td className="app-table-cell text-xs text-slate-500">
                      {row.validFrom || row.validTo
                        ? `${row.validFrom ? new Date(row.validFrom).toLocaleDateString() : "-"}, ${row.validTo ? new Date(row.validTo).toLocaleDateString() : "-"}`
                        : "Always"}
                    </td>
                    <td className="app-table-cell text-center">
                      <button
                        type="button"
                        onClick={() => toggle(row)}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          !row.active ? "bg-slate-200 text-slate-600"
                            : exhausted ? "bg-orange-100 text-orange-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {!row.active ? "Off" : exhausted ? "Used up" : "Active"}
                      </button>
                    </td>
                    <td className="app-table-cell text-right">
                      <button
                        type="button"
                        onClick={() => copy(row.code)}
                        aria-label={`Copy ${row.code}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Copy size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PromotionCodesPanel;
