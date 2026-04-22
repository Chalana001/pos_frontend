export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
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
