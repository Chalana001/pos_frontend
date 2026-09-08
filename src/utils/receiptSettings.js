// ─── Receipt Template Line Types ───────────────────────────────────────────

export const RECEIPT_LINE_TYPES = [
  'LOGO',
  'PRINT_MARK',
  'RETURN_NO',
  'ORIGINAL_INVOICE',
  'RETURN_ITEM_TABLE',
  'TOTAL_REFUND',
  'REFUND_METHOD',
  'RETURN_REASON',
  'CASHIER_NOTE',
  'LOYALTY_TAKEN_BACK',
  'LOYALTY_GIVEN_BACK',
  'TOTAL_SAVINGS',
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
  'LOYALTY_REDEEMED',
  'LOYALTY_DISCOUNT',
  'LOYALTY_EARNED',
  'LOYALTY_BALANCE',
  'THANKS_MESSAGE',
  'CUSTOM_TEXT',
  'SEPARATOR',
  'BLANK',
];

/**
 * What a sale receipt can be built from.
 *
 * <p>Return-only lines are deliberately not in here. A shop laying out its sale slip should not
 * scroll past "Total Refund" to reach "Net Total" — the two documents share a header and almost
 * nothing else. `lineTypeOptionsFor` hands the designer the right list for the tab it is on.
 */
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
  { value: 'LOYALTY_REDEEMED', label: 'Points Used (count)' },
  { value: 'LOYALTY_DISCOUNT', label: 'Points Discount (value)' },
  { value: 'LOYALTY_EARNED',   label: 'Points Earned' },
  { value: 'LOYALTY_BALANCE',  label: 'Points Balance' },
  { value: 'TOTAL_SAVINGS',  label: 'You Saved (discounts + points)' },
  { value: 'THANKS_MESSAGE', label: 'Thanks Message' },
  { value: 'CUSTOM_TEXT',    label: 'Custom Text' },
  { value: 'PRINT_MARK',     label: 'Original / Copy Mark' },
  { value: 'SEPARATOR',      label: 'Line / Separator' },
  { value: 'BLANK',          label: 'Blank Space' },
];

/** What a return receipt can be built from. Shares the header lines and nothing about money. */
export const RETURN_LINE_TYPE_OPTIONS = [
  { value: 'LOGO',             label: 'Logo' },
  { value: 'STORE_NAME',       label: 'Store Name' },
  { value: 'BRANCH_NAME',      label: 'Branch Name' },
  { value: 'ADDRESS',          label: 'Address' },
  { value: 'PHONE',            label: 'Phone' },
  { value: 'PRINT_MARK',       label: 'Original / Copy Mark' },
  { value: 'RETURN_NO',        label: 'Return Number' },
  { value: 'ORIGINAL_INVOICE', label: 'Original Invoice' },
  { value: 'DATE_TIME',        label: 'Date & Time' },
  { value: 'CASHIER',          label: 'Cashier' },
  { value: 'CUSTOMER',         label: 'Customer' },
  { value: 'RETURN_ITEM_TABLE', label: 'Returned Items' },
  { value: 'TOTAL_REFUND',     label: 'Total Refund' },
  { value: 'REFUND_METHOD',    label: 'Refund Method' },
  { value: 'RETURN_REASON',    label: 'Reason' },
  { value: 'CASHIER_NOTE',     label: 'Cashier Note' },
  { value: 'LOYALTY_TAKEN_BACK', label: 'Points Taken Back' },
  { value: 'LOYALTY_GIVEN_BACK', label: 'Points Returned' },
  { value: 'LOYALTY_BALANCE',  label: 'Points Balance' },
  { value: 'THANKS_MESSAGE',   label: 'Closing Message' },
  { value: 'CUSTOM_TEXT',      label: 'Custom Text' },
  { value: 'SEPARATOR',        label: 'Line / Separator' },
  { value: 'BLANK',            label: 'Blank Space' },
];

