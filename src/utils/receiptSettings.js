export const PRINT_TEMPLATE_TYPES = {
  THERMAL: 'THERMAL',
  A4: 'A4',
};

export const DEFAULT_RECEIPT_SETTINGS = {
  templateType: PRINT_TEMPLATE_TYPES.THERMAL,
  showLogo: true,
  showStoreName: true,
  showBranchName: true,
  showAddress: true,
  showPhone: true,
  showInvoiceNumber: true,
  showDateTime: true,
  showCashier: true,
  showCustomer: true,
  showItemTable: true,
  showSubtotal: true,
  showDiscount: true,
  showNetTotal: true,
  showPaid: true,
  showBalance: true,
  showThanksMessage: true,
  showCredits: true,
  logoWidthPercent: 78,
  paperWidthMm: 72,
  thanksMessage: 'Thank You, Come Again!',
  creditsLine1: 'SOFTWARE BY CHALA',
  creditsLine2: 'Smart Retail Solutions | 0704589764',
};

export const normalizeReceiptSettings = (settings) => {
  const merged = {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...(settings || {}),
  };

  return {
    ...merged,
    showCredits: true,
    creditsLine1: DEFAULT_RECEIPT_SETTINGS.creditsLine1,
    creditsLine2: DEFAULT_RECEIPT_SETTINGS.creditsLine2,
    logoWidthPercent: Math.min(100, Math.max(35, Number(merged.logoWidthPercent) || DEFAULT_RECEIPT_SETTINGS.logoWidthPercent)),
    paperWidthMm: Math.min(210, Math.max(48, Number(merged.paperWidthMm) || DEFAULT_RECEIPT_SETTINGS.paperWidthMm)),
    thanksMessage: (merged.thanksMessage || DEFAULT_RECEIPT_SETTINGS.thanksMessage).trim(),
  };
};

export const RECEIPT_SECTION_FIELDS = [
  { key: 'showLogo', label: 'Shop Logo' },
  { key: 'showStoreName', label: 'Store Name' },
  { key: 'showBranchName', label: 'Branch Name' },
  { key: 'showAddress', label: 'Address' },
  { key: 'showPhone', label: 'Phone' },
  { key: 'showInvoiceNumber', label: 'Invoice Number' },
  { key: 'showDateTime', label: 'Date & Time' },
  { key: 'showCashier', label: 'Cashier' },
  { key: 'showCustomer', label: 'Customer' },
  { key: 'showItemTable', label: 'Item Table' },
  { key: 'showSubtotal', label: 'Subtotal' },
  { key: 'showDiscount', label: 'Discount' },
  { key: 'showNetTotal', label: 'Net Total' },
  { key: 'showPaid', label: 'Paid' },
  { key: 'showBalance', label: 'Balance' },
  { key: 'showThanksMessage', label: 'Thanks Message' },
  { key: 'showCredits', label: 'Credits', locked: true },
];
