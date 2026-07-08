import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDown, ArrowUp, Bold, Building2, ChefHat, FileText, Italic, Layers, Plus, Printer, RefreshCw, Save, Ticket, Trash2, Type, Underline } from 'lucide-react';

import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReceiptTemplate from '../components/receipt/ReceiptTemplate';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';
import CustomSelect from '../components/common/CustomSelect';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useAppConfiguration } from '../context/AppConfigurationContext';
import {
  getReceiptSettingsDefaults,
  normalizeReceiptSettings,
  ITEM_NAME_SOURCE_OPTIONS,
  PRINT_TEMPLATE_TYPES,
  RECEIPT_FONT_OPTIONS,
  RECEIPT_SECTION_FIELDS,
  RECEIPT_LINE_TYPE_OPTIONS,
  RECEIPT_LINE_ALIGNMENT_OPTIONS,
  RECEIPT_LINE_FONT_SIZES,
  RECEIPT_LINE_CUSTOM_TEXT_TYPES,
  createReceiptTemplateLine,
  getActiveTemplateLines,
} from '../utils/receiptSettings';

// Line types where ALL formatting controls (font-size, align, B/I/U) are irrelevant
const NO_FORMAT_LINE_TYPES = ['SEPARATOR', 'BLANK'];

// Alignment options for the LOGO line (no "Amount Right" split option)
const LOGO_ALIGN_OPTIONS = [
  { value: 'left',   label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right',  label: 'Right' },
];
import { buildPosReceiptHtml } from '../utils/buildPosReceiptHtml';
import { receiptSettingsAPI } from '../api/receiptSettings.api';
import { printerAgentAPI } from '../api/printerAgent.api';
import { BRAND_NAME_UPPER } from '../utils/branding';

const toSavePayload = (settings, templateType, templateLines) => {
  const normalized = normalizeReceiptSettings(settings);

  // Serialize templateLines array to JSON string (or null if empty / not thermal)
  let templateLinesJson = null;
  if (templateType === PRINT_TEMPLATE_TYPES.THERMAL && Array.isArray(templateLines) && templateLines.length > 0) {
    templateLinesJson = JSON.stringify(templateLines);
  }

  return {
    showLogo: normalized.showLogo,
    showStoreName: normalized.showStoreName,
    showBranchName: normalized.showBranchName,
    showAddress: normalized.showAddress,
    showAddressLabel: normalized.showAddressLabel,
    showPhone: normalized.showPhone,
    showPhoneLabel: normalized.showPhoneLabel,
    showInvoiceNumber: normalized.showInvoiceNumber,
    showDateTime: normalized.showDateTime,
    showCashier: normalized.showCashier,
    showCustomer: normalized.showCustomer,
    showItemTable: normalized.showItemTable,
    showWarranty: normalized.showWarranty,
    showSubtotal: normalized.showSubtotal,
    showDiscount: normalized.showDiscount,
    showNetTotal: normalized.showNetTotal,
    showPaid: normalized.showPaid,
    showBalance: normalized.showBalance,
    showDueAmount: normalized.showDueAmount,
    showThanksMessage: normalized.showThanksMessage,
    showCredits: true,
    logoWidthPercent: normalized.logoWidthPercent,
    logoTopSpacing: normalized.logoTopSpacing,
    invoiceLogoWidthPercent: normalized.invoiceLogoWidthPercent,
    receiptFontFamily: normalized.receiptFontFamily,
    paperWidthMm: templateType === PRINT_TEMPLATE_TYPES.A4 ? 210 : normalized.paperWidthMm,
    directPrintEnabled: normalized.directPrintEnabled,
    printerName: normalized.printerName,
    printerCopies: normalized.printerCopies,
    thanksMessage: normalized.thanksMessage,
    itemNameSource: normalized.itemNameSource,
    templateLines: templateLinesJson,
    currencySymbol: normalized.currencySymbol,
  };
};

// ── Template-line-driven iframe preview (used inside the line editor card) ──

const ReceiptPreview = ({ branch, storeName, settings, templateType, templateLines }) => {
  const [iframeHeight, setIframeHeight] = useState(400);
  const [iframeKey, setIframeKey] = useState(0);
  const normalized = normalizeReceiptSettings({
    ...settings,
    paperWidthMm: templateType === PRINT_TEMPLATE_TYPES.A4 ? 210 : settings?.paperWidthMm,
  });
  const isKotPreview = templateType === PRINT_TEMPLATE_TYPES.KOT;
  const isInvoicePreview = templateType === PRINT_TEMPLATE_TYPES.A4;
  const isThermalWithLines = templateType === PRINT_TEMPLATE_TYPES.THERMAL && Array.isArray(templateLines) && templateLines.length > 0;
  const previewPaperWidthPx = Math.round(normalized.paperWidthMm * 3.78);
  const invoicePreviewScale = isInvoicePreview ? Math.min(1, 380 / previewPaperWidthPx) : 1;
  const previewOrder = useMemo(() => isKotPreview
    ? {
        invoiceNo: 'KOT-14',
        createdAt: '2026-04-23T10:45:00',
        cashierName: 'Nadee',
        customerName: 'Nimal',
        customerLabel: 'Customer',
        subTitle: 'Kitchen Order Ticket',
        saleMode: 'DINE IN',
        tableName: 'Table 04',
        subTotal: 0,
        billDiscount: 0,
        grandTotal: 0,
        paidAmount: 0,
        orderType: 'DINE_IN',
      }
    : {
        invoiceNo: 'INV-2026-000321',
        createdAt: '2026-04-23T10:45:00',
        cashierName: 'Nadee',
        customerName: 'Walk-in Customer',
        customerPhone: '077 123 4567',
        subTotal: 1420,
        billDiscount: 20,
        netTotal: 1350,
        paidAmount: 1000,
        dueAmount: 350,
        orderType: 'CASH + CREDIT',
        saleMode: 'TAKEAWAY',
      },
  [isKotPreview]);

  const previewItems = useMemo(() => isKotPreview
    ? [
        { name: 'චිකන් ෆ්‍රයිඩ් රයිස්', qty: 2, qtyUnit: 'PCS', unitPrice: 0, lineTotal: 0 },
        { name: 'ෆිෂ් කොත්තු', qty: 1, qtyUnit: 'PCS', unitPrice: 0, lineTotal: 0 },
        { name: 'ලයිම් ජූස්', qty: 3, qtyUnit: 'PCS', unitPrice: 0, lineTotal: 0 },
      ]
    : [
        { name: 'White Rice 1kg',    altName: 'සුදු හාල් 1kg',   qty: 2, qtyUnit: 'PKT', unitPrice: 185, lineDiscount: 0,  lineTotal: 370 },
        { name: 'Coconut Oil 500ml', altName: 'පොල් තෙල් 500ml', qty: 1, qtyUnit: 'BTL', unitPrice: 420, lineDiscount: 50, lineTotal: 370 },
        { name: 'Sugar 1kg',         altName: 'සීනි 1kg',        qty: 3, qtyUnit: 'PKT', unitPrice: 210, lineDiscount: 0,  lineTotal: 630 },
      ],
  [isKotPreview]);

  // Thermal + template lines → use iframe driven by buildPosReceiptHtml (live, reflects editor)
  const thermalIframeHtml = useMemo(() => {
    if (!isThermalWithLines) return null;
    const settingsWithLines = { ...normalized, templateLines: JSON.stringify(templateLines) };
    return buildPosReceiptHtml({
      settings: settingsWithLines,
      branchData: {
        name: branch?.name || 'Main Branch',
        address: branch?.address || '123 Main Street',
        phone: branch?.phone || '077 000 0000',
        logo: branch?.logo || null,
        cashierName: previewOrder.cashierName,
      },
      storeName,
      orderData: previewOrder,
      items: previewItems,
      customerData: { name: previewOrder.customerName },
      options: { includeCopies: false },
    });
  }, [isThermalWithLines, normalized, templateLines, branch, storeName, previewOrder, previewItems]);

  // Remount the iframe whenever HTML changes so onLoad fires fresh and height recalculates
  useEffect(() => {
    if (isThermalWithLines) setIframeKey((k) => k + 1);
  }, [thermalIframeHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-5 shadow-sm">
      <div
        className="mx-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(148,163,184,0.18)]"
        style={{ maxWidth: `${previewPaperWidthPx + 40}px` }}
      >
        <div className="mx-auto overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">

          {/* ── Thermal + template lines → iframe driven by buildPosReceiptHtml ── */}
          {isThermalWithLines ? (
            <iframe
              key={iframeKey}
              title="Receipt live preview"
              srcDoc={thermalIframeHtml}
              scrolling="no"
              className="block border-0 bg-white"
              style={{ width: `${previewPaperWidthPx}px`, maxWidth: '100%', height: `${iframeHeight}px`, display: 'block' }}
              onLoad={(e) => {
                const doc = e.currentTarget.contentDocument;
                const bill = doc?.querySelector('.bill');
                const h = Math.ceil((bill?.scrollHeight || doc?.body?.scrollHeight || 400) + 12);
                setIframeHeight(Math.max(160, Math.min(h, 1400)));
              }}
            />
          ) : (
          <div
            style={
              isInvoicePreview
                ? {
                    width: `${previewPaperWidthPx * invoicePreviewScale}px`,
                    height: `${Math.round(1123 * invoicePreviewScale)}px`,
                    overflow: 'hidden',
                    margin: '0 auto',
                  }
                : {
                    width: `${previewPaperWidthPx}px`,
                    maxWidth: '100%',
                    margin: '0 auto',
                  }
            }
          >
            <div
              style={
                isInvoicePreview
                  ? {
                      width: `${previewPaperWidthPx}px`,
                      transform: `scale(${invoicePreviewScale})`,
                      transformOrigin: 'top left',
                    }
                  : undefined
              }
            >
              {isInvoicePreview ? (
                <InvoiceTemplate
                  settings={normalized}
                  branchData={{
                    name: branch?.name || 'Main Branch',
                    address: branch?.address || '',
                    phone: branch?.phone || '',
                    logo: branch?.logo || '',
                    cashierName: previewOrder.cashierName,
                  }}
                  storeName={storeName}
                  orderData={previewOrder}
                  items={previewItems}
                  customerData={previewOrder.customerName ? { name: previewOrder.customerName, phone: previewOrder.customerPhone } : null}
                  mode="print"
                />
              ) : (
                <ReceiptTemplate
                  templateType={templateType}
                  settings={normalized}
                  branchData={{
                    name: branch?.name || 'Main Branch',
                    address: branch?.address || '',
                    phone: branch?.phone || '',
                    logo: branch?.logo || '',
                    cashierName: previewOrder.cashierName,
                  }}
                  storeName={storeName}
                  orderData={previewOrder}
                  items={previewItems}
                  customerData={previewOrder.customerName ? { name: previewOrder.customerName } : null}
                  showTotals={!isKotPreview}
                  showCredits
                  mode="print"
                />
              )}
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
};

const ReceiptSettingsPage = () => {
  const { user } = useAuth();
  const { configuration } = useAppConfiguration();
  const { branches, selectedBranchId } = useBranch();
  const kotEnabled = configuration?.kotEnabled !== false;
  const branchOptions = useMemo(() => branches.filter((branch) => Number(branch.id) !== 0), [branches]);
  const branchSelectionRequired = !selectedBranchId || Number(selectedBranchId) === 0;
  const activeBranch = useMemo(
    () => branchOptions.find((branch) => Number(branch.id) === Number(selectedBranchId)) || null,
    [branchOptions, selectedBranchId]
  );

  const [activeTemplate, setActiveTemplate] = useState(PRINT_TEMPLATE_TYPES.THERMAL);
  const [form, setForm] = useState(getReceiptSettingsDefaults(PRINT_TEMPLATE_TYPES.THERMAL));
  // templateLines: the live array for the line-by-line editor (Thermal only)
  const [templateLines, setTemplateLines] = useState(null); // null = not yet initialised
  const [addLineType, setAddLineType] = useState('CUSTOM_TEXT'); // controlled select for "Add Line"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerTesting, setPrinterTesting] = useState(false);
  const [printAgentOnline, setPrintAgentOnline] = useState(false);
  const [printerOptions, setPrinterOptions] = useState([]);

  useEffect(() => {
    if (!kotEnabled && activeTemplate === PRINT_TEMPLATE_TYPES.KOT) {
      setActiveTemplate(PRINT_TEMPLATE_TYPES.THERMAL);
    }
  }, [activeTemplate, kotEnabled]);

  useEffect(() => {
    if (branchSelectionRequired || !activeBranch?.id) {
      setForm(getReceiptSettingsDefaults(activeTemplate));
      setTemplateLines(null);
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await receiptSettingsAPI.getByBranch(activeBranch.id, activeTemplate);
        const normalized = normalizeReceiptSettings({
          ...response.data,
          paperWidthMm: activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 210 : response.data?.paperWidthMm,
        });
        setForm(normalized);
        // Initialise template lines for the line editor (Thermal only)
        if (activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL) {
          setTemplateLines(getActiveTemplateLines(normalized));
        } else {
          setTemplateLines(null);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load receipt settings');
        setForm(getReceiptSettingsDefaults(activeTemplate));
        setTemplateLines(null);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [activeBranch, activeTemplate, branchSelectionRequired]);

  const updateField = (field, value) => {
    setForm((prev) => normalizeReceiptSettings({ ...prev, [field]: value }));
  };

  const loadPrinters = async ({ silent = false } = {}) => {
    try {
      setPrinterLoading(true);
      const response = await printerAgentAPI.printers();
      const printers = Array.isArray(response.printers) ? response.printers : [];
      setPrinterOptions(printers.map((printer) => ({
        value: printer.name,
        label: printer.isDefault ? `${printer.name} (Default)` : printer.name,
      })));
      setPrintAgentOnline(true);
      if (!silent) toast.success('Printer service connected');
    } catch (error) {
      setPrintAgentOnline(false);
      setPrinterOptions([]);
      if (!silent) toast.error(error.message || 'Printer service not available');
    } finally {
      setPrinterLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters({ silent: true });
  }, []);

  const handleTestPrint = async () => {
    if (!form.printerName) {
      toast.error('Select a printer first');
      return;
    }

    try {
      setPrinterTesting(true);
      await printerAgentAPI.testPrint({
        printerName: form.printerName,
        paperWidth: activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 'A4' : `${form.paperWidthMm}mm`,
        copies: form.printerCopies,
        label: activeTemplate === PRINT_TEMPLATE_TYPES.KOT ? 'KOT Printer' : 'Receipt Printer',
      });
      toast.success('Test print sent');
    } catch (error) {
      toast.error(error.message || 'Test print failed');
    } finally {
      setPrinterTesting(false);
    }
  };

  const handleSave = async () => {
    if (branchSelectionRequired || !activeBranch?.id) {
      toast.error('Select a branch from the header first');
      return;
    }

    try {
      setSaving(true);
      const payload = toSavePayload(form, activeTemplate, templateLines);
      const response = await receiptSettingsAPI.updateByBranch(activeBranch.id, payload, activeTemplate);
      const normalized = normalizeReceiptSettings({
        ...response.data,
        paperWidthMm: activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 210 : response.data?.paperWidthMm,
      });
      setForm(normalized);
      if (activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL) {
        setTemplateLines(getActiveTemplateLines(normalized));
      }
      toast.success(activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 'Invoice layout saved' : 'Receipt layout saved');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save receipt settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset all settings to default? Unsaved changes will be lost.')) return;
    const defaults = getReceiptSettingsDefaults(activeTemplate);
    setForm(defaults);
    if (activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL) {
      setTemplateLines(getActiveTemplateLines(defaults));
    }
  };

  // ── Template line editor helpers ──────────────────────────────────────────

  const addTemplateLine = useCallback((type) => {
    setTemplateLines((prev) => [...(prev || []), createReceiptTemplateLine(type)]);
  }, []);

  const removeTemplateLine = useCallback((index) => {
    setTemplateLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveTemplateLine = useCallback((index, direction) => {
    setTemplateLines((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }, []);

  const updateTemplateLine = useCallback((index, field, value) => {
    setTemplateLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }, []);

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
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Receipt Design</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure branch-wise thermal receipt, full invoice, and kitchen ticket layouts.
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
          <Card className="admin-panel-card" style={{ animationDelay: "90ms" }}>
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
                  onClick={() => {
                    if (kotEnabled) {
                      setActiveTemplate(PRINT_TEMPLATE_TYPES.KOT);
                    }
                  }}
                  disabled={!kotEnabled}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTemplate === PRINT_TEMPLATE_TYPES.KOT
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : kotEnabled
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70'
                  }`}
                  title={!kotEnabled ? 'KOT is disabled in App Configuration' : undefined}
                >
                  <ChefHat size={16} />
                  KOT
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate(PRINT_TEMPLATE_TYPES.A4)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTemplate === PRINT_TEMPLATE_TYPES.A4
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText size={16} />
                  Full Invoice
                </button>
              </div>
            </div>
          </Card>

          {branchSelectionRequired ? (
            <Card className="ops-alert-card" style={{ animationDelay: "120ms" }}>
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
              {/* Visible Sections only shown when NOT using the line editor (KOT / A4, or Thermal before lines are initialised) */}
              {activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL && templateLines !== null ? null : (
              <Card className="admin-panel-card" title="Visible Sections" style={{ animationDelay: "130ms" }}>
                <div className="grid gap-3 md:grid-cols-2">
                  {RECEIPT_SECTION_FIELDS.map((field) => (
                    (() => {
                      const disabledByParent =
                        (field.key === 'showAddressLabel' && !form.showAddress) ||
                        (field.key === 'showPhoneLabel' && !form.showPhone);
                      const isDisabled = field.locked || disabledByParent;

                      return (
                    <label
                      key={field.key}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                        field.locked ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-800">{field.label}</div>
                        {field.locked ? <div className="text-xs text-slate-500">Always visible on printed bills</div> : null}
                        {disabledByParent ? <div className="text-xs text-slate-500">Enable the parent field first</div> : null}
                      </div>
                      <input
                        type="checkbox"
                        checked={!!form[field.key]}
                        disabled={isDisabled}
                        onChange={(event) => updateField(field.key, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                      );
                    })()
                  ))}
                </div>
              </Card>
              )}

              {activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL ? (
                <Card className="admin-panel-card" title="Item Line Name" style={{ animationDelay: "150ms" }}>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500">
                      Choose which name to print on the item line. If Alt Name is empty for an item, the Primary Name is used.
                    </p>
                    <CustomSelect
                      value={form.itemNameSource || 'PRIMARY'}
                      onChange={(value) => updateField('itemNameSource', value)}
                      options={ITEM_NAME_SOURCE_OPTIONS}
                    />
                  </div>
                </Card>
              ) : null}

              {/* ── Line-by-line Template Editor (Thermal only) ─────────────── */}
              {activeTemplate === PRINT_TEMPLATE_TYPES.THERMAL && templateLines !== null ? (
                <Card
                  className="admin-panel-card"
                  title={
                    <span className="flex items-center gap-2">
                      <Layers size={16} />
                      Receipt Layout Designer
                    </span>
                  }
                  style={{ animationDelay: '160ms' }}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Customize each line of the receipt — add, remove, reorder, and style every section. The live preview updates as you edit.
                    </p>

                    {/* Line rows */}
                    <div className="space-y-2">
                      {templateLines.map((line, index) => {
                        const supportsText = RECEIPT_LINE_CUSTOM_TEXT_TYPES.includes(line.type);
                        const isLogoLine   = line.type === 'LOGO';
                        const isItemTable  = line.type === 'ITEM_TABLE';
                        const isNoFormat   = NO_FORMAT_LINE_TYPES.includes(line.type);

                        // Parse ITEM_TABLE config stored in customText as JSON
                        let itemTableCfg = {};
                        if (isItemTable) {
                          try { itemTableCfg = JSON.parse(line.customText || '{}'); } catch { itemTableCfg = {}; }
                        }
                        const updateItemTableCfg = (key, val) => {
                          const next = { ...itemTableCfg, [key]: val };
                          updateTemplateLine(index, 'customText', JSON.stringify(next));
                        };

                        return (
                          <div
                            key={line.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            {/* Row 1: type selector + move + remove */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Field type */}
                              <select
                                value={line.type}
                                onChange={(e) => updateTemplateLine(index, 'type', e.target.value)}
                                className="h-9 flex-1 min-w-[140px] rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                              >
                                {RECEIPT_LINE_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>

                              {/* Font size — hidden for LOGO, SEPARATOR, BLANK, ITEM_TABLE */}
                              {!isNoFormat && !isLogoLine ? (
                                <select
                                  value={line.fontSize}
                                  onChange={(e) => updateTemplateLine(index, 'fontSize', Number(e.target.value))}
                                  className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                  {RECEIPT_LINE_FONT_SIZES.map((sz) => (
                                    <option key={sz} value={sz}>{sz}px</option>
                                  ))}
                                </select>
                              ) : null}

                              {/* Alignment — hidden for no-format types, ITEM_TABLE; LOGO uses L/C/R only */}
                              {!isNoFormat && !isItemTable ? (
                                <select
                                  value={isLogoLine && line.align === 'split' ? 'center' : line.align}
                                  onChange={(e) => updateTemplateLine(index, 'align', e.target.value)}
                                  className="h-9 w-[118px] rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                  {(isLogoLine ? LOGO_ALIGN_OPTIONS : RECEIPT_LINE_ALIGNMENT_OPTIONS).map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : null}

                              {/* Bold / Italic / Underline — text lines only, not for ITEM_TABLE */}
                              {!isNoFormat && !isLogoLine && !isItemTable ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateTemplateLine(index, 'bold', !line.bold)}
                                    title="Bold"
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition ${
                                      line.bold
                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                        : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                                    }`}
                                  >
                                    <Bold size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTemplateLine(index, 'italic', !line.italic)}
                                    title="Italic"
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition ${
                                      line.italic
                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                        : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                                    }`}
                                  >
                                    <Italic size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTemplateLine(index, 'underline', !line.underline)}
                                    title="Underline"
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition ${
                                      line.underline
                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                        : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                                    }`}
                                  >
                                    <Underline size={14} />
                                  </button>
                                </>
                              ) : null}

                              {/* Move up/down */}
                              <button
                                type="button"
                                onClick={() => moveTemplateLine(index, -1)}
                                disabled={index === 0}
                                title="Move up"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveTemplateLine(index, 1)}
                                disabled={index === templateLines.length - 1}
                                title="Move down"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <ArrowDown size={14} />
                              </button>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => removeTemplateLine(index)}
                                title="Remove line"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:border-red-400 hover:bg-red-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Row 2: custom text input (only for supported types) */}
                            {supportsText ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Type size={13} className="shrink-0 text-slate-400" />
                                <input
                                  type="text"
                                  value={line.customText || ''}
                                  onChange={(e) => updateTemplateLine(index, 'customText', e.target.value)}
                                  placeholder={
                                    line.type === 'CUSTOM_TEXT'
                                      ? 'Custom text here...'
                                      : line.type === 'THANKS_MESSAGE'
                                        ? 'e.g. Thank You, Come Again!'
                                        : 'Custom label (leave empty for default)'
                                  }
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                                />
                              </div>
                            ) : null}

                            {/* Row 2b: LOGO controls — width % + top spacing */}
                            {line.type === 'LOGO' ? (
                              <div className="mt-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <div>
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Logo Width</span>
                                    <span className="font-semibold text-slate-700">{form.logoWidthPercent}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="35"
                                    max="200"
                                    value={form.logoWidthPercent}
                                    onChange={(e) => updateField('logoWidthPercent', Number(e.target.value))}
                                    className="mt-1.5 w-full accent-blue-600"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Top Spacing</span>
                                    <span className="font-semibold text-slate-700">{form.logoTopSpacing}mm</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    value={form.logoTopSpacing}
                                    onChange={(e) => updateField('logoTopSpacing', Number(e.target.value))}
                                    className="mt-1.5 w-full accent-blue-600"
                                  />
                                </div>
                              </div>
                            ) : null}

                            {/* Row 2c: separator style picker */}
                            {line.type === 'SEPARATOR' ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-slate-400 shrink-0">Style</span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateTemplateLine(index, 'customText', '')}
                                    className={`h-7 px-3 rounded text-xs font-medium border transition ${
                                      line.customText?.trim() !== 'solid'
                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                        : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                                    }`}
                                  >
                                    - - - Dashed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTemplateLine(index, 'customText', 'solid')}
                                    className={`h-7 px-3 rounded text-xs font-medium border transition ${
                                      line.customText?.trim() === 'solid'
                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                        : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                                    }`}
                                  >
                                    ── Solid
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {/* Row 2d: ITEM_TABLE controls — strikethrough, qty unit */}
                            {isItemTable ? (
                              <div className="mt-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                {/* Strikethrough toggle */}
                                <label className="flex cursor-pointer items-center justify-between gap-3">
                                  <span className="text-xs text-slate-600">Show original price with strikethrough when discounted</span>
                                  <input
                                    type="checkbox"
                                    checked={itemTableCfg.showStrike !== false}
                                    onChange={(e) => updateItemTableCfg('showStrike', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </label>

                                {/* Qty unit toggle */}
                                <label className="flex cursor-pointer items-center justify-between gap-3">
                                  <span className="text-xs text-slate-600">Show unit label (e.g. PKT, BTL, KG) after qty</span>
                                  <input
                                    type="checkbox"
                                    checked={!!itemTableCfg.showQtyUnit}
                                    onChange={(e) => updateItemTableCfg('showQtyUnit', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </label>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add line button */}
                    <div className="flex items-center gap-3">
                      <select
                        value={addLineType}
                        onChange={(e) => setAddLineType(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {RECEIPT_LINE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => addTemplateLine(addLineType)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                      >
                        <Plus size={14} />
                        Add Line
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      Live preview updates on the right panel as you edit each line. Use the <strong>Thanks Message</strong> line type to add a footer message — type the text directly in the custom text field.
                    </p>
                  </div>
                </Card>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="admin-panel-card" title="Paper & Font" style={{ animationDelay: "170ms" }}>
                  <div className="space-y-5">
                    {/* Receipt font — thermal + KOT only */}
                    {activeTemplate !== PRINT_TEMPLATE_TYPES.A4 ? (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Receipt Font</label>
                        <div className="mt-1">
                          <CustomSelect
                            value={form.receiptFontFamily}
                            onChange={(value) => updateField('receiptFontFamily', value)}
                            options={RECEIPT_FONT_OPTIONS}
                            valueKey="value"
                            labelKey="label"
                            buttonClassName="h-[42px] rounded-xl px-4 py-2.5"
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* A4: invoice logo size slider */}
                    {activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? (
                      <div>
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <label className="font-medium">Invoice Logo Size</label>
                          <span>{form.invoiceLogoWidthPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="35"
                          max="200"
                          value={form.invoiceLogoWidthPercent}
                          onChange={(event) => updateField('invoiceLogoWidthPercent', Number(event.target.value))}
                          className="mt-3 w-full accent-blue-600"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Full invoice logo size is controlled separately from the thermal receipt.
                        </p>
                      </div>
                    ) : null}

                    {/* Paper width */}
                    {activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Paper Size</label>
                        <input
                          value="A4 (210 mm)"
                          disabled
                          readOnly
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-slate-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Full invoice uses fixed A4 width.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Paper Width</label>
                        <select
                          value={form.paperWidthMm}
                          onChange={(event) => updateField('paperWidthMm', Number(event.target.value))}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value={58}>58 mm</option>
                          <option value={72}>72 mm</option>
                          <option value={76}>76 mm</option>
                          <option value={80}>80 mm</option>
                          <option value={104}>104 mm</option>
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                          Match this to the actual paper roll width in your printer.
                        </p>
                      </div>
                    )}

                    {/* Currency symbol — thermal / KOT only */}
                    {activeTemplate !== PRINT_TEMPLATE_TYPES.A4 ? (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Currency Symbol</label>
                        <div className="mt-1 flex items-center gap-2">
                          {/* Quick-pick buttons */}
                          {['LKR', 'Rs', 'රු', '$', '€', '£'].map((sym) => (
                            <button
                              key={sym}
                              type="button"
                              onClick={() => updateField('currencySymbol', sym)}
                              className={`h-9 min-w-[44px] rounded-lg border px-2 text-sm font-medium transition ${
                                form.currencySymbol === sym
                                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                              }`}
                            >
                              {sym}
                            </button>
                          ))}
                          {/* Free-type input */}
                          <input
                            type="text"
                            maxLength={6}
                            value={form.currencySymbol || ''}
                            onChange={(e) => updateField('currencySymbol', e.target.value.slice(0, 6))}
                            placeholder="Custom"
                            className="h-9 w-20 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">Shown before prices on the receipt (max 6 chars).</p>
                      </div>
                    ) : null}
                  </div>
                </Card>

                {activeTemplate !== PRINT_TEMPLATE_TYPES.A4 ? (
                  <Card className="admin-panel-card" title="Direct Printer" style={{ animationDelay: "190ms" }}>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-slate-800">Use Local Printer Service</div>
                          <div className="text-xs text-slate-500">
                            {printAgentOnline ? 'Printer service connected on this device.' : 'Browser print fallback will be used if this is off or unavailable.'}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!form.directPrintEnabled}
                          onChange={(event) => updateField('directPrintEnabled', event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      <div>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-slate-700">Printer</label>
                          <Button type="button" size="sm" variant="secondary" onClick={() => loadPrinters()} disabled={printerLoading}>
                            <RefreshCw size={14} className={`mr-1 ${printerLoading ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                        <CustomSelect
                          value={form.printerName}
                          onChange={(value) => updateField('printerName', value)}
                          options={printerOptions}
                          valueKey="value"
                          labelKey="label"
                          placeholder={printAgentOnline ? 'Select installed printer' : 'Printer service offline'}
                          disabled={!printAgentOnline || printerLoading}
                          buttonClassName="h-[42px] rounded-xl px-4 py-2.5"
                          emptyMessage="No printers found"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">Copies</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={form.printerCopies}
                          onChange={(event) => updateField('printerCopies', Number(event.target.value))}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <Button type="button" variant="secondary" onClick={handleTestPrint} disabled={!form.printerName || printerTesting}>
                        <Printer size={16} className="mr-2" />
                        {printerTesting ? 'Printing...' : 'Test Print'}
                      </Button>
                    </div>
                  </Card>
                ) : null}

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
            <Card className="ops-alert-card">
              <div className="py-20 text-center text-slate-500">
                Preview appears after selecting a single branch from the header.
              </div>
            </Card>
          ) : (
            <div className="admin-panel-card" style={{ animationDelay: "120ms" }}>
            <ReceiptPreview
              branch={activeBranch}
              storeName={user?.shopName || BRAND_NAME_UPPER}
              settings={form}
              templateType={activeTemplate}
              templateLines={templateLines}
            />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettingsPage;
