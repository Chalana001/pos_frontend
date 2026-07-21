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
  };
};
