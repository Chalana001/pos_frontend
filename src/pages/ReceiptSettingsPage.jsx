import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Printer, Save, Ticket, FileText, ChefHat, Plus, Pencil, Trash2 } from 'lucide-react';

import Card from '../components/common/Card';
import Button from '../components/common/Button';
import CustomSelect from '../components/common/CustomSelect';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReceiptTemplate from '../components/receipt/ReceiptTemplate';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettingsDefaults,
  normalizeReceiptSettings,
  PRINT_TEMPLATE_TYPES,
  RECEIPT_SECTION_FIELDS,
} from '../utils/receiptSettings';
import { receiptSettingsAPI } from '../api/receiptSettings.api';
import { BRAND_NAME_UPPER } from '../utils/branding';
import { diningTablesAPI } from '../api/diningTables.api';
import { hasPlanFeature } from '../utils/subscriptionFeatures';

const toSavePayload = (settings, templateType) => {
  const normalized = normalizeReceiptSettings(settings);

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
    showSubtotal: normalized.showSubtotal,
    showDiscount: normalized.showDiscount,
    showNetTotal: normalized.showNetTotal,
    showPaid: normalized.showPaid,
    showBalance: normalized.showBalance,
    showDueAmount: normalized.showDueAmount,
    showThanksMessage: normalized.showThanksMessage,
    showCredits: true,
    logoWidthPercent: normalized.logoWidthPercent,
    invoiceLogoWidthPercent: normalized.invoiceLogoWidthPercent,
    paperWidthMm: templateType === PRINT_TEMPLATE_TYPES.A4 ? 210 : normalized.paperWidthMm,
    thanksMessage: normalized.thanksMessage,
    creditsLine1: normalized.creditsLine1,
    creditsLine2: normalized.creditsLine2,
  };
};

const INITIAL_TABLE_FORM = {
  id: null,
  tableName: '',
  status: 'AVAILABLE',
};

const tableStatusOptions = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
];

const ReceiptPreview = ({ branch, storeName, settings, templateType }) => {
  const normalized = normalizeReceiptSettings({
    ...settings,
    paperWidthMm: templateType === PRINT_TEMPLATE_TYPES.A4 ? 210 : settings?.paperWidthMm,
  });
  const isKotPreview = templateType === PRINT_TEMPLATE_TYPES.KOT;
  const isInvoicePreview = templateType === PRINT_TEMPLATE_TYPES.A4;
  const previewPaperWidthPx = Math.round(normalized.paperWidthMm * 3.78);
  const invoicePreviewScale = isInvoicePreview ? Math.min(1, 380 / previewPaperWidthPx) : 1;
  const previewOrder = isKotPreview
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
        subTotal: 620,
        billDiscount: 20,
        grandTotal: 600,
        paidAmount: 400,
        dueAmount: 200,
        orderType: 'CASH + CREDIT',
        saleMode: 'TAKEAWAY',
      };
  const previewItems = isKotPreview
    ? [
        { name: 'Chicken Fried Rice', qty: 2, qtyUnit: 'PCS', unitPrice: 0, lineTotal: 0 },
        { name: 'Devilled Chicken', qty: 1, qtyUnit: 'PCS', unitPrice: 0, lineTotal: 0 },
        { name: 'Lime Juice', qty: 3, qtyUnit: 'PCS', unitPrice: 0, lineTotal: 0 },
      ]
    : [
        { name: 'White Rice', qty: 1.5, qtyUnit: 'KG', unitPrice: 240, lineTotal: 360 },
        { name: 'Egg Pack', qty: 2, qtyUnit: 'PCS', unitPrice: 55, lineTotal: 110 },
        { name: 'Delivery Charge', qty: 1, qtyUnit: 'SERVICE', unitPrice: 150, lineTotal: 150 },
      ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-5 shadow-sm">
      <div
        className="mx-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(148,163,184,0.18)]"
        style={{ maxWidth: `${previewPaperWidthPx + 40}px` }}
      >
        <div className="mx-auto overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
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
        </div>
      </div>
    </div>
  );
};

