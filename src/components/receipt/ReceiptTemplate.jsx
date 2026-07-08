import React from 'react';
import { formatCurrency, formatQuantityWithUnit } from '../../utils/formatters';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';
import { translateText, LANGUAGES } from '../../utils/translations';

export const formatReceiptTemplateQty = (qty, qtyUnit) =>
  formatQuantityWithUnit(qty, qtyUnit).replace(/\bSERVICE\b/g, 'S');

const mmToPx = (mm) => `${Math.round(mm * 3.78)}px`;

const templateUnit = (mode, mm, pxFallback) => (mode === 'print' ? `${mm}mm` : pxFallback || mmToPx(mm));

const getReceiptFontFamily = (settings, language) => {
  const si = language === LANGUAGES.SI ? "'Iskoola Pota', 'Noto Sans Sinhala', 'Nirmala UI', " : '';
  switch (settings.receiptFontFamily) {
    case 'ARIAL':
      return `${si}Arial, Helvetica, sans-serif`;
    case 'VERDANA':
      return `${si}Verdana, Geneva, sans-serif`;
    case 'TAHOMA':
      return `${si}Tahoma, Geneva, sans-serif`;
    case 'COURIER_NEW':
    default:
      return `${si}'Courier New', Courier, monospace`;
  }
};

const getLogoWidth = (settings, mode) => {
  if (mode === 'print') {
    return `${Math.max(20, ((settings.paperWidthMm - 6) * settings.logoWidthPercent) / 100)}mm`;
  }

  return `${Math.round((Number(settings.logoWidthPercent) / 100) * 220)}px`;
};

const getLogoMaxHeight = (settings, mode, templateType) => {
  const normalizedPercent = Math.max(35, Math.min(200, Number(settings.logoWidthPercent) || 78));
  const isThermalFamily = templateType === PRINT_TEMPLATE_TYPES.THERMAL || templateType === PRINT_TEMPLATE_TYPES.KOT;

  if (mode === 'print') {
    if (isThermalFamily) {
      return `${Math.max(18, 14 + (normalizedPercent - 35) * 0.24)}mm`;
    }
    return '28mm';
  }

  if (isThermalFamily) {
    return `${Math.round(Math.max(70, 52 + (normalizedPercent - 35) * 1.1))}px`;
  }
  return '132px';
};

const getLogoTopSpacing = (settings, mode) =>
  mode === 'print'
    ? `${Math.max(0, Number(settings.logoTopSpacing) || 0) / 2}mm`
    : `${Math.max(0, Number(settings.logoTopSpacing) || 0) * 2}px`;

const calculateItemTotal = (item) => {
  const lineTotal = Number(item?.lineTotal);
  if (Number.isFinite(lineTotal) && lineTotal >= 0) {
    return lineTotal;
  }

  const qty = Number(item?.qty || 0);
  const unitPrice = Number(item?.unitPrice || 0);
  const perSmallUnitPrice = Number(item?.perSmallUnitPrice ?? item?.perGramPrice);
  const qtyUnit = String(item?.qtyUnit || '').toUpperCase();

  let itemTotal = (qtyUnit === 'G' || qtyUnit === 'ML') && Number.isFinite(perSmallUnitPrice)
    ? qty * perSmallUnitPrice
    : qty * unitPrice;

  const discountType = item?.discountType || item?.effectiveDiscountType;
  const discountValue = Number((item?.discountValue ?? item?.effectiveDiscountValue) || 0);

  if (discountType === 'FIXED') {
    itemTotal -= discountValue;
  } else if (discountType === 'PERCENT') {
    itemTotal -= (itemTotal * discountValue) / 100;
  }

  const promotionDiscountAmount = Number(item?.promotionDiscountAmount || 0);
  if (promotionDiscountAmount > 0) {
    itemTotal -= promotionDiscountAmount;
  }

  return Math.max(0, itemTotal);
};

const calculateItemBaseTotal = (item) => {
  const qty = Number(item?.qty || 0);
  const unitPrice = Number(item?.unitPrice || 0);
  const perSmallUnitPrice = Number(item?.perSmallUnitPrice ?? item?.perGramPrice);
  const qtyUnit = String(item?.qtyUnit || '').toUpperCase();

  if (qtyUnit === 'G' || qtyUnit === 'ML') {
    return qty * (Number.isFinite(perSmallUnitPrice) ? perSmallUnitPrice : 0);
  }

  return qty * (Number.isFinite(unitPrice) ? unitPrice : 0);
};

