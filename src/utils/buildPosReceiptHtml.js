/**
 * buildPosReceiptHtml.js
 * HTML string renderer for the POS thermal receipt, driven by template lines.
 * Mirrors the GMS buildThermalBillHtml approach.
 *
 * This is the one renderer for the thermal sale slip: the designer's live preview and the
 * till's print both come through here, so what the shop sees while laying the slip out is
 * what comes off the printer.
 */
import {
  createReceiptTemplateLine,
  getActiveTemplateLines,
  parseItemTableConfig,
} from './receiptSettings';
import { formatQuantityWithUnit } from './formatters';
import { STOCK_BASE_UNITS_PER_UNIT } from './stockQuantity';

/** Lines that belong above the stamp: the shop's own letterhead. */
const HEADER_LINE_TYPES = ['LOGO', 'STORE_NAME', 'BRANCH_NAME', 'ADDRESS', 'PHONE', 'SEPARATOR', 'BLANK'];

const money = (v) => Number(v || 0).toFixed(2);

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Sinhala faces sit after the chosen font so Latin text keeps that font and only the glyphs
// it lacks fall through, an alt name in Sinhala must not print as boxes on the shop's PC.
const SINHALA_FALLBACK = "'Iskoola Pota', 'Noto Sans Sinhala', 'Nirmala UI'";

const getFontFamily = (key) => {
  switch (key) {
    case 'ARIAL':
      return `Arial, Helvetica, ${SINHALA_FALLBACK}, sans-serif`;
    case 'VERDANA':
      return `Verdana, Geneva, ${SINHALA_FALLBACK}, sans-serif`;
    case 'TAHOMA':
      return `Tahoma, Geneva, ${SINHALA_FALLBACK}, sans-serif`;
    case 'COURIER_NEW':
    default:
      return `'Courier New', Courier, ${SINHALA_FALLBACK}, monospace`;
  }
};

// ── Per-line arithmetic ──────────────────────────────────────────────────────
// Shared by the item table and the DISCOUNT total so the two never disagree about what a
// line's discount was.

/**
 * The line before any discount. A weight item is priced per kilo but sold in grams, so its
 * base is qty × the per-gram price, not qty × the shelf price. That product is a thousand
 * times too large and would read as a discount on every gram sold.
 */
const lineBaseTotal = (item) => {
  const qty = Number(item?.qty || 0);
  const unitPrice = Number(item?.unitPrice || 0);
  const unit = String(item?.qtyUnit || '').toUpperCase();
  if (unit === 'G' || unit === 'ML') {
    const perSmall = Number(item?.perSmallUnitPrice ?? item?.perGramPrice);
    return qty * (Number.isFinite(perSmall) ? perSmall : unitPrice / STOCK_BASE_UNITS_PER_UNIT);
  }
  return qty * unitPrice;
};

/** What the line actually came to. Explicit when the caller priced it; else the base. */
const lineFinalTotal = (item) => {
  const explicit = Number(item?.lineTotal ?? item?.effectiveLineTotal);
  return Number.isFinite(explicit) && explicit >= 0 ? explicit : lineBaseTotal(item);
};

const lineDiscountType = (item) => item?.effectiveDiscountType || item?.discountType || null;
const lineDiscountValue = (item) => Number(item?.effectiveDiscountValue ?? item?.discountValue ?? 0);

/**
 * Rupees taken off this line, from whichever field the caller filled in.
 *
 * <p>Base minus the explicit line total comes first because it is the only figure that
 * captures every cut at once, a line discount and a promotion on the same item. The typed
 * discount is the fallback for callers that hand over no line total.
 */