const ReceiptSettingsPage = () => {
  const { user } = useAuth();
  const { branches, selectedBranchId } = useBranch();
  const canUseDining = hasPlanFeature(user?.planName, 'DINING_TABLES');
  const branchOptions = useMemo(() => branches.filter((branch) => Number(branch.id) !== 0), [branches]);
  const branchSelectionRequired = !selectedBranchId || Number(selectedBranchId) === 0;
  const activeBranch = useMemo(
    () => branchOptions.find((branch) => Number(branch.id) === Number(selectedBranchId)) || null,
    [branchOptions, selectedBranchId]
  );

  const [activeTemplate, setActiveTemplate] = useState(PRINT_TEMPLATE_TYPES.THERMAL);
  const [form, setForm] = useState(getReceiptSettingsDefaults(PRINT_TEMPLATE_TYPES.THERMAL));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableSaving, setTableSaving] = useState(false);
  const [tableDeletingId, setTableDeletingId] = useState(null);
  const [tableForm, setTableForm] = useState(INITIAL_TABLE_FORM);

  useEffect(() => {
    if (branchSelectionRequired || !activeBranch?.id) {
      setForm(getReceiptSettingsDefaults(activeTemplate));
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await receiptSettingsAPI.getByBranch(activeBranch.id, activeTemplate);
        setForm(normalizeReceiptSettings({
          ...response.data,
          paperWidthMm: activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 210 : response.data?.paperWidthMm,
        }));
      } catch (error) {
        console.error(error);
        toast.error('Failed to load receipt settings');
        setForm(getReceiptSettingsDefaults(activeTemplate));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [activeBranch, activeTemplate, branchSelectionRequired]);

  useEffect(() => {
    if (!canUseDining || branchSelectionRequired || !activeBranch?.id) {
      setTables([]);
      setTableForm(INITIAL_TABLE_FORM);
      setTablesLoading(false);
      return;
    }

    const loadTables = async () => {
      try {
        setTablesLoading(true);
        const response = await diningTablesAPI.listByBranch(activeBranch.id);
        setTables(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load dining tables');
        setTables([]);
      } finally {
        setTablesLoading(false);
      }
    };

    loadTables();
  }, [activeBranch, branchSelectionRequired, canUseDining]);

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
      const payload = toSavePayload(form, activeTemplate);
      const response = await receiptSettingsAPI.updateByBranch(activeBranch.id, payload, activeTemplate);
      setForm(normalizeReceiptSettings({
        ...response.data,
        paperWidthMm: activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 210 : response.data?.paperWidthMm,
      }));
      toast.success(activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 'Invoice layout saved' : 'Receipt layout saved');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save receipt settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(getReceiptSettingsDefaults(activeTemplate));
  };

  const resetTableForm = () => {
    setTableForm(INITIAL_TABLE_FORM);
  };

  const handleSaveTable = async () => {
    if (!canUseDining) {
      toast.error('Tables are not available in this package');
      return;
    }
    if (branchSelectionRequired || !activeBranch?.id) {
      toast.error('Select a branch from the header first');
      return;
    }

    if (!tableForm.tableName.trim()) {
      toast.error('Table name is required');
      return;
    }

    try {
      setTableSaving(true);
      if (tableForm.id) {
        await diningTablesAPI.update(tableForm.id, {
          tableName: tableForm.tableName.trim(),
          status: tableForm.status,
        });
        toast.success('Dining table updated');
      } else {
        await diningTablesAPI.create({
          branchId: activeBranch.id,
          tableName: tableForm.tableName.trim(),
          status: tableForm.status,
        });
        toast.success('Dining table added');
      }

      const response = await diningTablesAPI.listByBranch(activeBranch.id);
      setTables(Array.isArray(response.data) ? response.data : []);
      resetTableForm();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save dining table');
    } finally {
      setTableSaving(false);
    }
  };

  const handleEditTable = (table) => {
    setTableForm({
      id: table.id,
      tableName: table.tableName || '',
      status: table.status || 'AVAILABLE',
    });
  };

  const handleDeleteTable = async (tableId) => {
    if (!activeBranch?.id) {
      return;
    }

    try {
      setTableDeletingId(tableId);
      await diningTablesAPI.remove(tableId);
      toast.success('Dining table deleted');
      const response = await diningTablesAPI.listByBranch(activeBranch.id);
      setTables(Array.isArray(response.data) ? response.data : []);
      if (Number(tableForm.id) === Number(tableId)) {
        resetTableForm();
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to delete dining table');
    } finally {
      setTableDeletingId(null);
    }
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
            Configure branch-wise thermal receipt, full invoice, kitchen ticket, and dining table settings.
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
                  onClick={() => setActiveTemplate(PRINT_TEMPLATE_TYPES.KOT)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTemplate === PRINT_TEMPLATE_TYPES.KOT
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
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

                  <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Logo & Paper">
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <label className="font-medium">{activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 'Invoice Logo Size' : 'Logo Size'}</label>
                        <span>{activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? form.invoiceLogoWidthPercent : form.logoWidthPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="35"
                        max="200"
                        value={activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? form.invoiceLogoWidthPercent : form.logoWidthPercent}
                        onChange={(event) => updateField(
                          activeTemplate === PRINT_TEMPLATE_TYPES.A4 ? 'invoiceLogoWidthPercent' : 'logoWidthPercent',
                          Number(event.target.value)
                        )}
                        className="mt-3 w-full accent-blue-600"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        {activeTemplate === PRINT_TEMPLATE_TYPES.A4
                          ? 'Full invoice logo size is controlled separately from the thermal receipt.'
                          : 'Uploaded logos will auto-fit to this width, so every branch prints in a consistent size.'}
                      </p>
                    </div>

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
                          Full invoice uses fixed A4 width. Other visible sections still follow your saved layout settings.
                        </p>
                      </div>
                    ) : (
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
                    )}
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

              {canUseDining && (
              <Card
                title="Dining Tables"
                action={tableForm.id ? (
                  <Button variant="secondary" size="sm" onClick={resetTableForm}>
                    Cancel Edit
                  </Button>
                ) : null}
              >
                {tablesLoading ? (
                  <div className="py-10">
                    <LoadingSpinner text="Loading dining tables..." />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_120px]">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Table Name</label>
                        <input
                          value={tableForm.tableName}
                          onChange={(event) => setTableForm((prev) => ({ ...prev, tableName: event.target.value }))}
                          placeholder="Table 01"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">Status</label>
                        <CustomSelect
                          value={tableForm.status}
                          onChange={(value) => setTableForm((prev) => ({ ...prev, status: value }))}
                          options={tableStatusOptions}
                          valueKey="value"
                          labelKey="label"
                          className="mt-1"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button onClick={handleSaveTable} disabled={tableSaving} className="w-full">
                          <Plus size={16} className="mr-2" />
                          {tableSaving ? 'Saving...' : tableForm.id ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {tables.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                          No dining tables added for this branch yet.
                        </div>
                      ) : (
                        tables.map((table) => (
                          <div key={table.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-slate-900">{table.tableName}</div>
                                <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                                  table.status === 'OCCUPIED'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {table.status}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditTable(table)}
                                  className="rounded-lg bg-white p-2 text-slate-500 transition hover:text-blue-600"
                                  title="Edit table"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTable(table.id)}
                                  disabled={tableDeletingId === table.id}
                                  className="rounded-lg bg-white p-2 text-slate-500 transition hover:text-red-600 disabled:opacity-50"
                                  title="Delete table"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </Card>
              )}
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
              storeName={user?.shopName || BRAND_NAME_UPPER}
              settings={form}
              templateType={activeTemplate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettingsPage;