const calculateItemDiscountAmount = (item) => {
  const promotionDiscountAmount = Number(item?.promotionDiscountAmount || 0);
  const discountType = item?.discountType || item?.effectiveDiscountType;
  const discountValue = Number((item?.discountValue ?? item?.effectiveDiscountValue) || 0);

  let explicitDiscountAmount = 0;
  if (discountType === 'FIXED') {
    explicitDiscountAmount = discountValue;
  } else if (discountType === 'PERCENT') {
    const qty = Number(item?.qty || 0);
    const unitPrice = Number(item?.unitPrice || 0);
    const perSmallUnitPrice = Number(item?.perSmallUnitPrice ?? item?.perGramPrice);
    const qtyUnit = String(item?.qtyUnit || '').toUpperCase();
    const baseAmount = (qtyUnit === 'G' || qtyUnit === 'ML') && Number.isFinite(perSmallUnitPrice)
      ? qty * perSmallUnitPrice
      : qty * unitPrice;
    explicitDiscountAmount = (baseAmount * discountValue) / 100;
  } else {
    const baseTotal = calculateItemBaseTotal(item);
    const finalTotal = calculateItemTotal(item);
    if (Number.isFinite(baseTotal) && Number.isFinite(finalTotal) && baseTotal > finalTotal) {
      explicitDiscountAmount = baseTotal - finalTotal - promotionDiscountAmount;
    }
  }

  return Math.max(0, explicitDiscountAmount + promotionDiscountAmount);
};

const calculateTotalDiscount = (items, billDiscount, promotionDiscountTotal = 0) => {
  const itemDiscountTotal = Array.isArray(items)
    ? items.reduce((sum, item) => sum + calculateItemDiscountAmount(item), 0)
    : 0;
  const effectiveItemDiscount = itemDiscountTotal > 0 ? itemDiscountTotal : Number(promotionDiscountTotal || 0);
  return Math.max(0, effectiveItemDiscount + Number(billDiscount || 0));
};

