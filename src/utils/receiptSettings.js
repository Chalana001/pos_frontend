// ─── Receipt Template Line Types ───────────────────────────────────────────

export const RECEIPT_LINE_TYPES = [
  'LOGO',
  'STORE_NAME',
  'BRANCH_NAME',
  'ADDRESS',
  'PHONE',
  'INVOICE_NO',
  'DATE_TIME',
  'CASHIER',
  'CUSTOMER',
  'ITEM_TABLE',
  'SUBTOTAL',
  'DISCOUNT',
  'NET_TOTAL',
  'PAID',
  'BALANCE',
  'CREDIT_DUE',
  'THANKS_MESSAGE',
  'CUSTOM_TEXT',
  'SEPARATOR',
  'BLANK',
];

export const RECEIPT_LINE_TYPE_OPTIONS = [
  { value: 'LOGO',           label: 'Logo' },
  { value: 'STORE_NAME',     label: 'Store Name' },
  { value: 'BRANCH_NAME',    label: 'Branch Name' },
  { value: 'ADDRESS',        label: 'Address' },
  { value: 'PHONE',          label: 'Phone' },
  { value: 'INVOICE_NO',     label: 'Invoice Number' },
  { value: 'DATE_TIME',      label: 'Date & Time' },
  { value: 'CASHIER',        label: 'Cashier' },
  { value: 'CUSTOMER',       label: 'Customer' },
  { value: 'ITEM_TABLE',     label: 'Item Table' },
  { value: 'SUBTOTAL',       label: 'Subtotal' },
  { value: 'DISCOUNT',       label: 'Discount' },
  { value: 'NET_TOTAL',      label: 'Net Total' },
  { value: 'PAID',           label: 'Paid Amount' },
  { value: 'BALANCE',        label: 'Balance' },
  { value: 'CREDIT_DUE',     label: 'Credit Due' },
  { value: 'THANKS_MESSAGE', label: 'Thanks Message' },
  { value: 'CUSTOM_TEXT',    label: 'Custom Text' },
  { value: 'SEPARATOR',      label: 'Line / Separator' },
  { value: 'BLANK',          label: 'Blank Space' },
];

export const RECEIPT_LINE_ALIGNMENT_OPTIONS = [
  { value: 'split',  label: 'Amount Right' },
  { value: 'left',   label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right',  label: 'Right' },
];

export const RECEIPT_LINE_FONT_SIZES = Array.from({ length: 17 }, (_, i) => i + 8);

/** Types that support a custom label / text override */
export const RECEIPT_LINE_CUSTOM_TEXT_TYPES = [
  'ADDRESS', 'PHONE', 'INVOICE_NO', 'DATE_TIME', 'CASHIER', 'CUSTOMER',
  'SUBTOTAL', 'DISCOUNT', 'NET_TOTAL', 'PAID', 'BALANCE', 'CREDIT_DUE',
  'THANKS_MESSAGE', 'CUSTOM_TEXT',
];

const _createLineId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pos-line-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Create a new receipt template line with smart defaults.
 */
export const createReceiptTemplateLine = (type = 'CUSTOM_TEXT') => {
  const centerAligned = ['LOGO', 'STORE_NAME', 'BRANCH_NAME', 'ADDRESS', 'PHONE', 'INVOICE_NO', 'DATE_TIME', 'CASHIER', 'CUSTOMER', 'CREDIT_DUE', 'THANKS_MESSAGE'];
  const splitAligned  = ['SUBTOTAL', 'DISCOUNT', 'NET_TOTAL', 'PAID', 'BALANCE'];
  const boldTypes     = ['STORE_NAME', 'INVOICE_NO', 'NET_TOTAL', 'CREDIT_DUE'];
  return {
    id: _createLineId(),
    type,
    customText: '',
    align: splitAligned.includes(type) ? 'split' : centerAligned.includes(type) ? 'center' : 'left',
    fontSize: type === 'STORE_NAME' ? 16 : type === 'NET_TOTAL' ? 14 : 11,
    bold: boldTypes.includes(type),
    italic: false,
    underline: false,
  };
};

const _normalizeTemplateLine = (line, index) => {
  const allowedAligns = ['split', 'left', 'center', 'right'];
  if (!line.type || !RECEIPT_LINE_TYPES.includes(line.type)) return null;
  return {
    id: line.id || `pos-line-${index}`,
    type: line.type,
    customText: String(line.customText || ''),
    align: allowedAligns.includes(line.align) ? line.align : 'left',
    fontSize: Math.max(8, Math.min(24, Number(line.fontSize) || 11)),
    bold: Boolean(line.bold),
    italic: Boolean(line.italic),
    underline: Boolean(line.underline),
  };
};

/**
 * Parse the raw `templateLines` JSON string (from DB/API) into an array.
 */
export const parseTemplateLines = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((l, i) => _normalizeTemplateLine(l, i)).filter(Boolean);
  } catch {
    return [];
  }
};

