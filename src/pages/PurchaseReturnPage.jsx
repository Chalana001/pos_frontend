// src/pages/PurchaseReturnPage.jsx
// Purchase Return (Debit Note) UI
// Route: /purchases/:id/return  (:id = purchaseId)
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { purchasesAPI } from "../api/purchases.api";
import { purchaseReturnsAPI } from "../api/purchaseReturns.api";
import { receiptSettingsAPI } from "../api/receiptSettings.api";
import DebitNotePrinter from "../components/pos/DebitNotePrinter";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CustomSelect from "../components/common/CustomSelect";
import { useAuth } from "../context/AuthContext";
import { BRAND_NAME_UPPER } from "../utils/branding";
import {
  ArrowLeft, RotateCcw, Package, CheckCircle, AlertTriangle, Printer, Truck,
} from "lucide-react";
import { toast } from "react-hot-toast";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── component ─────────────────────────────────────────────────────────────────
const PurchaseReturnPage = () => {
  const { id: purchaseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // data
  const [purchase, setPurchase] = useState(null);
  const [existingReturns, setExistingReturns] = useState([]);
  const [receiptSettings, setReceiptSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // form — per GRN selection
  const [selectedGrnId, setSelectedGrnId] = useState(null);
  // returnQtys: { [grnItemId]: number }
  const [returnQtys, setReturnQtys] = useState({});
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  // submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReturn, setSuccessReturn] = useState(null);

  const debitNotePrinterRef = useRef(null);

  // ── load ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, [purchaseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchaseRes, returnsRes] = await Promise.all([
        purchasesAPI.getById(purchaseId),
        purchaseReturnsAPI.listByPurchase(purchaseId).catch(() => ({ data: [] })),
      ]);
      const p = purchaseRes.data;
      setPurchase(p);
      setExistingReturns(returnsRes.data || []);

      // Auto-select GRN if only one
      if (p?.grnList?.length === 1) {
        setSelectedGrnId(p.grnList[0].id);
      }

      // Receipt settings from first GRN branch
      const firstBranchId = p?.grnList?.[0]?.branchId;
      if (firstBranchId) {
        receiptSettingsAPI.getByBranch(firstBranchId)
          .then((r) => setReceiptSettings(r.data))
          .catch(() => setReceiptSettings(null));
      }
    } catch (err) {
      console.error("Failed to load purchase", err);
      toast.error("Failed to load purchase details");
    } finally {
      setLoading(false);
    }
  };

  // ── already returned per grnItem across all existing returns ─────────────────
  const alreadyReturnedMap = React.useMemo(() => {
    const map = {};
    existingReturns.forEach((ret) =>
      ret.items?.forEach((ri) => {
        map[ri.grnItemId] = (map[ri.grnItemId] || 0) + ri.returnQty;
      })
    );
    return map;
  }, [existingReturns]);

  const selectedGrn = React.useMemo(
    () => purchase?.grnList?.find((g) => g.id === selectedGrnId) || null,
    [purchase, selectedGrnId]
  );

  const maxReturnableQty = (grnItemId, originalQty) =>
    Math.max(0, originalQty - (alreadyReturnedMap[grnItemId] || 0));

  const setQtyForItem = (grnItemId, value) => {
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    setReturnQtys((prev) => ({ ...prev, [grnItemId]: parsed }));
  };

  const toggleSelectAll = () => {
    if (!selectedGrn) return;
    const allAtMax = selectedGrn.items.every((item) => {
      const max = maxReturnableQty(item.id, Number(item.qty));
      return (returnQtys[item.id] || 0) === max;
    });
    if (allAtMax) {
      setReturnQtys({});
    } else {
      const newQtys = {};
      selectedGrn.items.forEach((item) => {
        const max = maxReturnableQty(item.id, Number(item.qty));
        if (max > 0) newQtys[item.id] = max;
      });
      setReturnQtys(newQtys);
    }
  };

  // ── selected lines + total ───────────────────────────────────────────────────
  const selectedLines = React.useMemo(() => {
    if (!selectedGrn) return [];
    return selectedGrn.items
      .map((item) => ({
        item,
        returnQty: returnQtys[item.id] || 0,
        returnLine: (returnQtys[item.id] || 0) * Number(item.costPrice || 0),
      }))
      .filter((l) => l.returnQty > 0);
  }, [selectedGrn, returnQtys]);

  const totalReturn = selectedLines.reduce((s, l) => s + l.returnLine, 0);

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedGrnId) { toast.error("Select a GRN first"); return; }
    if (selectedLines.length === 0) { toast.error("Select at least one item"); return; }
    if (!reason.trim()) { toast.error("Return reason is required"); return; }

    const payload = {
      grnId: selectedGrnId,
      reason: reason.trim(),
      note: note.trim() || null,
      items: selectedLines.map((l) => ({
        grnItemId: l.item.id,
        returnQty: l.returnQty,
      })),
    };

    try {
      setIsSubmitting(true);
      const res = await purchaseReturnsAPI.processReturn(purchaseId, payload);
      setSuccessReturn(res.data);
      toast.success(`Debit Note ${res.data.debitNoteNo} processed!`);
    } catch (err) {
      console.error("Purchase return failed", err);
      toast.error(err.response?.data?.message || "Failed to process purchase return");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── print debit note ─────────────────────────────────────────────────────────
  const handlePrint = (returnData) => {
    if (!debitNotePrinterRef.current || !returnData) return;
    const storeName = user?.shopName || BRAND_NAME_UPPER;
    debitNotePrinterRef.current.printDebitNote(returnData, storeName, receiptSettings);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  if (loading) return <div className="p-10 text-center text-slate-500">Loading purchase details…</div>;
  if (!purchase) return <div className="p-10 text-center text-red-500">Purchase not found.</div>;

  const isCanceled = purchase.status === "CANCELED";
  const grnOptions = (purchase.grnList || []).map((g) => ({
    value: g.id,
    label: `${g.grnNo} — ${g.branchName}`,
  }));

  // ── SUCCESS SCREEN ───────────────────────────────────────────────────────────
  if (successReturn) {
    return (
      <div className="page-enter space-y-6 pb-20 max-w-2xl mx-auto">
        <DebitNotePrinter ref={debitNotePrinterRef} />

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => navigate(`/purchases/${purchaseId}`)}>
            <ArrowLeft size={18} className="mr-2" /> Back to Purchase
          </Button>
          <Button
            className="bg-slate-800 text-white hover:bg-slate-700 shadow-sm"
            onClick={() => handlePrint(successReturn)}
          >
            <Printer size={18} className="mr-2" /> Print Debit Note
          </Button>
        </div>

        <Card className="p-8 border-t-4 border-t-blue-600 shadow-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle size={56} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Purchase Return Processed!</h2>
          <p className="text-slate-500 mb-6">
            Debit Note{" "}
            <span className="font-mono font-bold text-slate-700">{successReturn.debitNoteNo}</span>{" "}
            has been created.
          </p>

          <div className="text-left rounded-xl border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              Returned Items
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {successReturn.items.map((ri) => (
                  <tr key={ri.id}>
                    <td className="px-4 py-2 text-slate-700 font-medium">{ri.itemName}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{ri.returnQty}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{fmt(ri.returnLineAmount)} LKR</td>
                    <td className="px-4 py-2 text-center">
                      {ri.stockDeducted ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Deducted</span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Skipped</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={2} className="px-4 py-3 font-bold text-slate-700">Total Returned</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">
                    {fmt(successReturn.totalReturnAmount)} LKR
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-left">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Supplier</div>
              <div className="font-semibold text-slate-700">{successReturn.supplierName}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Reason</div>
              <div className="font-semibold text-slate-700">{successReturn.reason}</div>
            </div>
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              setSuccessReturn(null);
              setReturnQtys({});
              setReason("");
              setNote("");
              loadData();
            }}
          >
            <RotateCcw size={16} className="mr-2" /> Process Another Return
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            onClick={() => navigate(`/purchases/${purchaseId}`)}
          >
            Back to Purchase
          </Button>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter space-y-6 pb-20">
      <DebitNotePrinter ref={debitNotePrinterRef} />

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate(`/purchases/${purchaseId}`)}>
          <ArrowLeft size={18} className="mr-2" /> Back to Purchase
        </Button>
        <div className="flex items-center gap-2">
          <RotateCcw size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-slate-800">Process Purchase Return</h1>
        </div>
      </div>

      {isCanceled && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertTriangle size={20} className="shrink-0" />
          This purchase has been canceled. Returns cannot be processed.
        </div>
      )}

      {/* Purchase summary */}
      <Card className="p-5 border-t-4 border-t-blue-600 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Purchase Invoice</div>
            <div className="text-xl font-bold font-mono text-slate-800">{purchase.invoiceNo}</div>
            <div className="text-xs text-slate-500 mt-1">{new Date(purchase.createdAt).toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Truck size={12} />
              <span className="font-semibold text-slate-700">{purchase.supplierName}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Grand Total</div>
            <div className="text-2xl font-bold text-slate-800">
              {fmt(purchase.grandTotal)} LKR
            </div>
            {existingReturns.length > 0 && (
              <div className="mt-1 text-xs text-blue-600 font-semibold">
                {existingReturns.length} existing return{existingReturns.length > 1 ? "s" : ""} on this purchase
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Existing returns */}
      {existingReturns.length > 0 && (
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <RotateCcw size={15} className="text-blue-500" />
            <span className="text-sm font-semibold text-blue-700">Previous Debit Notes</span>
          </div>
          <div className="divide-y divide-slate-100">
            {existingReturns.map((ret) => (
              <div key={ret.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono font-bold text-slate-700">{ret.debitNoteNo}</span>
                  <span className="ml-3 text-slate-500 text-xs">{new Date(ret.createdAt).toLocaleString()}</span>
                  <span className="ml-2 text-xs text-slate-400">GRN: {ret.grnNo}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-600">-{fmt(ret.totalReturnAmount)} LKR</span>
                  <button className="text-blue-600 hover:text-blue-800" onClick={() => handlePrint(ret)}>
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isCanceled && (
        <>
          {/* GRN selector (if multiple branches) */}
          {grnOptions.length > 1 && (
            <Card className="p-5 shadow-sm">
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                Select GRN (Branch) <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={selectedGrnId}
                onChange={(v) => { setSelectedGrnId(Number(v)); setReturnQtys({}); }}
                options={grnOptions}
                valueKey="value"
                labelKey="label"
                placeholder="Select a GRN to return items from…"
                buttonClassName="py-2"
              />
            </Card>
          )}

          {/* Items table */}
          {selectedGrn && (
            <Card className="p-0 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    Select Items to Return — {selectedGrn.grnNo} ({selectedGrn.branchName})
                  </span>
                </div>
                <button className="text-xs text-blue-600 hover:underline font-medium" onClick={toggleSelectAll}>
                  {selectedGrn.items.every((item) =>
                    (returnQtys[item.id] || 0) === maxReturnableQty(item.id, Number(item.qty))
                  ) ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="app-table-wrap">
                <table className="app-table">
                  <thead className="app-table-head">
                    <tr>
                      <th className="p-4">Item</th>
                      <th className="p-4 text-center">Purchased Qty</th>
                      <th className="p-4 text-center">Already Returned</th>
                      <th className="p-4 text-center">Max Returnable</th>
                      <th className="p-4 text-right">Cost Price</th>
                      <th className="p-4 text-center w-36">Return Qty</th>
                      <th className="p-4 text-right pr-6">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedGrn.items?.map((item) => {
                      const originalQty = Number(item.qty);
                      const already = alreadyReturnedMap[item.id] || 0;
                      const maxRet = maxReturnableQty(item.id, originalQty);
                      const currentQty = returnQtys[item.id] || 0;
                      const returnLine = currentQty * Number(item.costPrice || 0);
                      const fullyReturned = maxRet === 0;

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${fullyReturned ? "opacity-50" : ""}`}>
                          <td className="p-4">
                            <div className="font-medium text-slate-700">{item.itemName}</div>
                            {item.barcode && <div className="text-xs text-slate-400 font-mono">{item.barcode}</div>}
                            {fullyReturned && (
                              <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                                Fully Returned
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center text-slate-600">{item.qty}</td>
                          <td className="p-4 text-center">
                            {already > 0
                              ? <span className="text-blue-600 font-semibold">{already}</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="p-4 text-center font-semibold text-slate-700">{maxRet}</td>
                          <td className="p-4 text-right text-slate-600">{fmt(item.costPrice)}</td>
                          <td className="p-4 text-center">
                            {fullyReturned ? (
                              <span className="text-slate-300 text-sm">—</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={maxRet}
                                value={currentQty || ""}
                                onChange={(e) => setQtyForItem(item.id, e.target.value)}
                                placeholder="0"
                                className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 ${
                                  currentQty > 0
                                    ? "border-blue-400 bg-blue-50 font-bold"
                                    : "border-slate-300 bg-white"
                                }`}
                              />
                            )}
                          </td>
                          <td className="p-4 text-right pr-6">
                            {currentQty > 0
                              ? <span className="font-bold text-red-600">-{fmt(returnLine)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Form + Summary */}
          {selectedGrn && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Details */}
              <Card className="p-6 space-y-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Return Details</h3>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Return Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Damaged goods, wrong items received, excess quantity…"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Note <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Internal reference note…"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
                  />
                </div>
              </Card>

              {/* Right: Summary */}
              <Card className="p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Return Summary</h3>

                {selectedLines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                    <Package size={32} className="opacity-40" />
                    <span className="text-sm">No items selected yet</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-5">
                      {selectedLines.map(({ item, returnQty, returnLine }) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="text-slate-700 truncate max-w-[60%]">
                            {item.itemName} <span className="text-slate-400 font-mono">×{returnQty}</span>
                          </div>
                          <div className="font-semibold text-red-600">-{fmt(returnLine)} LKR</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">Total Return</span>
                        <span className="text-2xl font-bold text-red-600">{fmt(totalReturn)} LKR</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Debit note will be issued to {purchase.supplierName}
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-6">
                  <Button
                    className={`w-full py-3 text-base font-bold shadow-md transition-all ${
                      selectedLines.length > 0 && reason.trim()
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedLines.length === 0 || !reason.trim()}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <RotateCcw size={18} />
                        Confirm Return &amp; Issue Debit Note
                      </span>
                    )}
                  </Button>
                  {(selectedLines.length === 0 || !reason.trim()) && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      {selectedLines.length === 0 ? "Enter return quantities above to enable" : "Return reason is required"}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PurchaseReturnPage;
