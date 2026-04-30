import React from 'react';
import { formatCurrency, formatQuantityWithUnit } from '../../utils/formatters';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';

export const formatReceiptTemplateQty = (qty, qtyUnit) =>
  formatQuantityWithUnit(qty, qtyUnit).replace(/\bSERVICE\b/g, 'S');

const mmToPx = (mm) => `${Math.round(mm * 3.78)}px`;

const templateUnit = (mode, mm, pxFallback) => (mode === 'print' ? `${mm}mm` : pxFallback || mmToPx(mm));

const getLogoWidth = (settings, mode) => {
  if (mode === 'print') {
    return `${Math.max(20, ((settings.paperWidthMm - 6) * settings.logoWidthPercent) / 100)}mm`;
  }

  return `${Math.round((Number(settings.logoWidthPercent) / 100) * 220)}px`;
};

const calculateItemTotal = (item) => {
  const lineTotal = Number(item?.lineTotal);
  if (Number.isFinite(lineTotal) && lineTotal >= 0) {
    return lineTotal;
  }

  const qty = Number(item?.qty || 0);
  const unitPrice = Number(item?.unitPrice || 0);
  const perGramPrice = Number(item?.perGramPrice);
  const qtyUnit = String(item?.qtyUnit || '').toUpperCase();

  let itemTotal = qtyUnit === 'G' && Number.isFinite(perGramPrice)
    ? qty * perGramPrice
    : qty * unitPrice;

  if (item?.discountType === 'FIXED') {
    itemTotal -= Number(item?.discountValue || 0);
  }

  if (item?.discountType === 'PERCENT') {
    itemTotal -= (itemTotal * Number(item?.discountValue || 0)) / 100;
  }

  return Math.max(0, itemTotal);
};

const getStyles = (settings, mode) => ({
  page: {
    width: '100%',
    boxSizing: 'border-box',
    pageBreakAfter: 'always',
  },
  receipt: {
    fontFamily: "'Courier New', Courier, monospace",
    width: '100%',
    boxSizing: 'border-box',
    fontSize: templateUnit(mode, 3, '12px'),
    lineHeight: 1.35,
    color: '#000',
    backgroundColor: '#fff',
    padding: mode === 'print' ? '1mm 3mm 3mm' : '8px 16px 16px',
  },
  header: {
    textAlign: 'center',
  },
  logoWrap: {
    marginBottom: mode === 'print' ? '-5mm' : '-18px',
    display: 'flex',
    justifyContent: 'center',
    lineHeight: 0,
  },
  logo: {
    width: getLogoWidth(settings, mode),
    maxWidth: '100%',
    maxHeight: mode === 'print' ? '28mm' : '132px',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  },
  title: {
    fontSize: templateUnit(mode, 5.6, '18px'),
    margin: mode === 'print' ? '0 0 1mm 0' : '0 0 4px 0',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  headerParagraph: {
    margin: mode === 'print' ? '0.8mm 0' : '4px 0',
    fontSize: templateUnit(mode, 3, '12px'),
  },
  branchName: {
    fontWeight: 700,
  },
  contactInfo: {
    margin: mode === 'print' ? '1mm 0 0' : '4px 0 0',
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
}) => {
  const normalized = normalizeReceiptSettings(settings);
  const styles = getStyles(normalized, mode);
  const isKot = templateType === PRINT_TEMPLATE_TYPES.KOT;
  const createdAt = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();
  const customerName = customerData?.name || orderData?.customerName;
  const invoiceValue = orderData?.invoiceNo || orderData?.orderId || '-';
  const subTotal = Number(orderData?.subTotal ?? 0);
  const billDiscount = Number(orderData?.billDiscount ?? 0);
  const grandTotal = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
  const paidAmount = Number(orderData?.paidAmount ?? 0);
  const orderType = orderData?.orderType || 'CASH';

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
              Branch: {branchData.name || 'Main Branch'}
            </p>
          ) : null}

          <div style={styles.contactInfo}>
            {normalized.showAddress && branchData.address ? (
              <p style={styles.contactParagraph}>Address: {branchData.address}</p>
            ) : null}
            {normalized.showPhone && branchData.phone ? (
              <p style={styles.contactParagraph}>Phone: {branchData.phone}</p>
            ) : null}
          </div>

          {isKot ? <div style={styles.subtitle}>{orderData?.subTitle || 'Kitchen Order Ticket'}</div> : null}
        </div>

        <div style={styles.divider} />

        <div style={styles.infoSection}>
          {normalized.showInvoiceNumber ? (
            <p style={styles.infoParagraph}>
              {isKot ? 'Order ID' : 'Invoice'}: <b>{invoiceValue}</b>{' '}
              {!isKot && totalPages > 1 ? `(Page ${pageNumber} of ${totalPages})` : ''}
            </p>
          ) : null}
          {normalized.showDateTime ? <p style={styles.infoParagraph}>Date: {createdAt.toLocaleString()}</p> : null}
          {normalized.showCashier ? (
            <p style={styles.infoParagraph}>
              {isKot ? 'Prepared By' : 'Cashier'}: {branchData.cashierName || orderData?.cashierName || 'Cashier'}
            </p>
          ) : null}
          {normalized.showCustomer && customerName ? (
            <p style={styles.infoParagraph}>
              {orderData?.customerLabel || 'Customer'}: <b>{customerName}</b>
            </p>
          ) : null}
          {isKot && orderData?.saleMode ? (
            <p style={styles.infoParagraph}>
              Mode: <b>{orderData.saleMode}</b>
            </p>
          ) : null}
          {isKot && orderData?.tableName ? (
            <p style={styles.infoParagraph}>
              Table: <b>{orderData.tableName}</b>
            </p>
          ) : null}
        </div>

        {normalized.showItemTable ? (
          <>
            <div style={styles.divider} />
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', width: isKot ? '72%' : '50%' }}>ITEM</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'center', width: isKot ? '28%' : '15%' }}>QTY</th>
                  {!isKot ? (
                    <th style={{ ...styles.tableHeader, textAlign: 'right', width: '35%' }}>AMOUNT</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.name || item.itemName || 'item'}-${index}`}>
                    <td style={{ ...styles.tableCell, paddingRight: isKot ? 0 : mode === 'print' ? '1mm' : '8px' }}>
                      <div style={styles.itemName}>{item.name || item.itemName}</div>
                      {!isKot ? <div style={styles.itemPrice}>@ {formatCurrency(Number(item.unitPrice || 0))}</div> : null}
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
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        {!isKot && showTotals ? <div style={styles.divider} /> : null}

        {!isKot && showTotals ? (
          <div style={styles.totalsWrap}>
            {normalized.showSubtotal ? (
              <div style={styles.totalRow}>
                <span>Sub Total</span>
                <span>{formatCurrency(subTotal)}</span>
              </div>
            ) : null}
            {normalized.showDiscount ? (
              <div style={styles.totalRow}>
                <span>Discount</span>
                <span>-{formatCurrency(billDiscount)}</span>
              </div>
            ) : null}
            {normalized.showNetTotal ? (
              <div style={styles.netTotalRow}>
                <span>Net Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            ) : null}
            {normalized.showPaid ? (
              <div style={styles.totalRow}>
                <span>Paid ({orderType})</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            ) : null}
            {normalized.showBalance && orderType === 'CASH' ? (
              <div style={{ ...styles.totalRow, fontWeight: 700 }}>
                <span>Balance</span>
                <span>{formatCurrency(paidAmount - grandTotal)}</span>
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

        {showContinued ? <div style={styles.continued}>Continued on next page...</div> : null}
      </div>
    </div>
  );
};

export default ReceiptTemplate;