const lineDiscountAmount = (item) => {
  const baseTotal = lineBaseTotal(item);
  let disc = 0;
  if (Number(item?.lineDiscount || 0) > 0) {
    disc = Number(item.lineDiscount);
  } else if (Number(item?.discountAmount || 0) > 0) {
    disc = Number(item.discountAmount);
  } else if (Number.isFinite(Number(item?.lineTotal ?? item?.effectiveLineTotal)) && baseTotal > 0) {
    disc = baseTotal - lineFinalTotal(item);
  } else {
    const type = lineDiscountType(item);
    if (type === 'FIXED') disc = lineDiscountValue(item);
    else if (type === 'PERCENT') disc = (baseTotal * lineDiscountValue(item)) / 100;
    disc += Number(item?.promotionDiscountAmount || 0);
  }
  return Math.max(0, Math.round(disc * 100) / 100);
};

const fmtQty = (qty) => {
  const n = Number(qty || 0);
  if (!Number.isFinite(n)) return String(qty ?? '');
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
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

  // A label and a figure as a two-column table, not a flex row: the label may wrap inside
  // its own cell when the shop picks a big font or types a long Sinhala label, and the
  // figure keeps its column and stays on one line. Nothing ever runs into its neighbour.
  const two = (label, val, extraCls) => {
    const allCls = [cls, 'two-col', extraCls].filter(Boolean).join(' ');
    return `<table class="${allCls}" style="${style}"><tr><td class="lbl">${lbl(label)}</td><td class="val">${val}</td></tr></table>`;
  };

  // A pre-bill is the unpaid table bill handed over before payment. Nothing has been paid,
  // so the money lines that describe a payment print nothing rather than "Paid 0.00".
  const isPreBill = orderData?.documentType === 'PRE_BILL';
  const invoiceValue = orderData?.invoiceNo || orderData?.orderId || 'INV-2026-000001';
  const dateStr = orderData?.createdAt
    ? new Date(orderData.createdAt).toLocaleString()
    : new Date().toLocaleString();
  const cashierName = branchData?.cashierName || orderData?.cashierName || 'Cashier';
  const customerName = customerData?.name || orderData?.customerName || '';
  // Sub Total is the goods at shelf price, summed from the lines the slip prints, not a
  // figure the caller hands over. The till and the sales history used to hand over two
  // different numbers under that name (the till the shelf total, the server the total after
  // line discounts) so the same invoice printed with two different Sub Totals. A return
  // slip prices its lines differently and keeps the caller's figure.
  const isReturnSlip = orderData?.refundMethod != null;
  const listTotal = !isReturnSlip && Array.isArray(items) && items.length > 0
    ? items.reduce((sum, item) => sum + lineBaseTotal(item), 0)
    : NaN;
  const subTotal     = Number.isFinite(listTotal)
    ? Math.round(listTotal * 100) / 100
    : Number(orderData?.subTotal ?? 0);
  const grandTotal   = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
  const paidAmount   = Number(orderData?.paidAmount ?? 0);
  const dueAmount    = Math.max(0, Number(orderData?.dueAmount ?? 0));
  const changeAmt    = Math.max(0, paidAmount - grandTotal);
  const balanceShow  = dueAmount > 0 ? dueAmount : changeAmt;

  // ── Loyalty ───────────────────────────────────────────────────────────────
  // Every one of these prints nothing when it is zero, so a shop can leave the lines in its
  // template and a walk-in sale still comes out clean.
  const pointsEarned   = Math.max(0, Number(orderData?.loyaltyPointsEarned ?? 0));
  const pointsRedeemed = Math.max(0, Number(orderData?.loyaltyPointsRedeemed ?? 0));
  const pointsDiscount = Math.max(0, Number(orderData?.loyaltyDiscountAmount ?? 0));
  // The balance as at this sale, banked on the order, not the customer's balance now, or a
  // reprint would disagree with the slip it is a copy of.
  const pointsBalance  = Math.max(0, Number(orderData?.loyaltyPointsBalance ?? 0));
  // A return moves points too, and its slip wants the same balance line.
  const pointsTakenBack = Math.max(0, Number(orderData?.loyaltyPointsTakenBack ?? 0));
  const pointsGivenBack = Math.max(0, Number(orderData?.loyaltyPointsGivenBack ?? 0));
  const touchedPoints  = pointsEarned > 0 || pointsRedeemed > 0
    || pointsTakenBack > 0 || pointsGivenBack > 0;
  const pts = (v) => Number(v || 0).toLocaleString();

  // ── Return slip ───────────────────────────────────────────────────────────
  // The same renderer draws both documents. The line types are disjoint, and every one of
  // them prints nothing when its field is absent, so a sale never grows a refund line and a
  // return never grows a net total.
  const refundMethodLabel = {
    CASH: 'Cash', BANK: 'Bank Transfer', CARD: 'Card', STORE_CREDIT: 'Store Credit',
  }[orderData?.refundMethod] || orderData?.refundMethod || '';
  // The goods' value, what points had paid of it, and the bill-discount share, the three
  // figures that turn "goods returned 1,180" into "cash refund 200" on the slip.
  const returnGoodsValue = (Array.isArray(items) ? items : []).reduce((sum, item) =>
    sum + Number(item?.returnQty ?? 0) * Number(item?.finalUnitPrice ?? 0), 0);
  const returnPointsValue = Math.max(0, Number(orderData?.loyaltyValueReturned ?? 0));
  const returnCash = Math.max(0, Number(orderData?.totalRefundAmount ?? 0));
  const returnDiscountShare = Math.max(0,
    Math.round((returnGoodsValue - returnPointsValue - returnCash) * 100) / 100);
  // A reprint has to say so. Nothing else distinguishes it from the slip it copies, and a
  // second copy of a refund is the one a shop most needs to be able to tell apart.
  //
  // The shop types one heading and the copy wording is added to it, rather than asking for
  // both spellings of the same line. Nothing types "(COPY)" by hand.
  //   (blank)         -> ORIGINAL / COPY
  //   RETURN RECEIPT  -> RETURN RECEIPT / RETURN RECEIPT (COPY)
  // Split on '|' first so a heading saved under the older two-part form still reads right.
  const markHeading = (line.customText?.trim() || '').split('|')[0].trim();
  const printMark = orderData?.isReprint
    ? (markHeading ? `${markHeading} (COPY)` : 'COPY')
    : (markHeading || 'ORIGINAL');

  // ── Total discount = every per-line cut + the bill-level cut ────────────────
  // Per-line figures come from the same helper the item table prints from, so the DISCOUNT
  // total is the sum of what the lines above it say. A line's cut already holds its
  // promotion (it is the shelf total less the priced line), and the server's billDiscount
  // already holds a bill promotion when one won, so neither is added a second time. Adding
  // promotionDiscountTotal on top used to count every offer twice on the slip printed at the
  // till, and read "Sub Total 1,300, Discount 400, Net Total 1,000".
  const lineDiscountSum = (items || []).reduce((sum, item) => sum + lineDiscountAmount(item), 0);
  const billDiscount  = Number(orderData?.billDiscount ?? 0);
  const summedDiscount = Math.max(0, lineDiscountSum + billDiscount);
  // The slip has to add up: Sub Total, less Discount, less Points Discount, is Net Total.
  // Points were already taken off grandTotal, and they are not a discount, spending them is
  // closer to part-payment. Left in, they would be reported on the DISCOUNT line as a price
  // cut the shop never gave. Where the caller's figures agree with the lines the two are the
  // same number; where they drift (rounding, a stale field), the arithmetic wins, because a
  // customer checks the column with a calculator and a breakdown that does not sum is worse
  // than one figure that does.
  const inferredDiscount = !isReturnSlip && subTotal > 0 && grandTotal > 0
    ? Math.round((subTotal - grandTotal - pointsDiscount) * 100) / 100
    : NaN;
  const displayDiscount = Number.isFinite(inferredDiscount)
    ? Math.max(0, inferredDiscount)
    : summedDiscount;

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
      // An unpaid bill has no invoice number yet; what it carries is the table or "CURRENT BILL".
      return `<div class="${cls}" style="${style}">${lbl(isPreBill ? 'Order' : 'Invoice')} - ${esc(invoiceValue)}</div>`;

    case 'DATE_TIME':
      return `<div class="${cls}" style="${style}">${line.customText?.trim() ? `<b>${lbl('Date')}:</b> ` : ''}${esc(dateStr)}</div>`;

    case 'CASHIER':
      return `<div class="${cls}" style="${style}"><b>${lbl('Cashier')}:</b> ${esc(cashierName)}</div>`;

    case 'CUSTOMER':
      return `<div class="${cls}" style="${style}"><b>${lbl('Customer')}:</b> ${esc(customerName || 'Walk-in')}</div>`;

    case 'ITEM_TABLE':
      return `<table class="items">${buildItemRows(items, settings, parseItemTableConfig(line.customText), {
        nameSize: line.fontSize || 11,
        lkr,
        // In a cell the number stays whole but the currency may drop to its own line, so a
        // big font wraps "LKR / 480.00" cleanly instead of pushing the column off the paper.
        amt: (v) => `${esc(currency)} <span class="nowrap">${money(v)}</span>`,
      })}</table>`;

    case 'SUBTOTAL':
      return two('Sub Total', lkr(subTotal));

    case 'DISCOUNT':
      return displayDiscount > 0.001 ? two('Discount', `-${lkr(displayDiscount)}`) : '';

    case 'NET_TOTAL':
      return two('Net Total', lkr(grandTotal), 'grand');

    case 'PAID':
      return isPreBill ? '' : two('Paid', lkr(paidAmount));

    case 'BALANCE':
      return !isPreBill && balanceShow > 0 ? two('Balance', lkr(balanceShow)) : '';

    case 'CREDIT_DUE':
      return dueAmount > 0 ? two(isPreBill ? 'Amount Due' : 'Credit Due', lkr(dueAmount), 'credit-due') : '';

    case 'LOYALTY_REDEEMED':
      return pointsRedeemed > 0 ? two('Points Used', pts(pointsRedeemed)) : '';

    case 'LOYALTY_DISCOUNT':
      return pointsDiscount > 0.001 ? two('Points Discount', `-${lkr(pointsDiscount)}`) : '';

    case 'LOYALTY_EARNED':
      return pointsEarned > 0 ? two('Points Earned', pts(pointsEarned)) : '';

    case 'LOYALTY_BALANCE':
      // Only on a sale that actually moved points: a balance printed beside a walk-in sale
      // belongs to nobody.
      return touchedPoints ? two('Points Balance', pts(pointsBalance)) : '';

    case 'PRINT_MARK':
      return printMark
        ? `<div class="${cls} ucase" style="${style}">${esc(printMark)}</div>`
        : '';

    case 'RETURN_NO':
      return orderData?.returnNo ? two('Return No', esc(orderData.returnNo)) : '';

    case 'ORIGINAL_INVOICE':
      return orderData?.originalInvoiceNo ? two('Orig. Invoice', esc(orderData.originalInvoiceNo)) : '';

    case 'RETURN_ITEM_TABLE':
      return `<table class="items">${buildReturnRows(items, { nameSize: line.fontSize || 11, currency })}</table>`;

    case 'RETURN_GOODS_VALUE':
      // Only when there is something to explain. On a return where the goods' value and the
      // cash refund are the same number, a row saying so twice is noise.
      return returnGoodsValue > 0.001 && (returnPointsValue > 0.001 || returnDiscountShare > 0.001)
        ? two('Goods Returned', lkr(returnGoodsValue)) : '';

    case 'RETURN_POINTS_VALUE':
      return returnPointsValue > 0.001 ? two('Paid with Points', `-${lkr(returnPointsValue)}`) : '';

    case 'RETURN_DISCOUNT_SHARE':
      return returnDiscountShare > 0.001 ? two('Discount Share', `-${lkr(returnDiscountShare)}`) : '';

    case 'TOTAL_REFUND':
      return two('Cash Refund', lkr(returnCash), 'grand');

    case 'REFUND_METHOD':
      return refundMethodLabel ? two('Refund Method', esc(refundMethodLabel)) : '';

    case 'RETURN_REASON':
      return orderData?.reason ? two('Reason', esc(orderData.reason)) : '';

    case 'CASHIER_NOTE':
      return orderData?.cashierNote ? two('Note', esc(orderData.cashierNote)) : '';

    case 'LOYALTY_TAKEN_BACK':
      return pointsTakenBack > 0 ? two('Points Taken Back', `-${pts(pointsTakenBack)}`) : '';

    case 'LOYALTY_GIVEN_BACK':
      return pointsGivenBack > 0 ? two('Points Returned', `+${pts(pointsGivenBack)}`) : '';

    case 'TOTAL_SAVINGS': {
      // What the customer kept, counting both kinds: the shop's price cuts and the points
      // they spent. It is a statement, not a step in the sum, the Discount and Points
      // Discount lines above have each already come off the total, and a line that added
      // them up again in the same column would leave a receipt that does not add up. So it
      // belongs below Net Total, where a customer reads it as "you saved this today".
      const saved = displayDiscount + pointsDiscount;
      return saved > 0.001 ? two('You Saved', `-${lkr(saved)}`) : '';
    }

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

/**
 * Returned items: what came back, at what it was actually sold for, and what that refunds.
 *
 * <p>Deliberately not buildItemRows with different keys. A sale line carries a list price, a
 * discount and a promotion to explain; a return line carries none of that. It is the price
 * charged, the quantity coming back, and the money going out.
 */
const buildReturnRows = (items, { nameSize = 11, currency = 'LKR' } = {}) => {
  const tdStyle = `font-size:${nameSize}px`;
  return (Array.isArray(items) ? items : []).map((item) => {
    const qty = Number(item?.returnQty ?? item?.qty ?? 0);
    const unit = Number(item?.finalUnitPrice ?? item?.unitPrice ?? 0);
    // What the goods sold for. The cash share of it is the refund line below the table;
    // printed here beside the unit price it reads as a mistake, because 800.00 x 1 is not 135.59.
    const amount = qty * unit;
    const name = item?.itemName || item?.name || 'Item';
    return (
      `<tr><td colspan="3" class="item-name" style="${tdStyle}">${esc(name)}</td></tr>` +
      `<tr><td class="muted" style="${tdStyle}">${money(unit)} × ${esc(qty)}</td>` +
      `<td></td><td class="right" style="${tdStyle}">${currency} ${money(amount)}</td></tr>`
    );
  }).join('');
};

/**
 * The sale lines, laid out the way the ITEM_TABLE line's config asks.
 *
 * <p>Two layouts. COLUMNS, the default, is the supermarket slip: a heading row, the name,
 * then normal price / our price / qty / total in four columns. STACKED is below:
 *
 * <p>Three columns, price, quantity, amount, under an optional heading row, with the item
 * name on its own row above them so a long name never squeezes the figures. A discounted
 * line shows the shelf price struck through beside the price actually charged, the way a
 * customer expects to read "was / now"; the amount the cut is worth is a separate optional
 * row for shops that want it spelled out.
 *
 * <p>When neither the unit price nor the quantity is wanted the name and amount share one
 * row: a shop that switched both off asked for a compact slip, not for an empty second row.
 */
const buildItemRows = (items, settings, cfg, { nameSize = 11, lkr, amt = lkr } = {}) => {
  const src = settings?.itemNameSource;
  const showWarranty = settings?.showWarranty !== false;
  const tdStyle = `font-size:${nameSize}px`;
  const smallStyle = `font-size:${Math.max(7, nameSize - 2)}px`;
  const compact = !cfg.showUnitPrice && !cfg.showQty;

  const resolveName = (item) => {
    const primaryName = item.name || item.itemName || 'Item';
    return src === 'ALT' && item.altName?.trim() ? item.altName : primaryName;
  };
  const warrantyHtml = (item) => (showWarranty && item.warrantyLabel
    ? `<div class="muted item-sub" style="${smallStyle}">Warranty: ${esc(item.warrantyLabel)}` +
      (item.warrantyPeriodValue && item.warrantyPeriodUnit
        ? ` (${esc(item.warrantyPeriodValue)} ${esc(item.warrantyPeriodUnit)})`
        : '') +
      `</div>`
    : '');
  const qtyText = (item, qty) => (cfg.showQtyUnit && item.qtyUnit
    ? esc(formatQuantityWithUnit(qty, item.qtyUnit))
    : esc(fmtQty(qty)));
  // Named after the promotion when one gave the cut, else the shop's own label; a percent
  // discount says what percent so the figure beside it is explained.
  // A line's cut is split into what the offer gave and what the cashier gave on top, each
  // named. The offer's own figure is the one the engine reported; the cashier's share is
  // whatever is left of the line's total cut, since the stored discount pair has both
  // folded into one per-unit number and cannot be read back apart. The two parts add up
  // to the figure the amount column moved by.
  const discountRowHtml = (item, discount, span) => {
    if (!cfg.showDiscountLine || !(discount > 0.001)) return '';
    const promoPart = Math.min(Math.max(0, Number(item.promotionDiscountAmount || 0)), discount);
    const manualPart = Math.max(0, Math.round((discount - promoPart) * 100) / 100);
    const parts = [];
    if (promoPart > 0.001) {
      parts.push(`${esc(item.promotionName || cfg.labelDiscount)}: -${lkr(promoPart)}`);
    }
    if (manualPart > 0.001) {
      const label = promoPart <= 0.001 && lineDiscountType(item) === 'PERCENT' && lineDiscountValue(item) > 0
        ? `${fmtQty(lineDiscountValue(item))}% ${cfg.labelDiscount}`
        : cfg.labelDiscount;
      parts.push(`${esc(label)}: -${lkr(manualPart)}`);
    }
    return `<tr><td colspan="${span}" class="muted itl item-disc" style="${smallStyle}">${parts.join(' + ')}</td></tr>`;
  };

  if (cfg.layout === 'COLUMNS') {
    // Normal price | our price | qty | total, each figure under its heading. The first
    // column sits on the paper's left edge, the rest hang right, so the row reads from
    // margin to margin like the supermarket slips do. The normal price is struck only
    // where it was cut; on a plain line both prices print the same
    // number rather than leaving a hole in the column. Currency goes on the total alone,
    // four figures across a 72mm roll leave no room to repeat it.
    const span = cfg.showQty ? 4 : 3;
    // Column widths are declared, not left to the words in the headings: without them the
    // browser sizes the first column to fit "Normal Price" on one line and squeezes the
    // total until "LKR 480.00" breaks in two. With them a heading wraps inside its own
    // column and the figures keep theirs.
    const colgroup = cfg.showQty
      ? '<colgroup><col style="width:25%"><col style="width:25%"><col style="width:14%"><col style="width:36%"></colgroup>'
      : '<colgroup><col style="width:29%"><col style="width:29%"><col style="width:42%"></colgroup>';
    // A point smaller than the rows, and free to wrap.
    const thStyle = `font-size:${Math.max(7, nameSize - 1)}px`;
    const header = cfg.showHeader
      ? `<tr class="items-head"><th style="${thStyle}">${esc(cfg.labelPrice)}</th>` +
        `<th class="right" style="${thStyle}">${esc(cfg.labelOurPrice)}</th>` +
        (cfg.showQty ? `<th class="center" style="${thStyle}">${esc(cfg.labelQty)}</th>` : '') +
        `<th class="right" style="${thStyle}">${esc(cfg.labelTotal)}</th></tr>`
      : '';
    const rows = (items || []).map((item) => {
      const qty       = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const baseTotal = lineBaseTotal(item);
      const lineTotal = lineFinalTotal(item);
      const discount  = lineDiscountAmount(item);
      const hasDiscount = discount > 0.001 && baseTotal > 0 && qty > 0;
      const effUnit = hasDiscount ? unitPrice * (lineTotal / baseTotal) : unitPrice;
      const marked = hasDiscount && cfg.showStrike
        ? `<s style="${smallStyle}">${money(unitPrice)}</s>`
        : money(unitPrice);
      return (
        `<tr><td colspan="${span}" class="item-name" style="${tdStyle}">${esc(resolveName(item))}${warrantyHtml(item)}</td></tr>` +
        `<tr><td class="muted nowrap" style="${tdStyle}">${marked}</td>` +
        `<td class="right nowrap" style="${tdStyle}">${money(effUnit)}</td>` +
        (cfg.showQty ? `<td class="center nowrap" style="${tdStyle}">${qtyText(item, qty)}</td>` : '') +
        `<td class="right" style="${tdStyle}">${amt(lineTotal)}</td></tr>` +
        discountRowHtml(item, discount, span)
      );
    }).join('');
    return colgroup + header + rows;
  }

  const colgroup = '<colgroup><col style="width:50%"><col style="width:16%"><col style="width:34%"></colgroup>';
  const header = cfg.showHeader
    ? `<tr class="items-head"><th style="${tdStyle}">${esc(cfg.labelItem)}</th>` +
      `<th class="center" style="${tdStyle}">${cfg.showQty ? esc(cfg.labelQty) : ''}</th>` +
      `<th class="right" style="${tdStyle}">${esc(cfg.labelAmount)}</th></tr>`
    : '';

  const rows = (items || [])
    .map((item) => {
      const qty       = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const baseTotal = lineBaseTotal(item);
      const lineTotal = lineFinalTotal(item);
      const discount  = lineDiscountAmount(item);
      const hasDiscount = discount > 0.001 && baseTotal > 0 && qty > 0;

      // The price per unit actually charged: the shelf price scaled by the cut. Scaling keeps
      // the unit, a per-kilo price stays per kilo even when the line was sold in grams.
      const effUnit = hasDiscount ? unitPrice * (lineTotal / baseTotal) : unitPrice;

      // "Price: 480.00" on a plain line; on a discounted one the shelf price struck through
      // and the charged price named as the shop's own, "480.00 Our Price: 450.00", which
      // is how a customer reads "was / now" without a column heading to explain it.
      // Label and figure stay on one line; if the cell must wrap it breaks after the
      // struck price, never between "Our Price:" and the number it names.
      const withLabel = (label, value) =>
        `<span class="nowrap">${label ? `${esc(label)}: ` : ''}${value}</span>`;
      const priceCell = !cfg.showUnitPrice
        ? ''
        : hasDiscount && cfg.showStrike
          ? `<s style="${smallStyle}">${money(unitPrice)}</s> ${withLabel(cfg.labelOurPrice, money(effUnit))}`
          : withLabel(cfg.labelPrice, money(unitPrice));

      const nameHtml = `${esc(resolveName(item))}${warrantyHtml(item)}`;
      const discountRow = discountRowHtml(item, discount, 3);
      if (compact) {
        return (
          `<tr><td colspan="2" class="item-name" style="${tdStyle}">${nameHtml}</td>` +
          `<td class="right item-amt" style="${tdStyle}">${amt(lineTotal)}</td></tr>` +
          discountRow
        );
      }
      return (
        `<tr><td colspan="3" class="item-name" style="${tdStyle}">${nameHtml}</td></tr>` +
        `<tr><td class="muted" style="${tdStyle}">${priceCell}</td>` +
        `<td class="center nowrap" style="${tdStyle}">${cfg.showQty ? qtyText(item, qty) : ''}</td>` +
        `<td class="right" style="${tdStyle}">${amt(lineTotal)}</td></tr>` +
        discountRow
      );
    })
    .join('');

  return colgroup + header + rows;
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
  templateType = 'THERMAL',
  options = {},
}) => {
  const paperWidth = Math.max(48, Math.min(210, Number(settings?.paperWidthMm || 72)));
  const fontFamily = getFontFamily(settings?.receiptFontFamily);
  const copies =
    options.includeCopies === false
      ? 1
      : Math.max(1, Math.min(10, Number(settings?.printerCopies || 1)));

  // Which default layout to fall back on when the shop has not customised this document.
  const savedLines = getActiveTemplateLines(settings, templateType);

  // Two documents are stamped under the shop's letterhead by the renderer, on every layout,
  // because neither may depend on anyone remembering to add a line:
  //   - a reprint is stamped COPY. Nothing else distinguishes it from the slip it copies.
  //     Originals carry no stamp. A layout saved while the mark was still a line keeps
  //     working - the renderer defers to it rather than stamping twice.
  //   - an unpaid table bill is stamped as one. It looks like a receipt and is not, and a
  //     customer holding it must not be able to mistake it for proof of payment.
  let stamp = null;
  if (orderData?.isReprint && !savedLines.some((l) => l.type === 'PRINT_MARK')) {
    stamp = createReceiptTemplateLine('PRINT_MARK');
  } else if (orderData?.documentType === 'PRE_BILL') {
    stamp = {
      ...createReceiptTemplateLine('CUSTOM_TEXT'),
      align: 'center',
      bold: true,
      fontSize: 12,
      customText: `${String(orderData.subTitle || 'Unpaid Bill').toUpperCase()} - NOT A RECEIPT`,
    };
  }
  const lines = stamp
    ? (() => {
        let at = 0;
        while (at < savedLines.length && HEADER_LINE_TYPES.includes(savedLines[at].type)) at += 1;
        return [...savedLines.slice(0, at), stamp, ...savedLines.slice(at)];
      })()
    : savedLines;
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
    `table.two-col{width:100%;border-collapse:collapse;table-layout:auto}` +
    `table.two-col td{padding:0;vertical-align:top}` +
    `table.two-col .lbl{text-align:left;padding-right:8px;word-break:break-word}` +
    `table.two-col .val{text-align:right;white-space:nowrap;width:1%}` +
    `.grand{border-top:1px dashed #111;padding-top:5px}` +
    `.credit-due{padding-top:6px}` +
    `.sep{border-top:1px dashed #111;margin:8px 0}` +
    `.sep-solid{border-top-style:solid}` +
    `.blank{height:8px}` +
    `table.items{width:100%;max-width:100%;border-collapse:collapse}` +
    `table.items td{padding:2px 0;vertical-align:top}` +
    `table.items th{padding:2px 0 3px;text-align:left;font-weight:700;border-bottom:1px dashed #111;vertical-align:bottom}` +
    // Heading and figure share an edge. Written at the th's own specificity, or the
    // left-align above wins and every heading sits a column's width from its number.
    `table.items td.center,table.items th.center{text-align:center;padding-left:6px;padding-right:6px}` +
    `table.items td.right,table.items th.right{text-align:right;padding-left:6px}` +
    `table.items s{color:#888;margin-right:4px}` +
    `.item-name{font-weight:700;padding-top:5px;word-break:break-word}` +
    `.item-amt{padding-top:5px}` +
    `.item-sub{font-weight:400}` +
    `.item-disc{padding-left:8px}` +
    `.right{text-align:right}.center{text-align:center}.nowrap{white-space:nowrap}` +
    `.credits{margin-top:4px;text-align:center;font-size:9px;color:#666;line-height:1.5}` +
    `</style></head><body>${bills}</body></html>`
  );
};
