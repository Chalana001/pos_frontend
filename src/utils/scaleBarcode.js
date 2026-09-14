// Client-side mirror of the backend's barcode/ScaleBarcodeDecoder, rule for
// rule, so the settings screen can show an admin exactly how a label from
// their own scale will split and why it would be refused. The backend stays
// the authority for what the POS actually sells; change one and change the
// other.
//
// A scale barcode is [prefix][item code][value][check digit?]. Only the value
// and the check digit must be digits; the prefix and item code are compared as
// text so lettered PLUs ("NS12") and lettered prefixes work.

// What the numeric "value" segment embedded in a scale barcode represents,
// mirrors backend entity.ScaleBarcodeValueType.
export const SCALE_BARCODE_VALUE_TYPE_OPTIONS = [
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'PRICE', label: 'Price' },
];

// Unit of a WEIGHT value. Mirrors the G / KG subset of backend MeasurementUnit.
export const SCALE_BARCODE_WEIGHT_UNIT_OPTIONS = [
  { value: 'G', label: 'Grams (g)' },
  { value: 'KG', label: 'Kilograms (kg)' },
];

export const SCALE_BARCODE_MAX_VALUE_LENGTH = 12;
export const SCALE_BARCODE_MAX_DECIMALS = 5;

// The scale fields of App Configuration, with the entity's own defaults.
export const DEFAULT_SCALE_BARCODE_CONFIG = {
  scaleBarcodeEnabled: false,
  scaleBarcodePresetKey: '',
  scaleBarcodePrefix: '',
  scaleBarcodePrefixLength: 2,
  scaleBarcodeItemCodeLength: 5,
  scaleBarcodeValueLength: 5,
  scaleBarcodeValueType: 'WEIGHT',
  scaleBarcodeWeightUnit: 'G',
  scaleBarcodeValueDecimals: 0,
  scaleBarcodeStripLeadingZeros: false,
  scaleBarcodeHasCheckDigit: true,
};

// Comma separated, letters and digits only, upper case, at most 40 characters.
// Mirrors AppConfigurationService.normalizeScalePrefixes without the per-entry
// length check, which the settings card reports live instead.
export const normalizeScalePrefixText = (value) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9,]/g, '')
    .slice(0, 40);

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Clamps the scale fields of an app configuration object to what the backend accepts. */
export const normalizeScaleBarcodeConfig = (value = {}) => {
  const D = DEFAULT_SCALE_BARCODE_CONFIG;
  return {
    scaleBarcodeEnabled: value.scaleBarcodeEnabled === true,
    scaleBarcodePresetKey: String(value.scaleBarcodePresetKey ?? '').trim().slice(0, 50),
    scaleBarcodePrefix: normalizeScalePrefixText(value.scaleBarcodePrefix),
    scaleBarcodePrefixLength: clampInt(value.scaleBarcodePrefixLength, 0, 4, D.scaleBarcodePrefixLength),
    scaleBarcodeItemCodeLength: clampInt(value.scaleBarcodeItemCodeLength, 1, 20, D.scaleBarcodeItemCodeLength),
    scaleBarcodeValueLength: clampInt(value.scaleBarcodeValueLength, 1, SCALE_BARCODE_MAX_VALUE_LENGTH, D.scaleBarcodeValueLength),
    scaleBarcodeValueType: value.scaleBarcodeValueType === 'PRICE' ? 'PRICE' : 'WEIGHT',
    scaleBarcodeWeightUnit: value.scaleBarcodeWeightUnit === 'KG' ? 'KG' : 'G',
    scaleBarcodeValueDecimals: clampInt(value.scaleBarcodeValueDecimals, 0, SCALE_BARCODE_MAX_DECIMALS, D.scaleBarcodeValueDecimals),
    scaleBarcodeStripLeadingZeros: value.scaleBarcodeStripLeadingZeros === true,
    scaleBarcodeHasCheckDigit: value.scaleBarcodeHasCheckDigit !== false,
  };
};

const isAllDigits = (s) => /^[0-9]+$/.test(s);

