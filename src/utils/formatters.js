/**
 * Today's date as YYYY-MM-DD, using the browser's LOCAL calendar day.
 *
 * Do not use `new Date().toISOString().split("T")[0]` for this — toISOString
 * converts to UTC first, so for roughly the first 5-6 hours of every day in
 * Sri Lanka (UTC+5:30) it silently returns YESTERDAY's date. That bug showed
 * up as "things I just recorded aren't in the table" (a default date-range
 * filter one day behind) and, worse, as purchases getting stamped with the
 * wrong date on their New Purchase form.
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Compact currency for chart axis ticks: one prefix, no cents, K/M suffixes.
 *
 * Axis ticks have a fixed width budget, so they cannot use formatCurrency —
 * but they must agree with it on the currency, or a single chart ends up
 * showing both "LKR 0.00" and "Rs. 9.5K" (which it did).
 *
 * The separator is a non-breaking space: SVG <text> collapses a regular space
 * at some widths, which rendered "LKR 9.5K" next to "LKR19.0K".
 */
export const shortCurrency = (value) => {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  const nbsp = ' ';
  if (abs >= 1_000_000) return `LKR${nbsp}${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `LKR${nbsp}${(amount / 1_000).toFixed(1)}K`;
  return `LKR${nbsp}${Math.round(amount).toLocaleString()}`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNumericQty = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(3).replace(/\.?0+$/, '');
};

export const formatQuantityWithUnit = (qty, qtyUnit) => {
  const normalizedUnit = String(qtyUnit || '').toUpperCase();
  const numericQty = Number(qty || 0);

  if (!Number.isFinite(numericQty)) {
    return qtyUnit ? `${qty} ${qtyUnit}` : String(qty ?? '');
  }

  if (normalizedUnit === 'KG') {
    if (numericQty < 1) {
      return `${formatNumericQty(numericQty * 1000)} G`;
    }
    return `${formatNumericQty(numericQty)} KG`;
  }

  if (normalizedUnit === 'G') {
    if (numericQty >= 1000) {
      return `${formatNumericQty(numericQty / 1000)} KG`;
    }
    return `${formatNumericQty(numericQty)} G`;
  }

  if (normalizedUnit === 'L') {
    if (numericQty < 1) {
      return `${formatNumericQty(numericQty * 1000)} ML`;
    }
    return `${formatNumericQty(numericQty)} L`;
  }

  if (normalizedUnit === 'ML') {
    if (numericQty >= 1000) {
      return `${formatNumericQty(numericQty / 1000)} L`;
    }
    return `${formatNumericQty(numericQty)} ML`;
  }

  if (normalizedUnit === 'PCS') {
    return `${formatNumericQty(numericQty)} PCS`;
  }

  if (normalizedUnit === 'SERVICE') {
    return `${formatNumericQty(numericQty)} SERVICE`;
  }

  return normalizedUnit
    ? `${formatNumericQty(numericQty)} ${normalizedUnit}`
    : formatNumericQty(numericQty);
};
