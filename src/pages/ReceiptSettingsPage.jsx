import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Printer, Save, Ticket, FileText } from 'lucide-react';

import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatQuantityWithUnit } from '../utils/formatters';
import {
  DEFAULT_RECEIPT_SETTINGS,
  normalizeReceiptSettings,
  PRINT_TEMPLATE_TYPES,
  RECEIPT_SECTION_FIELDS,
} from '../utils/receiptSettings';
import { receiptSettingsAPI } from '../api/receiptSettings.api';

const DEMO_ITEMS = [
  { name: 'White Rice', qty: 1.5, qtyUnit: 'KG', unitPrice: 240, lineTotal: 360 },
  { name: 'Egg Pack', qty: 2, qtyUnit: 'PCS', unitPrice: 55, lineTotal: 110 },
  { name: 'Delivery Charge', qty: 1, qtyUnit: 'SERVICE', unitPrice: 150, lineTotal: 150 },
];

const DEMO_ORDER = {
  invoiceNo: 'INV-2026-000321',
  createdAt: '2026-04-23T10:45:00',
  cashierName: 'Nadee',
  customerName: 'Walk-in Customer',
  subTotal: 620,
  billDiscount: 20,
  grandTotal: 600,
  paidAmount: 1000,
  orderType: 'CASH',
};

const formatPreviewQty = (qty, unit) => formatQuantityWithUnit(qty, unit).replace(/\bSERVICE\b/g, 'S');

const getPreviewLogoWidth = (settings) => `${Math.round((Number(settings.logoWidthPercent) / 100) * 220)}px`;

const toSavePayload = (settings) => {
  const normalized = normalizeReceiptSettings(settings);

  return {
    showLogo: normalized.showLogo,
    showStoreName: normalized.showStoreName,
    showBranchName: normalized.showBranchName,
    showAddress: normalized.showAddress,
    showPhone: normalized.showPhone,
    showInvoiceNumber: normalized.showInvoiceNumber,
    showDateTime: normalized.showDateTime,
    showCashier: normalized.showCashier,
    showCustomer: normalized.showCustomer,
    showItemTable: normalized.showItemTable,
    showSubtotal: normalized.showSubtotal,
    showDiscount: normalized.showDiscount,
    showNetTotal: normalized.showNetTotal,
    showPaid: normalized.showPaid,
    showBalance: normalized.showBalance,
    showThanksMessage: normalized.showThanksMessage,
    showCredits: true,
    logoWidthPercent: normalized.logoWidthPercent,
    paperWidthMm: normalized.paperWidthMm,
    thanksMessage: normalized.thanksMessage,
    creditsLine1: normalized.creditsLine1,
    creditsLine2: normalized.creditsLine2,
  };
};

