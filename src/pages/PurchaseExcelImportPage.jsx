import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  HelpCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import DatePicker from "../components/common/DatePicker";
import Modal from "../components/common/Modal";
import SupplierQuickAddModal from "../components/purchase/SupplierQuickAddModal";

import { branchesAPI } from "../api/branches.api";
import { purchasesAPI } from "../api/purchases.api";
import { suppliersAPI } from "../api/suppliers.api";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, getLocalDateString } from "../utils/formatters";

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
];

const cashSourceOptions = [
  { value: "BRANCH_CASH", label: "Branch Cash" },
  { value: "CASH_DRAWER", label: "Cash Drawer" },
];

const statusBadgeClass = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NOT_FOUND: "border-red-200 bg-red-50 text-red-700",
  AMBIGUOUS: "border-amber-200 bg-amber-50 text-amber-700",
  INVALID: "border-slate-300 bg-slate-100 text-slate-700",
};

const getAutoCashSourceForPaymentMethod = (method) => {
  if (method === "CASH") return null;
  if (method === "BANK") return "BANK";
  return "NONE";
};

const getCashSourceLabel = (value) => {
  if (value === "BRANCH_CASH") return "Branch Cash";
  if (value === "CASH_DRAWER") return "Cash Drawer";
  if (value === "BANK") return "Bank";
  return "No Cash Out";
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const computeLineTotal = (row) => {
  const qty = Number(row.qty || 0);
  const cost = Number(row.costPrice || 0);
  if (row.qtyUnit === "G" || row.qtyUnit === "ML") {
    return (qty / 1000) * cost;
  }
  return qty * cost;
};

const PurchaseExcelImportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";
  const fileInputRef = useRef(null);

  // --- Header / metadata state ---
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(getLocalDateString());
  const [discountAmount, setDiscountAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashSource, setCashSource] = useState("BRANCH_CASH");
  const [cashSourceBranchId, setCashSourceBranchId] = useState("");
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // --- File / rows state ---
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [recheckingRows, setRecheckingRows] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [suppRes, branchRes] = await Promise.all([
        suppliersAPI.list(),
        branchesAPI.getAll(),
      ]);
      setSuppliers(suppRes.data || []);

      const branchList = branchRes.data || [];
      const scoped = isManager
        ? branchList.filter((b) => Number(b.id) === Number(user?.branchId))
        : branchList;
      setBranches(scoped);

      if (scoped.length === 1) {
        setTargetBranchId(String(scoped[0].id));
      }
    } catch (e) {
      toast.error("Failed to load suppliers/branches");
    }
  };

  const handleSupplierCreated = (newSupplier) => {
    setSuppliers((prev) => [...prev, newSupplier]);
    setSupplierId(newSupplier.id);
  };

  // --- Template / upload ---
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await purchasesAPI.downloadImportTemplate();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "purchase-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingFile(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await purchasesAPI.previewImport(formData);
      const incoming = (res.data?.rows || []).map((row) => ({
        ...row,
        expiry: row.expiry || "",
      }));
      setRows(incoming);
      toast.success(`Loaded ${res.data?.totalRows || 0} rows`);
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || "Failed to load Excel file");
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const resetImport = () => {
    setRows([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- Row editing ---
  const updateRow = (rowNumber, patch) => {
    setRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (rowNumber) => {
    setRows((prev) => prev.filter((row) => row.rowNumber !== rowNumber));
  };

  const recheckRow = async (rowNumber) => {
    const row = rows.find((r) => r.rowNumber === rowNumber);
    if (!row) return;

    setRecheckingRows((prev) => {
      const next = new Set(prev);
      next.add(rowNumber);
      return next;
    });

    try {
      const payload = {
        rowNumber: row.rowNumber,
        barcode: row.barcode || null,
        name: row.name || null,
        costPrice: toNumber(row.costPrice),
        sellPrice: toNumber(row.sellPrice),
        qty: toNumber(row.qty),
        expiry: row.expiry || null,
      };
      const res = await purchasesAPI.lookupRow(payload);
      const next = res.data?.row;
      if (next) {
        updateRow(rowNumber, {
          ...next,
          expiry: next.expiry || "",
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Recheck failed");
    } finally {
      setRecheckingRows((prev) => {
        const next = new Set(prev);
        next.delete(rowNumber);
        return next;
      });
    }
  };

  // --- Derived totals (READY rows only) ---
  const summary = useMemo(() => {
    const ready = rows.filter((r) => r.status === "READY").length;
    const notFound = rows.filter((r) => r.status === "NOT_FOUND").length;
    const ambiguous = rows.filter((r) => r.status === "AMBIGUOUS").length;
    const invalid = rows.filter((r) => r.status === "INVALID").length;
    return { ready, notFound, ambiguous, invalid };
  }, [rows]);

  const readyRows = useMemo(() => rows.filter((r) => r.status === "READY"), [rows]);
  const subtotal = useMemo(
    () => readyRows.reduce((acc, row) => acc + computeLineTotal(row), 0),
    [readyRows]
  );

  const normalizedDiscount = Math.max(0, Number(discountAmount || 0));
  const grandTotal = Math.max(0, subtotal - normalizedDiscount);
  const normalizedPaid = Math.max(0, Number(paidAmount || 0));
  const dueAmount = Math.max(0, grandTotal - normalizedPaid);

  const autoCashSource = getAutoCashSourceForPaymentMethod(paymentMethod);
  const effectiveCashSource =
    normalizedPaid > 0 ? autoCashSource || cashSource || "BRANCH_CASH" : "NONE";
  const canSelectCashSource = normalizedPaid > 0 && paymentMethod === "CASH";

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: String(b.id), label: b.name })),
    [branches]
  );

  // --- Submit ---
  const buildPayload = () => ({
    supplierId: Number(supplierId),
    invoiceNo: invoiceNo ? invoiceNo : null,
    discountAmount: normalizedDiscount,
    paidAmount: normalizedPaid,
    paymentMethod,
    cashSource: effectiveCashSource,
    cashSourceBranchId:
      effectiveCashSource === "CASH_DRAWER" ? Number(cashSourceBranchId || targetBranchId) : null,
    branches: [
      {
        branchId: Number(targetBranchId),
        items: readyRows.map((row) => ({
          itemId: row.matchedItemId,
          qty: Number(row.qty),
          qtyUnit: row.qtyUnit,
          costPrice: Number(row.costPrice),
          sellingPrice: Number(row.sellPrice),
          expiryDate: row.expiry || null,
          zeroNegativeStock: false,
        })),
      },
    ],
  });

  const validateBeforeSubmit = () => {
    if (!targetBranchId) {
      toast.error("Please select a target branch");
      return false;
    }
    if (!supplierId) {
      toast.error("Please select a supplier");
      return false;
    }
    if (readyRows.length === 0) {
      toast.error("No READY rows to submit");
      return false;
    }
    if (normalizedDiscount < 0) {
      toast.error("Discount cannot be negative");
      return false;
    }
    if (normalizedDiscount > subtotal) {
      toast.error("Discount cannot exceed subtotal");
      return false;
    }
    if (normalizedPaid < 0) {
      toast.error("Paid amount cannot be negative");
      return false;
    }
    if (normalizedPaid > grandTotal) {
      toast.error("Paid amount cannot exceed grand total");
      return false;
    }
    if (normalizedPaid > 0 && paymentMethod === "CASH" && !cashSource) {
      toast.error("Please select a cash source");
      return false;
    }
    return true;
  };

  const handleFinalize = () => {
    if (!validateBeforeSubmit()) return;

    const skipCount = summary.notFound + summary.ambiguous + summary.invalid;
    if (skipCount > 0) {
      setShowSkipModal(true);
      return;
    }
    submitPurchase();
  };

  const submitPurchase = async () => {
    setShowSkipModal(false);
    setSubmitting(true);
    try {
      await purchasesAPI.create(buildPayload());
      toast.success("Purchase saved successfully!");
      navigate("/purchases");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save purchase");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render helpers ---
  const renderRow = (row) => {
    const isEditableIdentifier =
      row.status === "NOT_FOUND" || row.status === "AMBIGUOUS" || row.status === "INVALID";
    const badgeClass = statusBadgeClass[row.status] || statusBadgeClass.INVALID;
    const isRechecking = recheckingRows.has(row.rowNumber);
    const lineTotal = computeLineTotal(row);

    return (
      <tr key={row.rowNumber} className="border-t border-slate-200 align-top">
        <td className="px-3 py-3 font-medium text-slate-700">{row.rowNumber}</td>
        <td className="px-3 py-3">
          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass}`}>
            {row.status}
          </span>
        </td>
        <td className="px-3 py-3">
          <input aria-label="Barcode"
            className="w-32 rounded-lg border border-slate-300 px-2 py-2 disabled:bg-slate-100 disabled:text-slate-500"
            value={row.barcode || ""}
            disabled={!isEditableIdentifier}
            onChange={(e) => updateRow(row.rowNumber, { barcode: e.target.value })}
            placeholder="Barcode"
          />
        </td>
        <td className="px-3 py-3">
          <input aria-label="Item name"
            className="w-44 rounded-lg border border-slate-300 px-2 py-2 disabled:bg-slate-100 disabled:text-slate-500"
            value={row.name || ""}
            disabled={!isEditableIdentifier}
            onChange={(e) => updateRow(row.rowNumber, { name: e.target.value })}
            placeholder="Item name"
          />
        </td>
        <td className="px-3 py-3 text-xs text-slate-600">
          {row.matchedItemId ? (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800">{row.matchedName}</div>
              <div className="text-slate-400">{row.matchedBarcode}</div>
              {row.qtyUnit ? <div className="text-slate-400">Unit: {row.qtyUnit}</div> : null}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-3">
          <input aria-label="Cost price"
            type="number"
            min="0"
            step="0.01"
            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-right"
            value={row.costPrice ?? ""}
            onChange={(e) => updateRow(row.rowNumber, { costPrice: toNumber(e.target.value) })}
          />
        </td>
        <td className="px-3 py-3">
          <input aria-label="Selling price"
            type="number"
            min="0"
            step="0.01"
            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-right"
            value={row.sellPrice ?? ""}
            onChange={(e) => updateRow(row.rowNumber, { sellPrice: toNumber(e.target.value) })}
          />
        </td>
        <td className="px-3 py-3">
          <input aria-label="Quantity"
            type="number"
            min="0"
            step="0.001"
            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-right"
            value={row.qty ?? ""}
            onChange={(e) => updateRow(row.rowNumber, { qty: toNumber(e.target.value) })}
          />
        </td>
        <td className="px-3 py-3">
          <DatePicker
            value={row.expiry || ""}
            onChange={(value) => updateRow(row.rowNumber, { expiry: value || "" })}
            buttonClassName="h-9 w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-3 text-right font-semibold text-slate-700">
          {row.status === "READY" ? formatCurrency(lineTotal) : "—"}
        </td>
        <td className="px-3 py-3">
          <div
            className={`flex min-w-[200px] items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              row.status === "READY"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : row.status === "NOT_FOUND"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : row.status === "AMBIGUOUS"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {row.status === "READY" ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
            )}
            <span>{row.message || "-"}</span>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-col gap-1">
            {row.status !== "READY" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => recheckRow(row.rowNumber)}
                disabled={isRechecking}
                className="h-8 px-2 text-xs"
              >
                <Search size={12} className="mr-1" />
                {isRechecking ? "..." : "Recheck"}
              </Button>
            )}
            <button
              type="button"
              onClick={() => removeRow(row.rowNumber)}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={12} className="mr-1" />
              Remove
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="page-enter space-y-6 pb-10 p-6">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Import Purchase from Excel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload an Excel sheet to bulk-add purchase items into one supplier invoice.
          </p>
        </div>
        <div className="purchase-summary-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-sm font-medium text-slate-500">Grand Total</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</p>
          {normalizedDiscount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Subtotal {formatCurrency(subtotal)} - Discount {formatCurrency(normalizedDiscount)}
            </p>
          ) : null}
          <p className={`mt-1 text-sm font-semibold ${dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
            Supplier Due: {formatCurrency(dueAmount)}
          </p>
        </div>
      </div>

      {/* Header / metadata card */}
      <Card className="overflow-visible p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <label className="label-text">Target Branch</label>
              <CustomSelect
                value={targetBranchId}
                onChange={setTargetBranchId}
                options={branchOptions}
                valueKey="value"
                labelKey="label"
                placeholder="Select branch"
              />
            </div>
            <div>
              <label className="label-text">Supplier</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomSelect
                    value={supplierId}
                    onChange={setSupplierId}
                    options={suppliers}
                    placeholder="Select Supplier"
                  />
                </div>
                <Button
                  onClick={() => setShowSupplierModal(true)}
                  variant="secondary"
                  className="shrink-0 px-3"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>
            <div>
              <label htmlFor="purchaseexcelimportpage-invoice-no" className="label-text">Invoice No</label>
              <input id="purchaseexcelimportpage-invoice-no"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="input w-full"
                placeholder="Ex: INV-999"
              />
            </div>
            <div>
              <label className="label-text">Date</label>
              <DatePicker value={date} onChange={setDate} buttonClassName="input h-10 w-full" />
            </div>
            <div>
              <label htmlFor="purchaseexcelimportpage-supplier-discount" className="label-text">Supplier Discount</label>
              <input id="purchaseexcelimportpage-supplier-discount"
                type="number"
                min="0"
                max={subtotal || 0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="input w-full text-right"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="purchaseexcelimportpage-paid-to-supplier" className="label-text">Paid to Supplier</label>
              <div className="flex gap-2">
                <input id="purchaseexcelimportpage-paid-to-supplier"
                  type="number"
                  min="0"
                  max={grandTotal || 0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="input w-full text-right"
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPaidAmount(String(grandTotal))}
                  disabled={readyRows.length === 0}
                  className="shrink-0 px-3"
                >
                  Full
                </Button>
              </div>
            </div>
            <div>
              <label className="label-text">Payment Method</label>
              <CustomSelect
                value={paymentMethod}
                onChange={(value) => {
                  setPaymentMethod(value);
                  if (value !== "CASH") setCashSourceBranchId("");
                  if (value === "CASH" && cashSource === "BANK") setCashSource("BRANCH_CASH");
                }}
                options={paymentMethodOptions}
                valueKey="value"
                labelKey="label"
              />
            </div>
            <div>
              <label className="label-text">Cash Source</label>
              <CustomSelect
                value={effectiveCashSource}
                onChange={(value) => {
                  setCashSource(value);
                  if (value !== "CASH_DRAWER") setCashSourceBranchId("");
                }}
                options={
                  canSelectCashSource
                    ? cashSourceOptions
                    : [{ value: effectiveCashSource, label: getCashSourceLabel(effectiveCashSource) }]
                }
                valueKey="value"
                labelKey="label"
                disabled={!canSelectCashSource}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Action bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Required columns:</span>{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">barcode</code>,{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">name</code>,{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">costPrice</code>,{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">sellPrice</code>,{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">qty</code>,{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">expiry</code>{" "}
              <span className="text-xs text-slate-500">(barcode or name — at least one per row)</span>
            </div>
            {fileName ? (
              <div className="text-xs font-medium text-slate-800">File: {fileName}</div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
              >
                <Download size={16} className="mr-2" />
                {downloadingTemplate ? "Downloading..." : "Template"}
              </Button>
              <input aria-label="Choose a purchase Excel file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={loadingFile}>
                <Upload size={16} className="mr-2" />
                {loadingFile ? "Loading..." : "Upload Excel"}
              </Button>
              {rows.length > 0 && (
                <Button type="button" variant="secondary" onClick={resetImport}>
                  <RefreshCw size={16} className="mr-2" />
                  Reset
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                Ready: {summary.ready}
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700">
                Not Found: {summary.notFound}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
                Ambiguous: {summary.ambiguous}
              </span>
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 font-medium text-slate-700">
                Invalid: {summary.invalid}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Rows table */}
      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          <HelpCircle size={28} className="mx-auto mb-3 text-slate-300" />
          Upload an Excel file to load the preview table.
        </Card>
      ) : (
        <Card className="space-y-4 p-4">
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-[1320px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Matched Item</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Sell</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2 text-right">Line Total</th>
                  <th className="px-3 py-2">Message</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>{rows.map(renderRow)}</tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Submit bar */}
      <div className="flex justify-end">
        <Button
          onClick={handleFinalize}
          size="lg"
          className="bg-green-600 hover:bg-green-700 shadow-lg px-8"
          disabled={readyRows.length === 0 || submitting}
        >
          <Save size={18} className="mr-2" />
          {submitting ? "Saving..." : "Finalize Purchase"}
        </Button>
      </div>

      <SupplierQuickAddModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onCreated={handleSupplierCreated}
      />

      <Modal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        title="Skip non-ready rows?"
        size="sm"
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">{summary.notFound + summary.ambiguous + summary.invalid}</span>{" "}
            row(s) will be skipped (status NOT_FOUND / AMBIGUOUS / INVALID).
          </p>
          <p>Only <span className="font-semibold text-emerald-700">{summary.ready}</span> READY row(s) will be saved as a purchase.</p>
          <p className="text-xs text-slate-500">You can cancel and fix those rows, or proceed.</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowSkipModal(false)}>
            Cancel
          </Button>
          <Button onClick={submitPurchase} disabled={submitting}>
            <Save size={16} className="mr-2" />
            Continue & Save
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseExcelImportPage;
