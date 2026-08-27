import { ITEM_NAME_SOURCE_OPTIONS } from './receiptSettings';

// Re-export so the settings page can import name-source options from one place.
export { ITEM_NAME_SOURCE_OPTIONS };

export const BARCODE_FORMAT_OPTIONS = [
  { value: 'CODE128', label: 'Code 128 (default)' },
  { value: 'EAN13', label: 'EAN-13' },
];

export const LABEL_SIZE_PRESETS = [
  { label: '40 x 25 mm (standard)', w: 40, h: 25 },
  { label: '50 x 25 mm', w: 50, h: 25 },
  { label: '38 x 25 mm', w: 38, h: 25 },
  { label: '32 x 19 mm', w: 32, h: 19 },
  { label: '25 x 15 mm', w: 25, h: 15 },
  { label: '30 x 20 mm', w: 30, h: 20 },
  { label: '40 x 20 mm', w: 40, h: 20 },
  { label: '40 x 30 mm', w: 40, h: 30 },
  { label: '50 x 30 mm', w: 50, h: 30 },
  { label: '50 x 40 mm', w: 50, h: 40 },
  { label: '58 x 40 mm', w: 58, h: 40 },
  { label: '60 x 40 mm', w: 60, h: 40 },
];

// Sentinel option shown in the size dropdown when the current width/height
// don't match any preset above — lets the dropdown read as "actively selected"
// instead of a blank placeholder while the user free-types a custom size.
export const CUSTOM_SIZE_OPTION = { value: 'CUSTOM', label: 'Custom Size' };

const MM_PER_INCH = 25.4;
export const mmToInch = (mm) => Number(mm) / MM_PER_INCH;
export const inchToMm = (inch) => Math.round(Number(inch) * MM_PER_INCH);

export const EXPIRY_DATE_FORMAT_OPTIONS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
];

// What the numeric "value" segment embedded in a scale barcode represents —
// mirrors backend entity.ScaleBarcodeValueType.
export const SCALE_BARCODE_VALUE_TYPE_OPTIONS = [
  { value: 'WEIGHT_GRAMS', label: 'Weight (grams)' },
  { value: 'PRICE_CENTS', label: 'Price (cents)' },
];

export const DEFAULT_BARCODE_LABEL_SETTINGS = {
  labelWidthMm: 40,
  labelHeightMm: 25,
  paddingTopMm: 1,
  showShopName: true,
  shopNameText: '',
  shopNameFontSize: 7,
  shopNameBold: true,
  showItemName: true,
  itemNameSource: 'PRIMARY',
  itemNameMaxChars: 22,
  itemNameFontSize: 8,
  barcodeFormat: 'CODE128',
  barcodeWidth: 1.5,
  barcodeHeight: 35,
  showBarcodeValue: true,
  barcodeValueFontSize: 12,
  showPrice: true,
  pricePrefix: 'Rs.',
  priceFontSize: 10,
  priceBold: true,
  showFooterText: false,
  footerText: '',
  footerFontSize: 6,
  showExpiry: false,
  expiryPrefix: 'EXP:',
  expiryFontSize: 7,
  expiryDateFormat: 'dd/MM/yyyy',
  directPrintEnabled: false,
  printerName: '',
  printerCopies: 1,
  // Ordered element-array layout (JSON string). null → fall back to the flat
  // show*/fontSize fields above via buildLegacyLabelElements().
  layoutJson: null,

  // Scale-barcode decoding (weight/price-embedded barcodes from the shop's own
  // weighing-scale device). See ScaleBarcodeDecoder / ScaleBarcodeFormatPresets
  // on the backend. Defaults mirror the entity's own column defaults.
  scaleBarcodeEnabled: false,
  scaleBarcodePresetKey: '',
  scaleBarcodePrefix: '',
  scaleBarcodePrefixLength: 2,
  scaleBarcodeItemCodeLength: 5,
  scaleBarcodeValueLength: 5,
  scaleBarcodeValueType: 'WEIGHT_GRAMS',
  scaleBarcodeHasCheckDigit: true,
};

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const clampFloat = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const normalizeText = (value, maxLength) => {
  const str = String(value ?? '').trim();
  return str.length > maxLength ? str.slice(0, maxLength) : str;
};