/**
 * Build the default template lines from the existing boolean toggles.
 * Used as a fallback when no templateLines have been configured yet.
 */
export const buildLegacyTemplateLines = (settings) => {
  const s = settings || {};
  const mk = (type, overrides = {}) => ({ ...createReceiptTemplateLine(type), ...overrides });
  const lines = [];

  if (s.showLogo)        lines.push(mk('LOGO',        { id: 'def-logo',   align: 'center' }));
  if (s.showStoreName)   lines.push(mk('STORE_NAME',  { id: 'def-store',  align: 'center', fontSize: 16, bold: true }));
  if (s.showBranchName)  lines.push(mk('BRANCH_NAME', { id: 'def-branch', align: 'center' }));
  if (s.showAddress)     lines.push(mk('ADDRESS',     { id: 'def-addr',   align: 'center' }));
  if (s.showPhone)       lines.push(mk('PHONE',       { id: 'def-phone',  align: 'center' }));

  if (s.showInvoiceNumber || s.showDateTime || s.showCashier || s.showCustomer) {
    lines.push(mk('SEPARATOR', { id: 'def-sep1' }));
  }
  if (s.showInvoiceNumber) lines.push(mk('INVOICE_NO', { id: 'def-invno', align: 'center', fontSize: 12, bold: true }));
  if (s.showDateTime)      lines.push(mk('DATE_TIME',  { id: 'def-dt',    align: 'center' }));
  if (s.showCashier)       lines.push(mk('CASHIER',    { id: 'def-cash',  align: 'left' }));
  if (s.showCustomer)      lines.push(mk('CUSTOMER',   { id: 'def-cust',  align: 'left' }));

  if (s.showItemTable) {
    lines.push(mk('SEPARATOR',  { id: 'def-sep2' }));
    lines.push(mk('ITEM_TABLE', { id: 'def-table' }));
  }

  lines.push(mk('SEPARATOR', { id: 'def-sep3' }));
  if (s.showSubtotal)  lines.push(mk('SUBTOTAL',  { id: 'def-sub',  align: 'split' }));
  if (s.showDiscount)  lines.push(mk('DISCOUNT',  { id: 'def-disc', align: 'split', bold: true }));
  if (s.showNetTotal)  lines.push(mk('NET_TOTAL', { id: 'def-net',  align: 'split', bold: true, fontSize: 14 }));
  if (s.showPaid)      lines.push(mk('PAID',      { id: 'def-paid', align: 'split' }));
  if (s.showBalance)   lines.push(mk('BALANCE',   { id: 'def-bal',  align: 'split' }));
  if (s.showDueAmount) lines.push(mk('CREDIT_DUE', { id: 'def-due', align: 'center', bold: true, fontSize: 12 }));

  if (s.showThanksMessage) {
    lines.push(mk('SEPARATOR',      { id: 'def-sep4' }));
    // customText intentionally empty — renderer uses settings.thanksMessage so the field stays live
    lines.push(mk('THANKS_MESSAGE', { id: 'def-thanks', align: 'center', fontSize: 10, customText: '' }));
  }

  return lines;
};

/**
 * Resolve the active template lines for a settings object.
 * Configured JSON → parse it. No JSON → build from boolean toggles.
 */
export const getActiveTemplateLines = (settings) => {
  const parsed = parseTemplateLines(settings?.templateLines);
  if (parsed.length > 0) return parsed;
  return buildLegacyTemplateLines(settings);
};

// ─── END Receipt Template Line Helpers ─────────────────────────────────────

export const PRINT_TEMPLATE_TYPES = {
  THERMAL: 'THERMAL',
  A4: 'A4',
  KOT: 'KOT',
};

export const ITEM_NAME_SOURCE_OPTIONS = [
  { value: 'PRIMARY', label: 'Primary Name' },
  { value: 'ALT', label: 'Alt Name (e.g. Sinhala)' },
];

export const RECEIPT_FONT_OPTIONS = [
  { value: 'COURIER_NEW', label: 'Courier New' },
  { value: 'ARIAL', label: 'Arial' },
  { value: 'VERDANA', label: 'Verdana' },
  { value: 'TAHOMA', label: 'Tahoma' },
];