/** The list the designer offers, for the tab it is on. */
export const lineTypeOptionsFor = (templateType) =>
  templateType === 'RETURN' ? RETURN_LINE_TYPE_OPTIONS : RECEIPT_LINE_TYPE_OPTIONS;

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
  'LOYALTY_REDEEMED', 'LOYALTY_DISCOUNT', 'LOYALTY_EARNED', 'LOYALTY_BALANCE',
  'RETURN_NO', 'ORIGINAL_INVOICE', 'TOTAL_REFUND', 'REFUND_METHOD', 'RETURN_REASON',
  'CASHIER_NOTE', 'LOYALTY_TAKEN_BACK', 'LOYALTY_GIVEN_BACK', 'TOTAL_SAVINGS',
  // On PRINT_MARK the text is the heading, and a reprint appends the copy wording to it.
  'PRINT_MARK',
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
  const centerAligned = ['LOGO', 'STORE_NAME', 'BRANCH_NAME', 'ADDRESS', 'PHONE', 'INVOICE_NO', 'DATE_TIME', 'CASHIER', 'CUSTOMER', 'CREDIT_DUE', 'THANKS_MESSAGE', 'PRINT_MARK'];
  const splitAligned  = ['SUBTOTAL', 'DISCOUNT', 'NET_TOTAL', 'PAID', 'BALANCE',
    'LOYALTY_REDEEMED', 'LOYALTY_DISCOUNT', 'LOYALTY_EARNED', 'LOYALTY_BALANCE',
    'RETURN_NO', 'ORIGINAL_INVOICE', 'TOTAL_REFUND', 'REFUND_METHOD', 'RETURN_REASON',
    'CASHIER_NOTE', 'LOYALTY_TAKEN_BACK', 'LOYALTY_GIVEN_BACK', 'TOTAL_SAVINGS'];
  const boldTypes     = ['STORE_NAME', 'INVOICE_NO', 'NET_TOTAL', 'CREDIT_DUE', 'PRINT_MARK',
    'TOTAL_REFUND'];
  return {
    id: _createLineId(),
    type,
    customText: '',
    align: splitAligned.includes(type) ? 'split' : centerAligned.includes(type) ? 'center' : 'left',
    fontSize: type === 'STORE_NAME' ? 16 : (type === 'NET_TOTAL' || type === 'TOTAL_REFUND') ? 14 : 11,
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
  // Which print this is. A reprint is otherwise indistinguishable from the slip it copies.
  lines.push(mk('PRINT_MARK', { id: 'def-mark', align: 'center', fontSize: 10, bold: true }));
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
  // Points spent came off the grand total already, so the row belongs above it — otherwise
  // the slip shows a net total the numbers above it do not add up to.
  lines.push(mk('LOYALTY_DISCOUNT', { id: 'def-lpdisc', align: 'split' }));
  if (s.showNetTotal)  lines.push(mk('NET_TOTAL', { id: 'def-net',  align: 'split', bold: true, fontSize: 14 }));
  if (s.showPaid)      lines.push(mk('PAID',      { id: 'def-paid', align: 'split' }));
  if (s.showBalance)   lines.push(mk('BALANCE',   { id: 'def-bal',  align: 'split' }));
  if (s.showDueAmount) lines.push(mk('CREDIT_DUE', { id: 'def-due', align: 'center', bold: true, fontSize: 12 }));

  // What the sale earned and what is left are news, not money, so they come after the totals.
  // Neither needs a toggle: a sale that moved no points prints neither.
  lines.push(mk('LOYALTY_EARNED',   { id: 'def-lpearn', align: 'split' }));
  lines.push(mk('LOYALTY_BALANCE',  { id: 'def-lpbal',  align: 'split' }));

  if (s.showThanksMessage) {
    lines.push(mk('SEPARATOR',      { id: 'def-sep4' }));
    // customText intentionally empty — renderer uses settings.thanksMessage so the field stays live
    lines.push(mk('THANKS_MESSAGE', { id: 'def-thanks', align: 'center', fontSize: 10, customText: '' }));
  }

  return lines;
};

