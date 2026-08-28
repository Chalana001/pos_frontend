// src/pages/SaleReturnPage.jsx
// Phase 3 — Full partial return/refund UI
// Route: /sales/:id/return  (id = invoiceNo)
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { salesAPI } from "../api/sales.api";
import { returnsAPI } from "../api/returns.api";
import { receiptSettingsAPI } from "../api/receiptSettings.api";
import ReturnReceiptPrinter from "../components/pos/ReturnReceiptPrinter";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CustomSelect from "../components/common/CustomSelect";
import { useAuth } from "../context/AuthContext";
import { BRAND_NAME_UPPER } from "../utils/branding";
import {
  ArrowLeft,
  RotateCcw,
  Package,
  CheckCircle,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatQuantityWithUnit } from "../utils/formatters";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const REFUND_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "STORE_CREDIT", label: "Store Credit" },
];

// ─── component ──────────────────────────────────────────────────────────────

const SaleReturnPage = () => {
  const { id: invoiceNo } = useParams(); // :id is the invoiceNo
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── data ──────────────────────────────────────────────────────────────────
  const [sale, setSale] = useState(null);
  const [existingReturns, setExistingReturns] = useState([]);
  const [receiptSettings, setReceiptSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── form state ────────────────────────────────────────────────────────────
  // returnQtys: { [orderItemId]: number }  — qty the cashier wants to return
  const [returnQtys, setReturnQtys] = useState({});
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [reason, setReason] = useState("");
  const [cashierNote, setCashierNote] = useState("");

  // ── submission ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReturn, setSuccessReturn] = useState(null); // OrderReturnResponse

  // ── print ─────────────────────────────────────────────────────────────────
  const returnPrinterRef = useRef(null);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [invoiceNo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [saleRes, returnsRes] = await Promise.all([
        salesAPI.getById(invoiceNo),
        returnsAPI.listByInvoice(invoiceNo).catch(() => ({ data: [] })),
      ]);
      setSale(saleRes.data);
      setExistingReturns(returnsRes.data || []);

      if (saleRes.data?.branchId) {
        receiptSettingsAPI
          .getByBranch(saleRes.data.branchId)
          .then((r) => setReceiptSettings(r.data))
          .catch(() => setReceiptSettings(null));
      }
    } catch (err) {
      console.error("Failed to load sale", err);
      toast.error("Failed to load sale details");
    } finally {
      setLoading(false);
    }
  };

  // ── helpers: how many of each item were already returned ──────────────────
  const alreadyReturnedMap = React.useMemo(() => {
    const map = {};
    existingReturns.forEach((ret) =>
      ret.items?.forEach((ri) => {
        map[ri.orderItemId] = (map[ri.orderItemId] || 0) + ri.returnQty;
      })
    );
    return map;
  }, [existingReturns]);

  const maxReturnableQty = (item) =>
    Math.max(0, item.qty - (alreadyReturnedMap[item.id] || 0));

  // ── qty change ────────────────────────────────────────────────────────────
  const setQtyForItem = (orderItemId, value) => {
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    setReturnQtys((prev) => ({ ...prev, [orderItemId]: parsed }));
  };

  const toggleSelectAll = () => {
    if (!sale) return;
    const alreadyAllSelected = sale.items.every(
      (item) => (returnQtys[item.id] || 0) === maxReturnableQty(item)
    );
    if (alreadyAllSelected) {
      setReturnQtys({});
    } else {
      const newQtys = {};
      sale.items.forEach((item) => {
        const max = maxReturnableQty(item);
        if (max > 0) newQtys[item.id] = max;
      });
      setReturnQtys(newQtys);
    }
  };

  // ── compute refund preview ─────────────────────────────────────────────────
  const selectedLines = React.useMemo(() => {
    if (!sale) return [];
    return sale.items
      .map((item) => ({
        item,
        returnQty: returnQtys[item.id] || 0,
        refundLine: (returnQtys[item.id] || 0) * item.finalUnitPrice,
      }))
      .filter((l) => l.returnQty > 0);
  }, [sale, returnQtys]);

  const totalRefund = selectedLines.reduce((s, l) => s + l.refundLine, 0);

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selectedLines.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    if (!reason.trim()) {
      toast.error("Return reason is required");
      return;
    }

    const payload = {
      reason: reason.trim(),
      refundMethod,
      cashierNote: cashierNote.trim() || null,
      items: selectedLines.map((l) => ({
        orderItemId: l.item.id,
        returnQty: l.returnQty,
      })),
    };

    try {
      setIsSubmitting(true);
      const res = await returnsAPI.processReturn(invoiceNo, payload);
      setSuccessReturn(res.data);
      toast.success(`Return ${res.data.returnNo} processed successfully!`);
    } catch (err) {
      console.error("Return failed", err);
      toast.error(err.response?.data?.message || "Failed to process return");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── print return receipt ───────────────────────────────────────────────────
  const handlePrintReturn = (returnData) => {
    if (!returnData || !returnPrinterRef.current) return;
    const storeName = user?.shopName || BRAND_NAME_UPPER;
    const returnWithBranch = {
      ...returnData,
      branchName: sale?.branchName,
      branchAddress: sale?.branchAddress,
      branchPhone: sale?.branchPhone,
      branchLogo: sale?.branchLogo,
    };
    returnPrinterRef.current.printReturn(returnWithBranch, storeName, receiptSettings);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">Loading sale details…</div>
    );
  }
  if (!sale) {
    return (
      <div className="p-10 text-center text-red-500">Sale not found.</div>
    );
  }

  const isCanceled = sale.status === "CANCELED";

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (successReturn) {
    return (
      <div className="page-enter space-y-6 pb-20 max-w-2xl mx-auto">
        <ReturnReceiptPrinter ref={returnPrinterRef} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => navigate(`/sales/${invoiceNo}`)}>
            <ArrowLeft size={18} className="mr-2" /> Back to Sale
          </Button>
          <Button
            className="bg-slate-800 text-white hover:bg-slate-700 shadow-sm"
            onClick={() => handlePrintReturn(successReturn)}
          >
            <Printer size={18} className="mr-2" /> Print Return Receipt
          </Button>
        </div>

        {/* Success card */}
        <Card className="p-8 border-t-4 border-t-emerald-500 shadow-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle size={56} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Return Processed!</h2>
          <p className="text-slate-500 mb-6">
            Return receipt{" "}
            <span className="font-mono font-bold text-slate-700">
              {successReturn.returnNo}
            </span>{" "}
            has been created.
          </p>

          {/* Summary table */}
          <div className="text-left rounded-xl border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              Returned Items
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Refund</th>
                  <th className="px-4 py-2 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {successReturn.items.map((ri) => (
                  <tr key={ri.id}>
                    <td className="px-4 py-2 text-slate-700 font-medium">{ri.itemName}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{ri.returnQty}</td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {fmt(ri.refundLineAmount)} LKR
                    </td>
                    <td className="px-4 py-2 text-center">
                      {ri.stockReversed ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                          Reversed
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          Skipped
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-sm">
                    Total Refund
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">
                    {fmt(successReturn.totalRefundAmount)} LKR
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm text-left">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-600 uppercase mb-1">Refund Method</div>
              <div className="font-semibold text-slate-700">
                {REFUND_METHOD_OPTIONS.find((o) => o.value === successReturn.refundMethod)?.label ||
                  successReturn.refundMethod}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-600 uppercase mb-1">Reason</div>
              <div className="font-semibold text-slate-700">{successReturn.reason}</div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              setSuccessReturn(null);
              setReturnQtys({});
              setReason("");
              setCashierNote("");
              loadData();
            }}
          >
            <RotateCcw size={16} className="mr-2" /> Process Another Return
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            onClick={() => navigate(`/sales/${invoiceNo}`)}
          >
            Back to Sale Details
          </Button>
        </div>
      </div>
    );
  }

  // ── MAIN RETURN FORM ─────────────────────────────────────────────────────
  const anyItemsReturnable = sale.items?.some((item) => maxReturnableQty(item) > 0);

  return (
    <div className="page-enter space-y-6 pb-20">
      <ReturnReceiptPrinter ref={returnPrinterRef} />

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate(`/sales/${invoiceNo}`)}>
          <ArrowLeft size={18} className="mr-2" /> Back to Sale
        </Button>
        <div className="flex items-center gap-2">
          <RotateCcw size={20} className="text-orange-500" />
          <h1 className="text-lg font-bold text-slate-800">Process Return</h1>
        </div>
      </div>

      {/* ── Canceled warning ── */}
      {isCanceled && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertTriangle size={20} className="shrink-0" />
          This order has been canceled. Returns cannot be processed for canceled orders.
        </div>
      )}

      {/* ── Invoice summary ── */}
      <Card className="p-5 border-t-4 border-t-orange-400 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="text-xs text-slate-600 uppercase font-semibold mb-1">Invoice</div>
            <div className="text-xl font-bold font-mono text-slate-800">{sale.invoiceNo}</div>
            <div className="text-xs text-slate-500 mt-1">
              {new Date(sale.createdAt).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Customer:{" "}
              <span className="font-semibold text-slate-700">
                {sale.customerName || "Walk-in Customer"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-600 uppercase font-semibold mb-1">Grand Total</div>
            <div className="text-2xl font-bold text-slate-800">{fmt(sale.grandTotal)} LKR</div>
            {existingReturns.length > 0 && (
              <div className="mt-1 text-xs text-orange-600 font-semibold">
                {existingReturns.length} existing return{existingReturns.length > 1 ? "s" : ""} on
                this invoice
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Existing returns history ── */}
      {existingReturns.length > 0 && (
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
            <RotateCcw size={15} className="text-orange-500" />
            <span className="text-sm font-semibold text-orange-700">Previous Returns</span>
          </div>
          <div className="divide-y divide-slate-100">
            {existingReturns.map((ret) => (
              <div key={ret.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono font-bold text-slate-700">{ret.returnNo}</span>
                  <span className="ml-3 text-slate-500 text-xs">
                    {new Date(ret.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {ret.refundMethod}
                  </span>
                  <span className="font-bold text-red-600">
                    - {fmt(ret.totalRefundAmount)} LKR
                  </span>
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => handlePrintReturn(ret)}
                    aria-label="Print return receipt"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Items selection ── */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Select Items to Return</span>
          </div>
          {anyItemsReturnable && !isCanceled && (
            <button
              className="text-xs text-blue-600 hover:underline font-medium"
              onClick={toggleSelectAll}
            >
              {sale.items.every(
                (item) => (returnQtys[item.id] || 0) === maxReturnableQty(item)
              )
                ? "Deselect All"
                : "Select All"}
            </button>
          )}
        </div>

        <div className="app-table-wrap">
          <table className="app-table">
            <thead className="app-table-head">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4 text-center">Original Qty</th>
                <th className="p-4 text-center">Already Returned</th>
                <th className="p-4 text-center">Max Returnable</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-center w-36">Return Qty</th>
                <th className="p-4 text-right pr-6">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items?.map((item) => {
                const already = alreadyReturnedMap[item.id] || 0;
                const maxRet = maxReturnableQty(item);
                const currentQty = returnQtys[item.id] || 0;
                const refundLine = currentQty * item.finalUnitPrice;
                const fullyReturned = maxRet === 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      fullyReturned ? "opacity-50" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{item.itemName}</div>
                      {item.barcode && (
                        <div className="text-xs text-slate-600 font-mono">{item.barcode}</div>
                      )}
                      {fullyReturned && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                          Fully Returned
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center text-slate-600">
                      {formatQuantityWithUnit(item.qty, item.qtyUnit)}
                    </td>
                    <td className="p-4 text-center">
                      {already > 0 ? (
                        <span className="text-orange-600 font-semibold">{already}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-700">{maxRet}</td>
                    <td className="p-4 text-right text-slate-600">
                      {fmt(item.finalUnitPrice)}
                    </td>
                    <td className="p-4 text-center">
                      {fullyReturned || isCanceled ? (
                        <span className="text-slate-600 text-sm">—</span>
                      ) : (
                        <input aria-label="Return quantity"
                          type="number"
                          min={0}
                          max={maxRet}
                          value={currentQty || ""}
                          onChange={(e) => setQtyForItem(item.id, e.target.value)}
                          placeholder="0"
                          className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-orange-400 ${
                            currentQty > 0
                              ? "border-orange-400 bg-orange-50 font-bold"
                              : "border-slate-300 bg-white"
                          }`}
                        />
                      )}
                    </td>
                    <td className="p-4 text-right pr-6">
                      {currentQty > 0 ? (
                        <span className="font-bold text-red-600">
                          -{fmt(refundLine)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Refund summary + form ── */}
      {!isCanceled && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Return details form */}
          <Card className="p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Return Details
            </h3>

            {/* Refund method */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Refund Method <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={refundMethod}
                onChange={setRefundMethod}
                options={REFUND_METHOD_OPTIONS}
                buttonClassName="py-2"
              />
              {refundMethod === "STORE_CREDIT" && sale.orderType !== "CREDIT" && (
                <p className="text-xs text-amber-600 mt-1">
                  Store Credit applies to credit orders only. Customer due amount will be reduced.
                </p>
              )}
              {refundMethod === "STORE_CREDIT" && sale.orderType === "CREDIT" && (
                <p className="text-xs text-emerald-600 mt-1">
                  Customer due amount will be reduced by the refund amount.
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Return Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer received wrong item, duplicate purchase, damaged product…"
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-600"
              />
            </div>

            {/* Cashier note (optional) */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Cashier Note{" "}
                <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={cashierNote}
                onChange={(e) => setCashierNote(e.target.value)}
                placeholder="Internal note for manager reference…"
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-orange-400 placeholder:text-slate-600"
              />
            </div>
          </Card>

          {/* Right: Refund summary */}
          <Card className="p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">
              Refund Summary
            </h3>

            {selectedLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                <Package size={32} className="opacity-40" />
                <span className="text-sm">No items selected yet</span>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-5">
                  {selectedLines.map(({ item, returnQty, refundLine }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="text-slate-700 truncate max-w-[60%]">
                        {item.itemName}{" "}
                        <span className="text-slate-600 font-mono">×{returnQty}</span>
                      </div>
                      <div className="font-semibold text-red-600">
                        -{fmt(refundLine)} LKR
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Total Refund</span>
                    <span className="text-2xl font-bold text-red-600">
                      {fmt(totalRefund)} LKR
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    via{" "}
                    {REFUND_METHOD_OPTIONS.find((o) => o.value === refundMethod)?.label ||
                      refundMethod}
                  </div>
                </div>
              </>
            )}

            {/* Submit */}
            <div className="mt-6">
              <Button
                className={`w-full py-3 text-base font-bold shadow-md transition-all ${
                  selectedLines.length > 0 && reason.trim()
                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
                    : "bg-slate-200 text-slate-600 cursor-not-allowed"
                }`}
                onClick={handleSubmit}
                disabled={isSubmitting || selectedLines.length === 0 || !reason.trim()}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing Return…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <RotateCcw size={18} />
                    Confirm Return &amp; Refund
                  </span>
                )}
              </Button>

              {(selectedLines.length === 0 || !reason.trim()) && (
                <p className="text-xs text-slate-600 text-center mt-2">
                  {selectedLines.length === 0
                    ? "Enter return quantities above to enable"
                    : "Return reason is required"}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SaleReturnPage;