const ReceiptPreview = ({ branch, storeName, settings }) => {
  const normalized = normalizeReceiptSettings(settings);

  return (
    <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-5 shadow-sm">
      <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(148,163,184,0.18)]" style={{ maxWidth: 380 }}>
        <div
          className="mx-auto rounded-xl border border-dashed border-slate-300 bg-white p-4 font-mono text-slate-900"
          style={{ width: '100%', maxWidth: `${Math.min(92, normalized.paperWidthMm * 1.28)}%` }}
        >
          <div className="text-center">
            {normalized.showLogo && branch?.logo ? (
              <div className="mb-3 flex justify-center">
                <img
                  src={branch.logo}
                  alt="Branch logo"
                  className="object-contain"
                  style={{ width: getPreviewLogoWidth(normalized), maxWidth: '100%', maxHeight: '132px' }}
                />
              </div>
            ) : null}
            {normalized.showStoreName ? <h2 className="text-lg font-bold uppercase tracking-wide">{storeName}</h2> : null}
            {normalized.showBranchName ? <p className="mt-1 text-sm font-semibold">Branch: {branch?.name || 'Main Branch'}</p> : null}
            {normalized.showAddress && branch?.address ? <p className="mt-1 text-xs text-slate-600">Address: {branch.address}</p> : null}
            {normalized.showPhone && branch?.phone ? <p className="mt-1 text-xs text-slate-600">Phone: {branch.phone}</p> : null}
          </div>

          <div className="my-3 border-b border-dashed border-slate-400" />

          <div className="space-y-1 text-xs">
            {normalized.showInvoiceNumber ? <p>Invoice: <b>{DEMO_ORDER.invoiceNo}</b></p> : null}
            {normalized.showDateTime ? <p>Date: {new Date(DEMO_ORDER.createdAt).toLocaleString()}</p> : null}
            {normalized.showCashier ? <p>Cashier: {DEMO_ORDER.cashierName}</p> : null}
            {normalized.showCustomer ? <p>Customer: <b>{DEMO_ORDER.customerName}</b></p> : null}
          </div>

          {normalized.showItemTable ? (
            <>
              <div className="my-3 border-b border-dashed border-slate-400" />
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dashed border-slate-300">
                    <th className="pb-2 text-left">ITEM</th>
                    <th className="pb-2 text-center">QTY</th>
                    <th className="pb-2 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_ITEMS.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2 pr-2 align-top">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-[11px] text-slate-500">@ {formatCurrency(item.unitPrice)}</div>
                      </td>
                      <td className="py-2 text-center align-top">{formatPreviewQty(item.qty, item.qtyUnit)}</td>
                      <td className="py-2 text-right align-top">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          <div className="my-3 border-b border-dashed border-slate-400" />

          <div className="ml-auto w-full max-w-[200px] text-xs">
            {normalized.showSubtotal ? (
              <div className="flex items-center justify-between py-1">
                <span>Sub Total</span>
                <span>{formatCurrency(DEMO_ORDER.subTotal)}</span>
              </div>
            ) : null}
            {normalized.showDiscount ? (
              <div className="flex items-center justify-between py-1">
                <span>Discount</span>
                <span>-{formatCurrency(DEMO_ORDER.billDiscount)}</span>
              </div>
            ) : null}
            {normalized.showNetTotal ? (
              <div className="flex items-center justify-between border-y border-dashed border-slate-400 py-2 text-sm font-bold">
                <span>Net Total</span>
                <span>{formatCurrency(DEMO_ORDER.grandTotal)}</span>
              </div>
            ) : null}
            {normalized.showPaid ? (
              <div className="flex items-center justify-between py-1">
                <span>Paid</span>
                <span>{formatCurrency(DEMO_ORDER.paidAmount)}</span>
              </div>
            ) : null}
            {normalized.showBalance ? (
              <div className="flex items-center justify-between py-1 font-bold">
                <span>Balance</span>
                <span>{formatCurrency(DEMO_ORDER.paidAmount - DEMO_ORDER.grandTotal)}</span>
              </div>
            ) : null}
          </div>

          {normalized.showThanksMessage ? (
            <div className="mt-4 text-center text-xs font-semibold">{normalized.thanksMessage}</div>
          ) : null}

          <div className="mt-4 border-t border-slate-300 pt-3 text-center text-[11px]">
            <div className="font-bold">{normalized.creditsLine1}</div>
            <div className="mt-1 text-slate-600">{normalized.creditsLine2}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceiptSettingsPage = () => {
  const { user } = useAuth();
  const { branches, selectedBranchId } = useBranch();
  const branchOptions = useMemo(() => branches.filter((branch) => Number(branch.id) !== 0), [branches]);
  const branchSelectionRequired = !selectedBranchId || Number(selectedBranchId) === 0;
  const activeBranch = useMemo(
    () => branchOptions.find((branch) => Number(branch.id) === Number(selectedBranchId)) || null,
    [branchOptions, selectedBranchId]
  );

  const [activeTemplate, setActiveTemplate] = useState(PRINT_TEMPLATE_TYPES.THERMAL);
  const [form, setForm] = useState(DEFAULT_RECEIPT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branchSelectionRequired || !activeBranch?.id) {
      setForm(normalizeReceiptSettings(DEFAULT_RECEIPT_SETTINGS));
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await receiptSettingsAPI.getByBranch(activeBranch.id, activeTemplate);
        setForm(normalizeReceiptSettings(response.data));
      } catch (error) {
        console.error(error);
        toast.error('Failed to load receipt settings');
        setForm(normalizeReceiptSettings(DEFAULT_RECEIPT_SETTINGS));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [activeBranch, activeTemplate, branchSelectionRequired]);

  const updateField = (field, value) => {
    setForm((prev) => normalizeReceiptSettings({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (branchSelectionRequired || !activeBranch?.id) {
      toast.error('Select a branch from the header first');
      return;
    }

    try {
      setSaving(true);
      const payload = toSavePayload(form);
      const response = await receiptSettingsAPI.updateByBranch(activeBranch.id, payload, activeTemplate);
      setForm(normalizeReceiptSettings(response.data));
      toast.success('Receipt layout saved');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save receipt settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(normalizeReceiptSettings(DEFAULT_RECEIPT_SETTINGS));
  };

  if (!branchOptions.length && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Receipt Design</h1>
        <Card>
          <div className="py-16 text-center text-slate-500">
            <Building2 className="mx-auto mb-3 opacity-40" size={34} />
            No branches available to configure.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Receipt Design</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure branch-wise thermal receipt layout now. Use the top branch selector to choose the branch. A4 invoice tab is reserved for the next step.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || branchSelectionRequired || !activeBranch?.id}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,440px)]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Current Branch</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {branchSelectionRequired ? 'Select a branch from the header' : activeBranch?.name || 'Branch not found'}
                </div>
                {branchSelectionRequired ? (
                  <p className="mt-2 text-xs text-slate-500">
                    `All Branches` selected nam me page eka show karanne na. Branch ekak select karama settings load wenawa.
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTemplate(PRINT_TEMPLATE_TYPES.THERMAL)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Ticket size={16} />
                  Thermal
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-400"
                  title="A4 invoice editor will use the same system later"
                >
                  <FileText size={16} />
                  Full Invoice
                </button>
              </div>
            </div>
          </Card>

          {branchSelectionRequired ? (
            <Card>
              <div className="py-16 text-center text-slate-500">
                <Building2 className="mx-auto mb-3 opacity-40" size={34} />
                Select a specific branch from the header branch selector to edit receipt settings.
              </div>
            </Card>
          ) : loading ? (
            <Card>
              <div className="py-16">
                <LoadingSpinner text="Loading receipt layout..." />
              </div>
            </Card>
          ) : (
            <>
              <Card title="Visible Sections">
                <div className="grid gap-3 md:grid-cols-2">
                  {RECEIPT_SECTION_FIELDS.map((field) => (
                    <label
                      key={field.key}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                        field.locked ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-800">{field.label}</div>
                        {field.locked ? <div className="text-xs text-slate-500">Always visible on printed bills</div> : null}
                      </div>
                      <input
                        type="checkbox"
                        checked={!!form[field.key]}
                        disabled={field.locked}
                        onChange={(event) => updateField(field.key, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Logo & Paper">
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <label className="font-medium">Logo Size</label>
                        <span>{form.logoWidthPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="35"
                        max="100"
                        value={form.logoWidthPercent}
                        onChange={(event) => updateField('logoWidthPercent', Number(event.target.value))}
                        className="mt-3 w-full accent-blue-600"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Uploaded logos will auto-fit to this width, so every branch prints in a consistent size.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Paper Width (mm)</label>
                      <input
                        type="number"
                        min="48"
                        max="80"
                        value={form.paperWidthMm}
                        onChange={(event) => updateField('paperWidthMm', Number(event.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Messages">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Thanks Message</label>
                      <input
                        value={form.thanksMessage}
                        onChange={(event) => updateField('thanksMessage', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Credits Line 1</label>
                      <input
                        value={form.creditsLine1}
                        disabled
                        readOnly
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Credits Line 2</label>
                      <input
                        value={form.creditsLine2}
                        disabled
                        readOnly
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-slate-500"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Credits line eka system eken lock karala thiyenawa. User ta edit karanna ba.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            <Printer size={15} />
            Live Preview
          </div>
          {branchSelectionRequired ? (
            <Card>
              <div className="py-20 text-center text-slate-500">
                Preview appears after selecting a single branch from the header.
              </div>
            </Card>
          ) : (
            <ReceiptPreview
              branch={activeBranch}
              storeName={user?.shopName || 'POS SYSTEM'}
              settings={form}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettingsPage;