/**
 * The return slip as it printed before it was customisable.
 *
 * <p>A shop that never opens the Return tab gets this, and it reproduces the old hard-coded
 * layout line for line — so making the receipt customisable changes nothing for anyone who
 * does not customise it.
 */
export const buildLegacyReturnTemplateLines = () => {
  const mk = (type, overrides = {}) => ({ ...createReceiptTemplateLine(type), ...overrides });
  return [
    mk('LOGO',             { id: 'ret-logo',   align: 'center' }),
    mk('BRANCH_NAME',      { id: 'ret-branch', align: 'center', fontSize: 13, bold: true }),
    mk('ADDRESS',          { id: 'ret-addr',   align: 'center', fontSize: 10 }),
    mk('PHONE',            { id: 'ret-phone',  align: 'center', fontSize: 10 }),
    mk('SEPARATOR',        { id: 'ret-sep1' }),
    // The heading only. A reprint of this slip prints "RETURN RECEIPT (COPY)" on its own.
    mk('PRINT_MARK',       { id: 'ret-mark',   align: 'center', fontSize: 12, bold: true,
                             customText: 'RETURN RECEIPT' }),
    mk('SEPARATOR',        { id: 'ret-sep2' }),
    mk('RETURN_NO',        { id: 'ret-no',     align: 'split', fontSize: 10, bold: true }),
    mk('ORIGINAL_INVOICE', { id: 'ret-inv',    align: 'split', fontSize: 10 }),
    mk('DATE_TIME',        { id: 'ret-dt',     align: 'split', fontSize: 10, customText: 'Date' }),
    mk('CUSTOMER',         { id: 'ret-cust',   align: 'split', fontSize: 10 }),
    mk('CASHIER',          { id: 'ret-cash',   align: 'split', fontSize: 10 }),
    mk('SEPARATOR',        { id: 'ret-sep3' }),
    mk('RETURN_ITEM_TABLE', { id: 'ret-table' }),
    mk('TOTAL_REFUND',     { id: 'ret-total',  align: 'split', fontSize: 12, bold: true }),
    mk('SEPARATOR',        { id: 'ret-sep4' }),
    mk('REFUND_METHOD',    { id: 'ret-method', align: 'split', fontSize: 10, bold: true }),
    mk('RETURN_REASON',    { id: 'ret-reason', align: 'split', fontSize: 10 }),
    mk('CASHIER_NOTE',     { id: 'ret-note',   align: 'split', fontSize: 10 }),
    // Each of these prints nothing on a return that moved no points.
    mk('LOYALTY_TAKEN_BACK', { id: 'ret-lpback', align: 'split', fontSize: 10 }),
    mk('LOYALTY_GIVEN_BACK', { id: 'ret-lpgive', align: 'split', fontSize: 10 }),
    mk('LOYALTY_BALANCE',  { id: 'ret-lpbal',  align: 'split', fontSize: 10 }),
    mk('SEPARATOR',        { id: 'ret-sep5' }),
    mk('THANKS_MESSAGE',   { id: 'ret-thanks', align: 'center', fontSize: 10,
                             customText: 'Items returned & refund processed. Please retain this receipt.' }),
  ];
};

/**
 * Resolve the active template lines for a settings object.
 * Configured JSON → parse it. No JSON → the default layout for that document.
 */
export const getActiveTemplateLines = (settings, templateType = PRINT_TEMPLATE_TYPES.THERMAL) => {
  const parsed = parseTemplateLines(settings?.templateLines);
  if (parsed.length > 0) return parsed;
  if (templateType === PRINT_TEMPLATE_TYPES.RETURN) return buildLegacyReturnTemplateLines();
  return buildLegacyTemplateLines(settings);
};

// ─── END Receipt Template Line Helpers ─────────────────────────────────────

export const PRINT_TEMPLATE_TYPES = {
  THERMAL: 'THERMAL',
  A4: 'A4',
  KOT: 'KOT',
  RETURN: 'RETURN',
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