export const normalizeBarcodeLabelSettings = (settings) => {
  const merged = {
    ...DEFAULT_BARCODE_LABEL_SETTINGS,
    ...(settings || {}),
  };

  const barcodeFormat = String(merged.barcodeFormat || '').toUpperCase();

  return {
    labelWidthMm: clampInt(merged.labelWidthMm, 20, 120, DEFAULT_BARCODE_LABEL_SETTINGS.labelWidthMm),
    labelHeightMm: clampInt(merged.labelHeightMm, 15, 100, DEFAULT_BARCODE_LABEL_SETTINGS.labelHeightMm),
    paddingTopMm: clampInt(merged.paddingTopMm, 0, 10, DEFAULT_BARCODE_LABEL_SETTINGS.paddingTopMm),
    showShopName: !!merged.showShopName,
    shopNameText: normalizeText(merged.shopNameText, 60),
    shopNameFontSize: clampInt(merged.shopNameFontSize, 5, 20, DEFAULT_BARCODE_LABEL_SETTINGS.shopNameFontSize),
    shopNameBold: !!merged.shopNameBold,
    showItemName: !!merged.showItemName,
    itemNameSource: ITEM_NAME_SOURCE_OPTIONS.some((o) => o.value === merged.itemNameSource)
      ? merged.itemNameSource
      : 'PRIMARY',
    itemNameMaxChars: clampInt(merged.itemNameMaxChars, 5, 60, DEFAULT_BARCODE_LABEL_SETTINGS.itemNameMaxChars),
    itemNameFontSize: clampInt(merged.itemNameFontSize, 5, 20, DEFAULT_BARCODE_LABEL_SETTINGS.itemNameFontSize),
    barcodeFormat: barcodeFormat === 'EAN13' ? 'EAN13' : 'CODE128',
    barcodeWidth: clampFloat(merged.barcodeWidth, 0.5, 4.0, DEFAULT_BARCODE_LABEL_SETTINGS.barcodeWidth),
    barcodeHeight: clampInt(merged.barcodeHeight, 15, 80, DEFAULT_BARCODE_LABEL_SETTINGS.barcodeHeight),
    showBarcodeValue: !!merged.showBarcodeValue,
    barcodeValueFontSize: clampInt(merged.barcodeValueFontSize, 6, 20, DEFAULT_BARCODE_LABEL_SETTINGS.barcodeValueFontSize),
    showPrice: !!merged.showPrice,
    pricePrefix: normalizeText(merged.pricePrefix, 10),
    priceFontSize: clampInt(merged.priceFontSize, 5, 24, DEFAULT_BARCODE_LABEL_SETTINGS.priceFontSize),
    priceBold: !!merged.priceBold,
    showFooterText: !!merged.showFooterText,
    footerText: normalizeText(merged.footerText, 80),
    footerFontSize: clampInt(merged.footerFontSize, 5, 16, DEFAULT_BARCODE_LABEL_SETTINGS.footerFontSize),
    showExpiry: !!merged.showExpiry,
    expiryPrefix: normalizeText(merged.expiryPrefix, 20) || DEFAULT_BARCODE_LABEL_SETTINGS.expiryPrefix,
    expiryFontSize: clampInt(merged.expiryFontSize, 5, 20, DEFAULT_BARCODE_LABEL_SETTINGS.expiryFontSize),
    expiryDateFormat: EXPIRY_DATE_FORMAT_OPTIONS.some((o) => o.value === merged.expiryDateFormat)
      ? merged.expiryDateFormat
      : DEFAULT_BARCODE_LABEL_SETTINGS.expiryDateFormat,
    directPrintEnabled: !!merged.directPrintEnabled,
    printerName: normalizeText(merged.printerName, 160),
    printerCopies: clampInt(merged.printerCopies, 1, 10, DEFAULT_BARCODE_LABEL_SETTINGS.printerCopies),
    // Opaque JSON string round-tripped to/from the backend. Parsed into an
    // editable array by the settings page / getActiveLabelElements().
    layoutJson: typeof merged.layoutJson === 'string' ? merged.layoutJson : null,

    scaleBarcodeEnabled: !!merged.scaleBarcodeEnabled,
    scaleBarcodePresetKey: normalizeText(merged.scaleBarcodePresetKey, 50),
    scaleBarcodePrefix: normalizeText(merged.scaleBarcodePrefix, 4),
    scaleBarcodePrefixLength: clampInt(merged.scaleBarcodePrefixLength, 0, 4, DEFAULT_BARCODE_LABEL_SETTINGS.scaleBarcodePrefixLength),
    scaleBarcodeItemCodeLength: clampInt(merged.scaleBarcodeItemCodeLength, 1, 20, DEFAULT_BARCODE_LABEL_SETTINGS.scaleBarcodeItemCodeLength),
    scaleBarcodeValueLength: clampInt(merged.scaleBarcodeValueLength, 1, 20, DEFAULT_BARCODE_LABEL_SETTINGS.scaleBarcodeValueLength),
    scaleBarcodeValueType: SCALE_BARCODE_VALUE_TYPE_OPTIONS.some((o) => o.value === merged.scaleBarcodeValueType)
      ? merged.scaleBarcodeValueType
      : DEFAULT_BARCODE_LABEL_SETTINGS.scaleBarcodeValueType,
    scaleBarcodeHasCheckDigit: merged.scaleBarcodeHasCheckDigit === undefined ? true : !!merged.scaleBarcodeHasCheckDigit,
  };
};