// Standard EAN-13 mod-10: weights 1,3,1,3,... from the left; the check digit is
// whatever brings the sum to the next multiple of 10.
export const computeEan13CheckDigit = (payload) => {
  let sum = 0;
  for (let i = 0; i < payload.length; i += 1) {
    const digit = payload.charCodeAt(i) - 48;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
};

// "20,21" or "NS" into upper-cased entries. Blank means "any prefix".
export const parseScalePrefixes = (configured) =>
  String(configured ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

const stripLeadingZeros = (code) => {
  let i = 0;
  while (i < code.length - 1 && code[i] === '0') i += 1;
  return code.slice(i);
};

/**
 * Splits and interprets a scanned string against a branch's scale settings.
 *
 * Returns { ok: true, prefix, itemCode, valueDigits, checkDigit, valueType,
 * grams | amount, display } or { ok: false, reason, ...whatever segments could
 * still be shown }. `reason` is written for the shop admin, not the developer.
 */
export const describeScaleBarcode = (rawBarcode, settings) => {
  const s = settings || {};
  const barcode = String(rawBarcode ?? '').trim();

  if (!s.scaleBarcodeEnabled) {
    return { ok: false, reason: 'Scale barcode decoding is switched off for this branch.' };
  }
  if (!barcode) {
    return { ok: false, reason: 'Scan or type a barcode to test.' };
  }

  const prefixLength = Number(s.scaleBarcodePrefixLength) || 0;
  const itemCodeLength = Number(s.scaleBarcodeItemCodeLength) || 0;
  const valueLength = Number(s.scaleBarcodeValueLength) || 0;
  const hasCheckDigit = !!s.scaleBarcodeHasCheckDigit;

  if (prefixLength < 0 || itemCodeLength <= 0 || valueLength <= 0 || valueLength > 12) {
    return { ok: false, reason: 'The segment lengths above are not valid.' };
  }

  const expectedLength = prefixLength + itemCodeLength + valueLength + (hasCheckDigit ? 1 : 0);
  if (barcode.length !== expectedLength) {
    return {
      ok: false,
      reason: `Expected ${expectedLength} characters (${prefixLength} prefix + ${itemCodeLength} item code + ${valueLength} value${hasCheckDigit ? ' + 1 check digit' : ''}), got ${barcode.length}.`,
    };
  }

  const prefix = barcode.slice(0, prefixLength);
  const itemCodeRaw = barcode.slice(prefixLength, prefixLength + itemCodeLength);
  const valueDigits = barcode.slice(prefixLength + itemCodeLength, prefixLength + itemCodeLength + valueLength);
  const checkDigit = hasCheckDigit ? barcode.slice(-1) : '';
  const segments = { prefix, itemCode: itemCodeRaw, valueDigits, checkDigit };

  const allowed = parseScalePrefixes(s.scaleBarcodePrefix);
  if (prefixLength > 0 && allowed.length > 0 && !allowed.includes(prefix.toUpperCase())) {
    return { ok: false, ...segments, reason: `Prefix "${prefix}" is not one of ${allowed.join(', ')}.` };
  }

  // EAN-13 mod-10 is only defined over digits. A scale that prints a lettered
  // prefix ("NS1 00001 00050 2") still ends its label with a check digit of its
  // own making, so with letters in the payload the trailing character is taken
  // as present but not verified; all-digit layouts are verified.
  let checkDigitVerified = false;
  if (hasCheckDigit) {
    const payload = barcode.slice(0, -1);
    if (isAllDigits(payload)) {
      const computed = computeEan13CheckDigit(payload);
      if (!isAllDigits(checkDigit) || computed !== checkDigit) {
        return { ok: false, ...segments, reason: `Check digit should be ${computed}, the label has ${checkDigit}.` };
      }
      checkDigitVerified = true;
    }
  }

  if (!isAllDigits(valueDigits)) {
    return { ok: false, ...segments, reason: `The value segment "${valueDigits}" must be digits only.` };
  }

  const itemCode = s.scaleBarcodeStripLeadingZeros ? stripLeadingZeros(itemCodeRaw) : itemCodeRaw;
  const decimals = Math.max(0, Math.min(Number(s.scaleBarcodeValueDecimals) || 0, 5));
  const scaled = Number(valueDigits) / 10 ** decimals;
  const valueType = s.scaleBarcodeValueType === 'PRICE' ? 'PRICE' : 'WEIGHT';

  if (valueType === 'WEIGHT') {
    const unit = s.scaleBarcodeWeightUnit === 'KG' ? 'KG' : 'G';
    const grams = unit === 'KG' ? scaled * 1000 : scaled;
    const shown = unit === 'KG'
      ? `${scaled.toFixed(Math.max(decimals, 3))} kg`
      : `${scaled.toFixed(decimals)} g`;
    return {
      ok: true,
      ...segments,
      itemCode,
      valueType,
      grams,
      checkDigitVerified,
      display: `Item code ${itemCode}, weight ${shown}`,
    };
  }

  const amount = Math.round(scaled * 100) / 100;
  return {
    ok: true,
    ...segments,
    itemCode,
    valueType,
    amount,
    checkDigitVerified,
    display: `Item code ${itemCode}, price ${amount.toFixed(2)}`,
  };
};

/**
 * Builds an example barcode from the current settings for the "reads as" hint,
 * using a sample value that shows where the decimal point lands.
 */
export const buildScaleBarcodeExample = (settings) => {
  const s = settings || {};
  const prefixLength = Number(s.scaleBarcodePrefixLength) || 0;
  const itemCodeLength = Number(s.scaleBarcodeItemCodeLength) || 0;
  const valueLength = Number(s.scaleBarcodeValueLength) || 0;
  if (itemCodeLength <= 0 || valueLength <= 0) return '';

  const firstPrefix = parseScalePrefixes(s.scaleBarcodePrefix)[0];
  const prefix = (firstPrefix || '2'.repeat(prefixLength)).slice(0, prefixLength).padEnd(prefixLength, '0');
  const itemCode = '1'.repeat(itemCodeLength);
  const value = '123456789012'.slice(0, valueLength).padStart(valueLength, '0');
  const payload = `${prefix}${itemCode}${value}`;
  const check = s.scaleBarcodeHasCheckDigit && isAllDigits(payload) ? computeEan13CheckDigit(payload) : '';
  return `${payload}${check}`;
};