const getStyles = (settings, mode, templateType, language) => ({
  page: {
    width: '100%',
    boxSizing: 'border-box',
    pageBreakAfter: 'always',
  },
  receipt: {
    fontFamily: getReceiptFontFamily(settings, language),
    width: '100%',
    boxSizing: 'border-box',
    fontSize: templateUnit(mode, 3, '12px'),
    lineHeight: 1.35,
    color: '#000',
    backgroundColor: '#fff',
    padding: mode === 'print' ? '0 3mm 3mm' : '4px 16px 16px',
  },
  header: {
    textAlign: 'center',
  },
  logoWrap: {
    marginTop: getLogoTopSpacing(settings, mode),
    marginBottom: mode === 'print' ? '1.5mm' : '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getLogoMaxHeight(settings, mode, templateType),
    lineHeight: 0,
    overflow: 'hidden',
  },
  logo: {
    width: getLogoWidth(settings, mode),
    maxWidth: '100%',
    maxHeight: getLogoMaxHeight(settings, mode, templateType),
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  },
  title: {
    fontSize: templateUnit(mode, 5.6, '18px'),
    margin: mode === 'print' ? '0 0 1mm 0' : '0 0 6px 0',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  headerParagraph: {
    margin: mode === 'print' ? '0.6mm 0' : '3px 0',
    fontSize: templateUnit(mode, 3, '12px'),
  },
  branchName: {
    fontWeight: 700,
  },
  contactInfo: {
    margin: mode === 'print' ? '0.8mm 0 0' : '4px 0 0',
  },
  contactParagraph: {
    margin: mode === 'print' ? '0.5mm 0' : '4px 0',
    fontSize: mode === 'print' ? '2.8mm' : '12px',
    color: '#475569',
  },
  subtitle: {
    marginTop: mode === 'print' ? '1mm' : '8px',
    fontSize: mode === 'print' ? '3.3mm' : '14px',
    fontWeight: 700,
    letterSpacing: mode === 'print' ? '0.2mm' : '0.18em',
    textTransform: 'uppercase',
    color: '#334155',
  },
  divider: {
    borderBottom: mode === 'print' ? '0.35mm dashed #000' : '1px dashed #94a3b8',
    margin: mode === 'print' ? '2mm 0' : '12px 0',
  },
  infoSection: {
    display: 'grid',
    gap: mode === 'print' ? '0.6mm' : '4px',
  },
  infoParagraph: {
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: mode === 'print' ? '1.2mm' : '8px',
    fontSize: mode === 'print' ? 'inherit' : '12px',
  },
  tableHeaderRow: {
    borderBottom: mode === 'print' ? '0.35mm dashed #000' : '1px dashed #cbd5e1',
  },
  tableHeader: {
    paddingBottom: mode === 'print' ? '1mm' : '8px',
    fontSize: mode === 'print' ? '2.8mm' : '12px',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  tableCell: {
    padding: mode === 'print' ? '1.2mm 0' : '8px 0',
    verticalAlign: 'top',
  },
  itemName: {
    fontWeight: 700,
    wordBreak: 'break-word',
  },
  itemPrice: {
    marginTop: mode === 'print' ? '0.4mm' : '2px',
    fontSize: mode === 'print' ? '2.4mm' : '11px',
    color: '#64748b',
    fontWeight: 400,
  },
  totalsWrap: {
    marginLeft: 'auto',
    width: '100%',
    maxWidth: mode === 'print' ? '100%' : '200px',
    fontSize: mode === 'print' ? 'inherit' : '12px',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: mode === 'print' ? '0.9mm 0' : '4px 0',
  },
  netTotalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: mode === 'print' ? '0.35mm dashed #000' : '1px dashed #94a3b8',
    borderBottom: mode === 'print' ? '0.35mm dashed #000' : '1px dashed #94a3b8',
    padding: mode === 'print' ? '1.4mm 0' : '8px 0',
    fontSize: mode === 'print' ? '3.5mm' : '14px',
    fontWeight: 700,
  },
  thanks: {
    marginTop: mode === 'print' ? '3mm' : '16px',
    textAlign: 'center',
    fontSize: mode === 'print' ? '2.9mm' : '12px',
    fontWeight: 700,
  },
  credits: {
    marginTop: mode === 'print' ? '3mm' : '16px',
    paddingTop: mode === 'print' ? '2.2mm' : '12px',
    paddingBottom: mode === 'print' ? '1mm' : '4px',
    borderTop: mode === 'print' ? '0.25mm solid #000' : '1px solid #cbd5e1',
    textAlign: 'center',
  },
  creditsTitle: {
    fontSize: mode === 'print' ? '2.9mm' : '12px',
    fontWeight: 700,
  },
  creditsSub: {
    marginTop: mode === 'print' ? '0.8mm' : '4px',
    fontSize: mode === 'print' ? '2.4mm' : '11px',
    color: '#475569',
  },
  continued: {
    marginTop: mode === 'print' ? '3mm' : '12px',
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: mode === 'print' ? '2.7mm' : '12px',
  },
});

const ReceiptTemplate = ({
  templateType = PRINT_TEMPLATE_TYPES.THERMAL,
  settings,
  branchData = {},
  storeName,
  orderData = {},
  items = [],
  customerData = null,
  pageNumber = 1,
  totalPages = 1,
  showTotals = true,
  showCredits = true,
  showContinued = false,
  mode = 'preview',
  language = LANGUAGES.EN,
}) => {
  const normalized = normalizeReceiptSettings(settings);
  const isKot = templateType === PRINT_TEMPLATE_TYPES.KOT;
  const isPreBill = orderData?.documentType === 'PRE_BILL';
  const styles = getStyles(normalized, mode, templateType, language);
  const t = (s) => translateText(language, s);
  const createdAt = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();
  const customerName = customerData?.name || orderData?.customerName;
  const invoiceValue = orderData?.invoiceNo || orderData?.orderId || '-';
  const subTotal = Number(orderData?.subTotal ?? 0);
  const billDiscount = Number(orderData?.billDiscount ?? 0);
  const grandTotal = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
  const paidAmount = Number(orderData?.paidAmount ?? 0);
  const dueAmount = Math.max(0, Number(orderData?.dueAmount ?? 0));
  const paymentMethod = (orderData?.paymentMethod || 'CASH').replace('_', ' ');
  const orderType = dueAmount > 0 && paidAmount > 0
    ? `${paymentMethod} + CREDIT`
    : (dueAmount > 0 ? 'CREDIT' : paymentMethod);

  return (
    <div style={{ ...styles.page, pageBreakAfter: mode === 'print' && showContinued ? 'always' : 'auto' }}>
      <div style={styles.receipt}>
        <div style={styles.header}>
          {normalized.showLogo && branchData.logo ? (
            <div style={styles.logoWrap}>
              <img src={branchData.logo} alt="Branch Logo" style={styles.logo} />
            </div>
          ) : null}

          {normalized.showStoreName ? <h1 style={styles.title}>{storeName || 'Store Name'}</h1> : null}
          {normalized.showBranchName ? (
            <p style={{ ...styles.headerParagraph, ...styles.branchName }}>
              {t(`Branch: ${branchData.name || 'Main Branch'}`)}
            </p>
          ) : null}

          <div style={styles.contactInfo}>
            {normalized.showAddress && branchData.address ? (
              <p style={styles.contactParagraph}>
                {normalized.showAddressLabel ? `${t('Address:')} ` : ''}
                {branchData.address}
              </p>
            ) : null}
            {normalized.showPhone && branchData.phone ? (
              <p style={styles.contactParagraph}>
                {normalized.showPhoneLabel ? `${t('Phone:')} ` : ''}
                {branchData.phone}
              </p>
            ) : null}
          </div>

          {isKot ? <div style={styles.subtitle}>{orderData?.subTitle || t('Kitchen Order Ticket')}</div> : null}
          {!isKot && isPreBill ? <div style={styles.subtitle}>{orderData?.subTitle || t('Unpaid Bill')}</div> : null}
        </div>

        <div style={styles.divider} />

        <div style={styles.infoSection}>
          {normalized.showInvoiceNumber ? (
            <p style={styles.infoParagraph}>
              {t(isKot || isPreBill ? 'Order ID' : 'Invoice')}: <b>{invoiceValue}</b>{' '}
              {!isKot && totalPages > 1 ? `(${t(`Page ${pageNumber} of ${totalPages}`)})` : ''}
            </p>
          ) : null}
          {isPreBill ? <p style={styles.infoParagraph}>{t('Status:')} <b>{t('UNPAID - NOT A RECEIPT')}</b></p> : null}
          {normalized.showDateTime ? <p style={styles.infoParagraph}>{t(`Date: ${createdAt.toLocaleString()}`)}</p> : null}
          {normalized.showCashier ? (
            <p style={styles.infoParagraph}>
              {t(`${isKot ? 'Prepared By' : 'Cashier'}: ${branchData.cashierName || orderData?.cashierName || 'Cashier'}`)}
            </p>
          ) : null}
          {normalized.showCustomer && customerName ? (
            <p style={styles.infoParagraph}>
              {t(orderData?.customerLabel || 'Customer')}: <b>{customerName}</b>
            </p>
          ) : null}
          {isKot && orderData?.saleMode ? (
            <p style={styles.infoParagraph}>
              {t(`Mode: ${orderData.saleMode}`)}
            </p>
          ) : null}
          {isKot && orderData?.tableName ? (
            <p style={styles.infoParagraph}>
              {t(`Table: ${orderData.tableName}`)}
            </p>
          ) : null}
        </div>

        {normalized.showItemTable ? (
          <>
            <div style={styles.divider} />
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', width: isKot ? '72%' : '50%' }}>{t('ITEM')}</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'center', width: isKot ? '28%' : '15%' }}>{t('QTY')}</th>
                  {!isKot ? (
                    <th style={{ ...styles.tableHeader, textAlign: 'right', width: '35%' }}>{t('AMOUNT')}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const primaryName = item.name || item.itemName || 'Item';
                  const resolvedItemName = normalized.itemNameSource === 'ALT' && item.altName && item.altName.trim()
                    ? item.altName
                    : primaryName;
                  const discountType = item?.discountType || item?.effectiveDiscountType;
                  const discountValue = Number((item?.discountValue ?? item?.effectiveDiscountValue) || 0);
                  const promotionDiscountAmount = Number(item?.promotionDiscountAmount || 0);
                  const explicitDiscountAmount = discountType === 'FIXED'
                    ? discountValue
                    : discountType === 'PERCENT'
                      ? (() => {
                        const qty = Number(item?.qty || 0);
                        const unitPrice = Number(item?.unitPrice || 0);
                        const perSmallUnitPrice = Number(item?.perSmallUnitPrice ?? item?.perGramPrice);
                        const qtyUnit = String(item?.qtyUnit || '').toUpperCase();
                        const baseAmount = (qtyUnit === 'G' || qtyUnit === 'ML') && Number.isFinite(perSmallUnitPrice)
                          ? qty * perSmallUnitPrice
                          : qty * unitPrice;
                        return (baseAmount * discountValue) / 100;
                      })()
                      : 0;
                  const discountAmount = calculateItemDiscountAmount(item);
                  const hasDiscount = discountAmount > 0;
                  const labelParts = [];
                  if (explicitDiscountAmount > 0) {
                    labelParts.push(
                      discountType === 'FIXED'
                        ? `${t('Discount')}: -${formatCurrency(explicitDiscountAmount)}`
                        : `${discountValue}% ${t('Off')}: -${formatCurrency(explicitDiscountAmount)}`
                    );
                  }
                  if (promotionDiscountAmount > 0) {
                    labelParts.push(item?.promotionName
                      ? `${item.promotionName}: -${formatCurrency(promotionDiscountAmount)}`
                      : `${t('Discount')}: -${formatCurrency(promotionDiscountAmount)}`);
                  }
                  const discountLabel = labelParts.join(' + ');
                  return (
                    <React.Fragment key={`${primaryName}-${index}`}>
                      <tr>
                        <td style={{ ...styles.tableCell, paddingRight: isKot ? 0 : mode === 'print' ? '1mm' : '8px' }}>
                          <div style={styles.itemName}>{resolvedItemName}</div>
                          {!isKot ? <div style={styles.itemPrice}>@ {formatCurrency(Number(item.unitPrice || 0))}</div> : null}
                          {!isKot && normalized.showWarranty && item.warrantyLabel ? (
                            <div style={styles.itemPrice}>
                              {t('Warranty:')} {item.warrantyLabel}
                              {item.warrantyPeriodValue && item.warrantyPeriodUnit
                                ? ` (${item.warrantyPeriodValue} ${item.warrantyPeriodUnit})`
                                : ''}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                          {formatReceiptTemplateQty(item.qty, item.qtyUnit || item.defaultUnit)}
                        </td>
                        {!isKot ? (
                          <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                            {formatCurrency(calculateItemTotal(item))}
                          </td>
                        ) : null}
                      </tr>
                      {!isKot && normalized.showLineDiscount && hasDiscount ? (
                        <tr>
                          <td style={{ ...styles.tableCell, paddingRight: isKot ? 0 : mode === 'print' ? '1mm' : '8px', color: '#94a3b8', fontSize: mode === 'print' ? '2.4mm' : '11px' }}>
                            <div style={{ paddingLeft: mode === 'print' ? '2mm' : '12px', fontStyle: 'italic' }}>
                              {discountLabel}
                            </div>
                          </td>
                          <td />
                          <td />
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : null}

        {!isKot && showTotals ? <div style={styles.divider} /> : null}

        {!isKot && showTotals ? (
          <div style={styles.totalsWrap}>
            {normalized.showSubtotal ? (
              <div style={styles.totalRow}>
                <span>{t('Sub Total')}</span>
                <span>{formatCurrency(subTotal)}</span>
              </div>
            ) : null}
            {normalized.showDiscount ? (
              <div style={styles.totalRow}>
                <span>{t('Discount')}</span>
                <span>-{formatCurrency(calculateTotalDiscount(items, billDiscount, orderData?.promotionDiscountTotal ?? orderData?.billPromotionDiscountAmount ?? 0))}</span>
              </div>
            ) : null}
            {normalized.showNetTotal ? (
              <div style={styles.netTotalRow}>
                <span>{t('Net Total')}</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            ) : null}
            {normalized.showPaid && !isPreBill ? (
              <div style={styles.totalRow}>
                <span>{t(`Paid (${orderType})`)}</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            ) : null}
            {normalized.showBalance && orderType === 'CASH' ? (
              <div style={{ ...styles.totalRow, fontWeight: 700 }}>
                <span>{t('Balance')}</span>
                <span>{formatCurrency(paidAmount - grandTotal)}</span>
              </div>
            ) : null}
            {(normalized.showDueAmount || isPreBill) && dueAmount > 0 ? (
              <div style={{ ...styles.totalRow, fontWeight: 700 }}>
                <span>{t(isPreBill ? 'Amount Due' : 'Credit Due')}</span>
                <span>{formatCurrency(dueAmount)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {normalized.showThanksMessage && (showTotals || isKot) ? (
          <div style={styles.thanks}>{normalized.thanksMessage}</div>
        ) : null}

        {showCredits ? (
          <div style={styles.credits}>
            <div style={styles.creditsTitle}>{normalized.creditsLine1}</div>
            <div style={styles.creditsSub}>{normalized.creditsLine2}</div>
          </div>
        ) : null}

        {showContinued ? <div style={styles.continued}>{t('Continued on next page...')}</div> : null}
      </div>
    </div>
  );
};

export default ReceiptTemplate;