// ─── Barcode Label Element Types (ordered layout model) ─────────────────────
// Mirrors the receipt "template lines" pattern: an ordered array of typed
// elements drives both the live preview and the print output, replacing the
// old fixed shop→item→barcode→price→expiry→footer JSX order.

export const BARCODE_ELEMENT_TYPES = [
  'SHOP_NAME',
  'ITEM_NAME',
  'BARCODE',
  'PRICE',
  'EXPIRY',
  'FOOTER',
  'CUSTOM_TEXT',
];

export const BARCODE_ELEMENT_TYPE_OPTIONS = [
  { value: 'SHOP_NAME',   label: 'Shop Name' },
  { value: 'ITEM_NAME',   label: 'Item Name' },
  { value: 'BARCODE',     label: 'Barcode' },
  { value: 'PRICE',       label: 'Price' },
  { value: 'EXPIRY',      label: 'Expiry Date' },
  { value: 'FOOTER',      label: 'Footer Text' },
  { value: 'CUSTOM_TEXT', label: 'Custom Text' },
];

export const BARCODE_ELEMENT_ALIGN_OPTIONS = [
  { value: 'left',   label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right',  label: 'Right' },
];

// Types that expose a free-text input in the editor (label override / prefix /
// body text). ITEM_NAME and BARCODE have their own type-specific controls.
export const BARCODE_ELEMENT_TEXT_TYPES = ['SHOP_NAME', 'PRICE', 'EXPIRY', 'FOOTER', 'CUSTOM_TEXT'];

const _createElementId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `bc-el-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Create a new barcode label element with smart per-type defaults, seeded from
 * DEFAULT_BARCODE_LABEL_SETTINGS so a fresh element looks like the old fixed one.
 */
export const createBarcodeElement = (type = 'CUSTOM_TEXT') => {
  const D = DEFAULT_BARCODE_LABEL_SETTINGS;
  const base = {
    id: _createElementId(),
    type,
    enabled: true,
    align: 'center',
    fontSize: 8,
    bold: false,
    italic: false,
    underline: false,
    customText: '',
  };
  switch (type) {
    case 'SHOP_NAME':
      return { ...base, fontSize: D.shopNameFontSize, bold: true };
    case 'ITEM_NAME':
      return { ...base, fontSize: D.itemNameFontSize, maxChars: D.itemNameMaxChars, itemNameSource: D.itemNameSource };
    case 'BARCODE':
      return {
        ...base,
        barcodeFormat: D.barcodeFormat,
        barcodeWidth: D.barcodeWidth,
        barcodeHeight: D.barcodeHeight,
        showBarcodeValue: D.showBarcodeValue,
        barcodeValueFontSize: D.barcodeValueFontSize,
      };
    case 'PRICE':
      return { ...base, fontSize: D.priceFontSize, bold: true, customText: D.pricePrefix };
    case 'EXPIRY':
      return { ...base, fontSize: D.expiryFontSize, customText: D.expiryPrefix, expiryDateFormat: D.expiryDateFormat };
    case 'FOOTER':
      return { ...base, fontSize: D.footerFontSize };
    case 'CUSTOM_TEXT':
    default:
      return base;
  }
};

const _normalizeBarcodeElement = (element, index) => {
  if (!element || !BARCODE_ELEMENT_TYPES.includes(element.type)) return null;
  const allowedAligns = ['left', 'center', 'right'];
  // Merge onto type defaults so type-specific fields are always present/valid.
  const d = createBarcodeElement(element.type);
  const merged = { ...d, ...element };

  const out = {
    id: merged.id || `bc-el-${index}`,
    type: merged.type,
    enabled: merged.enabled === undefined ? true : !!merged.enabled,
    align: allowedAligns.includes(merged.align) ? merged.align : 'center',
    fontSize: clampInt(merged.fontSize, 5, 24, d.fontSize),
    bold: !!merged.bold,
    italic: !!merged.italic,
    underline: !!merged.underline,
    customText: normalizeText(merged.customText, 80),
  };

  if (merged.type === 'ITEM_NAME') {
    out.maxChars = clampInt(merged.maxChars, 5, 60, d.maxChars);
    out.itemNameSource = ITEM_NAME_SOURCE_OPTIONS.some((o) => o.value === merged.itemNameSource)
      ? merged.itemNameSource
      : 'PRIMARY';
  } else if (merged.type === 'CUSTOM_TEXT') {
    out.maxChars = clampInt(merged.maxChars, 5, 80, 80);
  } else if (merged.type === 'BARCODE') {
    out.barcodeFormat = String(merged.barcodeFormat || '').toUpperCase() === 'EAN13' ? 'EAN13' : 'CODE128';
    out.barcodeWidth = clampFloat(merged.barcodeWidth, 0.5, 4.0, d.barcodeWidth);
    out.barcodeHeight = clampInt(merged.barcodeHeight, 15, 80, d.barcodeHeight);
    out.showBarcodeValue = merged.showBarcodeValue === undefined ? true : !!merged.showBarcodeValue;
    out.barcodeValueFontSize = clampInt(merged.barcodeValueFontSize, 6, 20, d.barcodeValueFontSize);
  } else if (merged.type === 'EXPIRY') {
    out.expiryDateFormat = EXPIRY_DATE_FORMAT_OPTIONS.some((o) => o.value === merged.expiryDateFormat)
      ? merged.expiryDateFormat
      : DEFAULT_BARCODE_LABEL_SETTINGS.expiryDateFormat;
  }
  return out;
};

/** Parse the raw layoutJson string (from DB/API) into a normalized element array. */
export const parseLabelElements = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((el, i) => _normalizeBarcodeElement(el, i)).filter(Boolean);
  } catch {
    return [];
  }
};

/**
 * Build the default element array from the flat show/font-size fields.
 * Used as a fallback when no layout has been configured yet, so existing
 * branches open with their current design already as an editable list.
 */
export const buildLegacyLabelElements = (settings) => {
  const s = { ...DEFAULT_BARCODE_LABEL_SETTINGS, ...(settings || {}) };
  const mk = (type, overrides = {}) => ({ ...createBarcodeElement(type), ...overrides });
  const lines = [];

  if (s.showShopName) {
    lines.push(mk('SHOP_NAME', { id: 'def-shop', customText: s.shopNameText || '', fontSize: s.shopNameFontSize, bold: !!s.shopNameBold }));
  }
  if (s.showItemName) {
    lines.push(mk('ITEM_NAME', { id: 'def-item', fontSize: s.itemNameFontSize, maxChars: s.itemNameMaxChars, itemNameSource: s.itemNameSource }));
  }
  lines.push(mk('BARCODE', {
    id: 'def-barcode',
    barcodeFormat: s.barcodeFormat,
    barcodeWidth: s.barcodeWidth,
    barcodeHeight: s.barcodeHeight,
    showBarcodeValue: !!s.showBarcodeValue,
    barcodeValueFontSize: s.barcodeValueFontSize,
  }));
  if (s.showPrice) {
    lines.push(mk('PRICE', { id: 'def-price', customText: s.pricePrefix, fontSize: s.priceFontSize, bold: !!s.priceBold }));
  }
  if (s.showExpiry) {
    lines.push(mk('EXPIRY', { id: 'def-expiry', customText: s.expiryPrefix, fontSize: s.expiryFontSize, expiryDateFormat: s.expiryDateFormat }));
  }
  if (s.showFooterText) {
    lines.push(mk('FOOTER', { id: 'def-footer', customText: s.footerText || '', fontSize: s.footerFontSize }));
  }
  return lines.map((el, i) => _normalizeBarcodeElement(el, i)).filter(Boolean);
};

/**
 * Resolve the active label elements for a settings object.
 * Runtime array (editor) → use it. Configured JSON → parse it.
 * Neither → build from the legacy flat fields.
 */
export const getActiveLabelElements = (settings) => {
  const s = settings || {};
  if (Array.isArray(s.layoutElements) && s.layoutElements.length > 0) {
    return s.layoutElements.map((el, i) => _normalizeBarcodeElement(el, i)).filter(Boolean);
  }
  const parsed = parseLabelElements(s.layoutJson);
  if (parsed.length > 0) return parsed;
  return buildLegacyLabelElements(s);
};
