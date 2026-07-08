/**
 * buildPosReceiptHtml.js
 * HTML string renderer for the POS thermal receipt, driven by template lines.
 * Mirrors the GMS buildThermalBillHtml approach.
 */
import { getActiveTemplateLines } from './receiptSettings';

const money = (v) => Number(v || 0).toFixed(2);

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getFontFamily = (key) => {
  switch (key) {
    case 'ARIAL':
      return 'Arial, Helvetica, sans-serif';
    case 'VERDANA':
      return 'Verdana, Geneva, sans-serif';
    case 'TAHOMA':
      return 'Tahoma, Geneva, sans-serif';
    case 'COURIER_NEW':
    default:
      return "'Courier New', Courier, monospace";
  }
};

const renderLine = (line, data, items) => {
  const { settings, branchData, storeName, orderData, customerData } = data;
  const currency = ((settings?.currencySymbol || '').trim()) || 'LKR';
  const lkr = (v) => `${currency} ${money(v)}`;
  const lbl = (fallback) => esc(line.customText?.trim() || fallback);
  const cls = [
    'rl',
    `al-${line.align}`,
    line.bold ? 'bld' : '',
    line.italic ? 'itl' : '',
    line.underline ? 'uln' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = `font-size:${line.fontSize}px;`;

  const two = (label, val, extraCls) => {
    const allCls = [cls, 'two-col', extraCls].filter(Boolean).join(' ');
    return `<div class="${allCls}" style="${style}"><span>${lbl(label)}</span><span>${val}</span></div>`;
  };

  const invoiceValue = orderData?.invoiceNo || orderData?.orderId || 'INV-2026-000001';
  const dateStr = orderData?.createdAt
    ? new Date(orderData.createdAt).toLocaleString()
    : new Date().toLocaleString();
  const cashierName = branchData?.cashierName || orderData?.cashierName || 'Cashier';
  const customerName = customerData?.name || orderData?.customerName || '';
  const subTotal     = Number(orderData?.subTotal ?? 0);
  const grandTotal   = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
  const paidAmount   = Number(orderData?.paidAmount ?? 0);
  const dueAmount    = Math.max(0, Number(orderData?.dueAmount ?? 0));
  const changeAmt    = Math.max(0, paidAmount - grandTotal);
  const balanceShow  = dueAmount > 0 ? dueAmount : changeAmt;

  // ── Total discount = bill-level + promotion-level + all per-line discounts ─
  // We compute line discount sum from items so we capture every path
  // (effectiveDiscountType/Value, lineDiscount, discountAmount, or baseTotal−lineTotal).
  const lineDiscountSum = (items || []).reduce((sum, item) => {
    const qty       = Number(item.qty || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const baseTotal = qty * unitPrice;
    const lineTotal = Number(item.lineTotal ?? item.effectiveLineTotal ?? baseTotal);
    let disc = 0;
    if (Number(item.lineDiscount || 0) > 0)          disc = Number(item.lineDiscount);
    else if (Number(item.discountAmount || 0) > 0)   disc = Number(item.discountAmount);
    else if (item.discountType === 'FIXED' || item.effectiveDiscountType === 'FIXED')
      disc = Number(item.effectiveDiscountValue ?? item.discountValue ?? 0);
    else if (item.discountType === 'PERCENT' || item.effectiveDiscountType === 'PERCENT') {
      const pct = Number(item.effectiveDiscountValue ?? item.discountValue ?? 0);
      disc = (baseTotal * pct) / 100;
    } else if (baseTotal > 0 && lineTotal < baseTotal) {
      disc = baseTotal - lineTotal;
    }
    return sum + Math.max(0, disc);
  }, 0);

  const billDiscount  = Number(orderData?.billDiscount ?? 0);
  const promoDiscount = Number(orderData?.promotionDiscountTotal ?? 0);
  // Total discount shown on DISCOUNT line = everything combined
  const totalDiscount = lineDiscountSum + billDiscount + promoDiscount;
  // If totalDiscount doesn't match subTotal-grandTotal due to rounding, trust the arithmetic
  const inferredDiscount = subTotal > 0 && grandTotal >= 0 ? subTotal - grandTotal : 0;
  const displayDiscount = totalDiscount > 0.001 ? totalDiscount : (inferredDiscount > 0.001 ? inferredDiscount : 0);

  const logoW   = Math.max(35, Math.min(200, Number(settings?.logoWidthPercent || 78)));
  const logoTop = Math.max(0, Math.min(20, Number(settings?.logoTopSpacing || 0))) / 2;

  switch (line.type) {
    case 'LOGO': {
      if (!branchData?.logo) return '';
      const logoMargin = line.align === 'right'
        ? `margin-top:${logoTop}mm;margin-left:auto;margin-right:0`
        : line.align === 'left'
          ? `margin-top:${logoTop}mm;margin-left:0;margin-right:auto`
          : `margin-top:${logoTop}mm;margin-left:auto;margin-right:auto`;
      return `<img class="logo" src="${esc(branchData.logo)}" alt="Logo" style="width:${logoW}%;${logoMargin};"/>`;
    }

    case 'STORE_NAME':
      return storeName
        ? `<div class="${cls} ucase" style="${style}">${esc(storeName)}</div>`
        : '';

    case 'BRANCH_NAME':
      return branchData?.name
        ? `<div class="${cls}" style="${style}">${line.customText?.trim() ? `<b>${lbl('Branch')}:</b> ` : ''}${esc(branchData.name)}</div>`
        : '';

    case 'ADDRESS':
      return branchData?.address
        ? `<div class="${cls} muted" style="${style}">${line.customText?.trim() ? `<b>${lbl('Address')}:</b> ` : ''}${esc(branchData.address)}</div>`
        : '';

    case 'PHONE':
      return branchData?.phone
        ? `<div class="${cls} muted" style="${style}">${line.customText?.trim() ? `<b>${lbl('Phone')}:</b> ` : ''}${esc(branchData.phone)}</div>`
        : '';

    case 'INVOICE_NO':
      return `<div class="${cls}" style="${style}">${lbl('Invoice')} - ${esc(invoiceValue)}</div>`;

    case 'DATE_TIME':
      return `<div class="${cls}" style="${style}">${line.customText?.trim() ? `<b>${lbl('Date')}:</b> ` : ''}${esc(dateStr)}</div>`;

    case 'CASHIER':
      return `<div class="${cls}" style="${style}"><b>${lbl('Cashier')}:</b> ${esc(cashierName)}</div>`;

    case 'CUSTOMER':
      return `<div class="${cls}" style="${style}"><b>${lbl('Customer')}:</b> ${esc(customerName || 'Walk-in')}</div>`;

    case 'ITEM_TABLE': {
      let cfg = {};
      try { cfg = JSON.parse(line.customText || '{}'); } catch { cfg = {}; }
      return `<table class="items">${buildItemRows(items, settings, {
        nameSize:    line.fontSize || 11,
        showStrike:  cfg.showStrike !== false,
        showQtyUnit: !!cfg.showQtyUnit,
        currency,
      })}</table>`;
    }

    case 'SUBTOTAL':
      return two('Sub Total', lkr(subTotal));

    case 'DISCOUNT':
      return displayDiscount > 0.001 ? two('Discount', `-${lkr(displayDiscount)}`) : '';

    case 'NET_TOTAL':
      return two('Net Total', lkr(grandTotal), 'grand');

    case 'PAID':
      return two('Paid', lkr(paidAmount));

    case 'BALANCE':
      return balanceShow > 0 ? two('Balance', lkr(balanceShow)) : '';

    case 'CREDIT_DUE':
      return dueAmount > 0
        ? `<div class="${cls} two-col credit-due" style="${style}"><span>${lbl('Credit Due')}</span><span>${lkr(dueAmount)}</span></div>`
        : '';

    case 'THANKS_MESSAGE':
      // customText in the line itself is the thanks text (typed directly in the editor).
      // Falls back to 'Thank You, Come Again!' if nothing typed.
      return `<div class="${cls}" style="${style}">${esc(line.customText?.trim() || 'Thank You, Come Again!')}</div>`;

    case 'CUSTOM_TEXT':
      return line.customText?.trim()
        ? `<div class="${cls}" style="${style}">${esc(line.customText)}</div>`
        : '';

    case 'SEPARATOR':
      return line.customText?.trim() === 'solid'
        ? '<div class="sep sep-solid"></div>'
        : '<div class="sep"></div>';

    case 'BLANK':
      return '<div class="blank"></div>';

    default:
      return '';
  }
};

const buildItemRows = (items, settings, tableConfig = {}) => {
  const src = settings?.itemNameSource;
  const {
    nameSize    = 11,
    showStrike  = true,
    showQtyUnit = false,
    currency    = 'LKR',
  } = tableConfig;

  // Both name and price rows use the same font size (controlled by line.fontSize)
  const tdStyle    = `font-size:${nameSize}px`;
  // Strikethrough original price: slightly smaller than the row font
  const strikeSize = Math.max(7, nameSize - 2);

  return (items || [])
    .map((item) => {
      const primaryName = item.name || item.itemName || 'Item';
      const displayName =
        src === 'ALT' && item.altName?.trim() ? item.altName : primaryName;
      const qty       = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const baseTotal = qty * unitPrice;

      // Resolve the post-discount line total — prefer explicit field, fall back to calculation
      const lineTotal = Number(
        item.lineTotal ??
        item.effectiveLineTotal ??
        baseTotal
      );

      // Resolve the actual discount amount in rupees for this line
      // Priority: explicit lineDiscount / discountAmount → derive from discountType+discountValue → derive from baseTotal−lineTotal
      let lineDiscountAmt = 0;
      if (Number(item.lineDiscount || 0) > 0) {
        lineDiscountAmt = Number(item.lineDiscount);
      } else if (Number(item.discountAmount || 0) > 0) {
        lineDiscountAmt = Number(item.discountAmount);
      } else if (item.discountType === 'FIXED' || item.effectiveDiscountType === 'FIXED') {
        lineDiscountAmt = Number(item.effectiveDiscountValue ?? item.discountValue ?? 0);
      } else if (item.discountType === 'PERCENT' || item.effectiveDiscountType === 'PERCENT') {
        const pct = Number(item.effectiveDiscountValue ?? item.discountValue ?? 0);
        lineDiscountAmt = (baseTotal * pct) / 100;
      } else if (baseTotal > 0 && lineTotal < baseTotal) {
        // Last resort: infer from base vs actual line total
        lineDiscountAmt = baseTotal - lineTotal;
      }

      const hasDiscount = showStrike && lineDiscountAmt > 0.001 && unitPrice > 0 && qty > 0;
      // Effective unit price after discount
      const effUnit = hasDiscount ? lineTotal / qty : unitPrice;

      const qtyStr = showQtyUnit && item.qtyUnit
        ? `${esc(qty)} ${esc(item.qtyUnit)}`
        : `${esc(qty)}`;

      const strikeHtml = `<s style="color:#999;font-size:${strikeSize}px;text-decoration:line-through;margin-right:3px">${money(unitPrice)}</s>`;
      const priceCell = hasDiscount
        ? `${strikeHtml}${money(effUnit)} × ${qtyStr}`
        : `${money(unitPrice)} × ${qtyStr}`;

      return (
        `<tr><td colspan="3" class="item-name" style="${tdStyle}">${esc(displayName)}</td></tr>` +
        `<tr><td class="muted" style="${tdStyle}">${priceCell}</td><td></td><td class="right" style="${tdStyle}">${currency} ${money(lineTotal)}</td></tr>`
      );
    })
    .join('');
};

/**
 * Build the full HTML string for a POS thermal receipt.
 *
 * @param {object} params
 * @param {object}  params.settings      normalizeReceiptSettings() result
 * @param {object}  params.branchData    { name, address, phone, logo, cashierName }
 * @param {string}  params.storeName
 * @param {object}  params.orderData     { invoiceNo, createdAt, subTotal, billDiscount, netTotal, paidAmount, dueAmount }
 * @param {Array}   params.items         [{ name, altName, qty, unitPrice, lineTotal }]
 * @param {object}  params.customerData  { name }
 * @param {object}  [params.options]     { includeCopies }
 * @returns {string} complete HTML document string
 */
export const buildPosReceiptHtml = ({
  settings,
  branchData = {},
  storeName = '',
  orderData = {},
  items = [],
  customerData = null,
  options = {},
}) => {
  const paperWidth = Math.max(48, Math.min(210, Number(settings?.paperWidthMm || 72)));
  const fontFamily = getFontFamily(settings?.receiptFontFamily);
  const copies =
    options.includeCopies === false
      ? 1
      : Math.max(1, Math.min(10, Number(settings?.printerCopies || 1)));

  const lines = getActiveTemplateLines(settings);
  const dataObj = { settings, branchData, storeName, orderData, customerData };

  const billHtml =
    `<div class="bill">` +
    lines.map((l) => renderLine(l, dataObj, items)).join('') +
    `<div class="sep sep-solid"></div>` +
    `<div class="credits">` +
    `<div>SOFTWARE BY ZENSYS SOLUTIONS</div>` +
    `<div>Smart Retail Solutions | 0704589764</div>` +
    `</div></div>`;

  const bills = Array.from({ length: copies }, () => billHtml).join('');

  return (
    `<!doctype html><html><head><meta charset="utf-8"/><style>` +
    `@page{size:${paperWidth}mm auto;margin:0}` +
    `*{box-sizing:border-box}` +
    `body{margin:0;background:#fff;color:#111;font-family:${fontFamily};font-size:11px}` +
    `.bill{width:${paperWidth}mm;padding:4mm;page-break-after:always}` +
    `.bill:last-child{page-break-after:auto}` +
    `.rl{margin:2px 0;line-height:1.3}` +
    `.al-center{text-align:center}.al-right{text-align:right}.al-left{text-align:left}.al-split{text-align:left}` +
    `.muted{color:#444}.ucase{text-transform:uppercase}.bld{font-weight:800}.itl{font-style:italic}.uln{text-decoration:underline}` +
    `.logo{display:block;margin-bottom:3mm;max-width:100%;height:auto}` +
    `.two-col{display:flex;justify-content:space-between;gap:8px}` +
    `.grand{border-top:1px dashed #111;padding-top:5px}` +
    `.credit-due{padding-top:6px}` +
    `.sep{border-top:1px dashed #111;margin:8px 0}` +
    `.sep-solid{border-top-style:solid}` +
    `.blank{height:8px}` +
    `table.items{width:100%;border-collapse:collapse}` +
    `table.items td{padding:2px 0;vertical-align:top}` +
    `.item-name{font-weight:700;padding-top:5px}` +
    `.right{text-align:right}` +
    `.credits{margin-top:4px;text-align:center;font-size:9px;color:#666;line-height:1.5}` +
    `</style></head><body>${bills}</body></html>`
  );
};