export const DEFAULT_RECEIPT_SETTINGS = {
  templateType: PRINT_TEMPLATE_TYPES.THERMAL,
  showLogo: true,
  showStoreName: true,
  showBranchName: true,
  showAddress: true,
  showAddressLabel: true,
  showPhone: true,
  showPhoneLabel: true,
  showInvoiceNumber: true,
  showDateTime: true,
  showCashier: true,
  showCustomer: true,
  showItemTable: true,
  showWarranty: true,
  showSubtotal: true,
  showDiscount: true,
  showLineDiscount: true,
  showNetTotal: true,
  showPaid: true,
  showBalance: true,
  showDueAmount: true,
  showThanksMessage: true,
  showCredits: true,
  logoWidthPercent: 78,
  logoTopSpacing: 4,
  invoiceLogoWidthPercent: 78,
  receiptFontFamily: RECEIPT_FONT_OPTIONS[0].value,
  paperWidthMm: 72,
  directPrintEnabled: false,
  printerName: '',
  printerCopies: 1,
  thanksMessage: 'Thank You, Come Again!',
  creditsLine1: 'SOFTWARE BY ZENSYS SOLUTIONS',
  creditsLine2: 'Smart Retail Solutions | 0704589764',
  itemNameSource: 'PRIMARY',
  templateLines: null,
  currencySymbol: 'LKR',
};

export const normalizeReceiptSettings = (settings) => {
  const merged = {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...(settings || {}),
  };

  return {
    ...merged,
    showCredits: true,
    creditsLine1: 'SOFTWARE BY ZENSYS SOLUTIONS',
    creditsLine2: 'Smart Retail Solutions | 0704589764',
    logoWidthPercent: Math.min(200, Math.max(35, Number(merged.logoWidthPercent) || DEFAULT_RECEIPT_SETTINGS.logoWidthPercent)),
    logoTopSpacing: Math.min(20, Math.max(0, Number(merged.logoTopSpacing) || 0)),
    invoiceLogoWidthPercent: Math.min(200, Math.max(35, Number(merged.invoiceLogoWidthPercent) || DEFAULT_RECEIPT_SETTINGS.invoiceLogoWidthPercent)),
    receiptFontFamily: RECEIPT_FONT_OPTIONS.some((option) => option.value === merged.receiptFontFamily)
      ? merged.receiptFontFamily
      : DEFAULT_RECEIPT_SETTINGS.receiptFontFamily,
    paperWidthMm: Math.min(210, Math.max(48, Number(merged.paperWidthMm) || DEFAULT_RECEIPT_SETTINGS.paperWidthMm)),
    directPrintEnabled: !!merged.directPrintEnabled,
    printerName: String(merged.printerName || '').trim(),
    printerCopies: Math.min(10, Math.max(1, Number(merged.printerCopies) || 1)),
    thanksMessage: (merged.thanksMessage || DEFAULT_RECEIPT_SETTINGS.thanksMessage).trim(),
    itemNameSource: ITEM_NAME_SOURCE_OPTIONS.some((o) => o.value === merged.itemNameSource)
      ? merged.itemNameSource
      : 'PRIMARY',
    templateLines: merged.templateLines ?? null,
    currencySymbol: ((merged.currencySymbol || '').trim().slice(0, 6)) || 'LKR',
  };
};

export const getReceiptSettingsDefaults = (templateType = PRINT_TEMPLATE_TYPES.THERMAL) =>
  normalizeReceiptSettings({
    ...DEFAULT_RECEIPT_SETTINGS,
    templateType,
    paperWidthMm: templateType === PRINT_TEMPLATE_TYPES.A4 ? 210 : DEFAULT_RECEIPT_SETTINGS.paperWidthMm,
  });

export const RECEIPT_SECTION_FIELDS = [
  { key: 'showLogo', label: 'Shop Logo' },
  { key: 'showStoreName', label: 'Store Name' },
  { key: 'showBranchName', label: 'Branch Name' },
  { key: 'showAddress', label: 'Address' },
  { key: 'showAddressLabel', label: 'Address Label' },
  { key: 'showPhone', label: 'Phone' },
  { key: 'showPhoneLabel', label: 'Phone Label' },
  { key: 'showInvoiceNumber', label: 'Invoice Number' },
  { key: 'showDateTime', label: 'Date & Time' },
  { key: 'showCashier', label: 'Cashier' },
  { key: 'showCustomer', label: 'Customer' },
  { key: 'showItemTable', label: 'Item Table' },
  { key: 'showWarranty', label: 'Warranty' },
  { key: 'showSubtotal', label: 'Subtotal' },
  { key: 'showDiscount', label: 'Discount' },
  { key: 'showLineDiscount', label: 'Line Item Discounts' },
  { key: 'showNetTotal', label: 'Net Total' },
  { key: 'showPaid', label: 'Paid' },
  { key: 'showBalance', label: 'Balance' },
  { key: 'showDueAmount', label: 'Credit Due' },
  { key: 'showThanksMessage', label: 'Thanks Message' },
  { key: 'showCredits', label: 'Credits', locked: true },
];
