import React from 'react';
import { formatCurrency, formatDateTime, formatQuantityWithUnit } from '../../utils/formatters';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';

const mmToPx = (mm) => `${Math.round(mm * 3.78)}px`;

const templateUnit = (mode, mm, pxFallback) => (mode === 'print' ? `${mm}mm` : pxFallback || mmToPx(mm));

const getLogoWidth = (settings, mode) => {
  if (mode === 'print') {
    return `${Math.max(30, ((210 - 24) * settings.logoWidthPercent) / 100)}mm`;
  }

  return `${Math.round((Number(settings.logoWidthPercent) / 100) * 240)}px`;
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

  let total = qtyUnit === 'G' && Number.isFinite(perGramPrice)
    ? qty * perGramPrice
    : qty * unitPrice;

  if (item?.discountType === 'FIXED') {
    total -= Number(item?.discountValue || 0);
  }

  if (item?.discountType === 'PERCENT') {
    total -= (total * Number(item?.discountValue || 0)) / 100;
  }

  return Math.max(0, total);
};

const getStyles = (settings, mode) => ({
  page: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: mode === 'print' ? '#fff' : '#f8fafc',
  },
  sheet: {
    width: mode === 'print' ? '210mm' : '794px',
    minHeight: mode === 'print' ? '297mm' : '1123px',
    boxSizing: 'border-box',
    padding: mode === 'print' ? '8mm' : '30px',
    backgroundColor: '#fff',
    color: '#0f172a',
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    fontSize: templateUnit(mode, 2.8, '11px'),
    lineHeight: 1.3,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: mode === 'print' ? '6mm' : '22px',
  },
  businessBlock: {
    flex: 1,
    minWidth: 0,
  },
  logo: {
    width: getLogoWidth(settings, mode),
    maxWidth: '100%',
    maxHeight: mode === 'print' ? '18mm' : '76px',
    objectFit: 'contain',
    display: 'block',
    marginBottom: mode === 'print' ? '2mm' : '8px',
  },
  companyName: {
    margin: 0,
    fontSize: templateUnit(mode, 5.8, '22px'),
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  branchName: {
    margin: mode === 'print' ? '0.8mm 0 0' : '4px 0 0',
    fontSize: templateUnit(mode, 3.2, '12px'),
    fontWeight: 700,
    color: '#334155',
  },
  businessMeta: {
    marginTop: mode === 'print' ? '1.4mm' : '8px',
    display: 'grid',
    gap: mode === 'print' ? '0.5mm' : '3px',
    color: '#475569',
  },
  invoicePanel: {
    width: mode === 'print' ? '64mm' : '236px',
    border: '1px solid #cbd5e1',
    borderRadius: mode === 'print' ? '2mm' : '10px',
    padding: mode === 'print' ? '3mm' : '14px',
    backgroundColor: '#f8fafc',
    boxSizing: 'border-box',
  },
  invoiceTitle: {
    margin: 0,
    fontSize: templateUnit(mode, 4.8, '18px'),
    fontWeight: 800,
    letterSpacing: 0,
  },
  invoiceSubTitle: {
    margin: mode === 'print' ? '0.8mm 0 0' : '3px 0 0',
    fontSize: templateUnit(mode, 2.3, '9px'),
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: mode === 'print' ? '0.15mm' : '0.08em',
  },
  panelGrid: {
    marginTop: mode === 'print' ? '2mm' : '8px',
    display: 'grid',
    gap: mode === 'print' ? '1mm' : '5px',
  },
  label: {
    display: 'block',
    fontSize: templateUnit(mode, 2.2, '9px'),
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: mode === 'print' ? '0.12mm' : '0.06em',
    marginBottom: mode === 'print' ? '0.25mm' : '1px',
  },
  value: {
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: mode === 'print' ? '3mm' : '12px',
    marginTop: mode === 'print' ? '4mm' : '16px',
  },
  infoCard: {
    border: '1px solid #e2e8f0',
    borderRadius: mode === 'print' ? '2mm' : '10px',
    padding: mode === 'print' ? '3mm' : '12px',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  infoRows: {
    display: 'grid',
    gap: mode === 'print' ? '0.9mm' : '6px',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: mode === 'print' ? '1.8mm 3mm' : '8px 12px',
  },
  tableWrap: {
    marginTop: mode === 'print' ? '4mm' : '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    borderTop: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    padding: mode === 'print' ? '1.8mm 1.6mm' : '8px 7px',
    fontSize: templateUnit(mode, 2.2, '9px'),
    textTransform: 'uppercase',
    letterSpacing: mode === 'print' ? '0.1mm' : '0.05em',
    color: '#475569',
    textAlign: 'left',
  },
  td: {
    borderBottom: '1px solid #e2e8f0',
    padding: mode === 'print' ? '1.8mm 1.6mm' : '8px 7px',
    verticalAlign: 'top',
  },
  itemName: {
    fontWeight: 700,
    wordBreak: 'break-word',
  },
  itemMeta: {
    marginTop: mode === 'print' ? '0.4mm' : '3px',
    fontSize: templateUnit(mode, 2.1, '9px'),
    color: '#64748b',
  },
  summaryWrap: {
    marginTop: mode === 'print' ? '4mm' : '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: mode === 'print' ? '4mm' : '16px',
  },
  notesCard: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: mode === 'print' ? '2mm' : '10px',
    padding: mode === 'print' ? '3mm' : '12px',
    minHeight: mode === 'print' ? '18mm' : '72px',
    boxSizing: 'border-box',
  },
  summaryCard: {
    width: mode === 'print' ? '74mm' : '260px',
    marginLeft: 'auto',
    border: '1px solid #cbd5e1',
    borderRadius: mode === 'print' ? '2mm' : '10px',
    padding: mode === 'print' ? '3mm' : '12px',
    backgroundColor: '#f8fafc',
    boxSizing: 'border-box',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: mode === 'print' ? '0.9mm 0' : '5px 0',
  },
  totalDivider: {
    borderTop: '1px solid #cbd5e1',
    margin: mode === 'print' ? '1.1mm 0' : '6px 0',
  },
  totalGrand: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: mode === 'print' ? '1.3mm 0' : '8px 0',
    fontSize: templateUnit(mode, 3.6, '14px'),
    fontWeight: 800,
  },
  footer: {
    marginTop: mode === 'print' ? '5mm' : '18px',
    paddingTop: mode === 'print' ? '2.5mm' : '10px',
    borderTop: '1px solid #cbd5e1',
    display: 'flex',
    justifyContent: 'space-between',
    gap: mode === 'print' ? '4mm' : '16px',
    alignItems: 'flex-end',
  },
  thanks: {
    margin: 0,
    fontSize: templateUnit(mode, 2.7, '11px'),
    fontWeight: 700,
  },
  credits: {
    textAlign: 'right',
    color: '#475569',
  },
  creditsLine1: {
    fontSize: templateUnit(mode, 2.4, '10px'),
    fontWeight: 700,
  },
  creditsLine2: {
    marginTop: mode === 'print' ? '0.4mm' : '2px',
    fontSize: templateUnit(mode, 2.1, '9px'),
  },
});

const InvoiceTemplate = ({
  settings,
  branchData = {},
  storeName,
  orderData = {},
  items = [],
  customerData = null,
  mode = 'preview',
}) => {
  const normalized = normalizeReceiptSettings({
    ...settings,
    templateType: PRINT_TEMPLATE_TYPES.A4,
    paperWidthMm: 210,
  });
  const styles = getStyles(normalized, mode);
  const createdAt = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();
  const customerName = customerData?.name || orderData?.customerName || 'Walk-in Customer';
  const customerPhone = customerData?.phone || orderData?.customerPhone || '';
  const invoiceValue = orderData?.invoiceNo || orderData?.orderId || '-';
  const subTotal = Number(orderData?.subTotal ?? 0);
  const billDiscount = Number(orderData?.billDiscount ?? 0);
  const grandTotal = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
  const paidAmount = Number(orderData?.paidAmount ?? 0);
  const orderType = orderData?.orderType || 'CASH';
  const balance = Math.max(0, paidAmount - grandTotal);
  const noteText = orderData?.note || '';
  const hasNotes = noteText.trim().length > 0;

  return (
    <div style={styles.page}>
      <div style={styles.sheet}>
        <div style={styles.topRow}>
          <div style={styles.businessBlock}>
            {normalized.showLogo && branchData.logo ? (
              <img src={branchData.logo} alt="Branch Logo" style={styles.logo} />
            ) : null}
            {normalized.showStoreName ? <h1 style={styles.companyName}>{storeName || 'Store Name'}</h1> : null}
            {normalized.showBranchName ? <p style={styles.branchName}>{branchData.name || 'Main Branch'}</p> : null}
            <div style={styles.businessMeta}>
              {normalized.showAddress && branchData.address ? <div>{branchData.address}</div> : null}
              {normalized.showPhone && branchData.phone ? <div>{branchData.phone}</div> : null}
            </div>
          </div>

          <div style={styles.invoicePanel}>
            <h2 style={styles.invoiceTitle}>Sales Invoice</h2>
            <p style={styles.invoiceSubTitle}>Compact A4 customer invoice</p>
            <div style={styles.panelGrid}>
              {normalized.showInvoiceNumber ? (
                <div>
                  <span style={styles.label}>Invoice No</span>
                  <div style={styles.value}>{invoiceValue}</div>
                </div>
              ) : null}
              {normalized.showDateTime ? (
                <div>
                  <span style={styles.label}>Issued At</span>
                  <div style={styles.value}>{formatDateTime(createdAt)}</div>
                </div>
              ) : null}
              <div>
                <span style={styles.label}>Payment</span>
                <div style={styles.value}>{orderType}</div>
              </div>
              {orderData?.saleMode ? (
                <div>
                  <span style={styles.label}>Sale Mode</span>
                  <div style={styles.value}>{orderData.saleMode}</div>
                </div>
              ) : null}
              {orderData?.tableName ? (
                <div>
                  <span style={styles.label}>Table</span>
                  <div style={styles.value}>{orderData.tableName}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <span style={styles.label}>Bill To</span>
            <div style={styles.infoRows}>
              {normalized.showCustomer ? <div style={styles.value}>{customerName}</div> : null}
              {normalized.showCustomer && customerPhone ? <div style={{ color: '#475569' }}>{customerPhone}</div> : null}
              {!normalized.showCustomer ? <div style={{ color: '#475569' }}>Customer information hidden in settings.</div> : null}
            </div>
          </div>

          <div style={styles.infoCard}>
            <span style={styles.label}>Sale Details</span>
            <div style={styles.metaGrid}>
              {normalized.showCashier ? (
                <div>
                  <span style={styles.label}>Cashier</span>
                  <div style={styles.value}>{branchData.cashierName || orderData?.cashierName || 'Cashier'}</div>
                </div>
              ) : null}
              <div>
                <span style={styles.label}>Status</span>
                <div style={styles.value}>{orderType === 'CREDIT' ? 'Credit Sale' : 'Paid'}</div>
              </div>
            </div>
          </div>
        </div>

        {normalized.showItemTable ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '7%' }}>#</th>
                  <th style={{ ...styles.th, width: '45%' }}>Description</th>
                  <th style={{ ...styles.th, width: '16%', textAlign: 'center' }}>Qty</th>
                  <th style={{ ...styles.th, width: '16%', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...styles.th, width: '16%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.name || item.itemName || 'item'}-${index}`}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.itemName}>{item.name || item.itemName}</div>
                      {item.barcode ? <div style={styles.itemMeta}>Barcode: {item.barcode}</div> : null}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {formatQuantityWithUnit(item.qty, item.qtyUnit || item.defaultUnit)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{formatCurrency(Number(item.unitPrice || 0))}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(calculateItemTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div style={styles.summaryWrap}>
          {hasNotes ? (
            <div style={styles.notesCard}>
              <span style={styles.label}>Notes</span>
              <div style={{ color: '#475569' }}>
                {noteText}
              </div>
            </div>
          ) : null}

          <div style={{ ...styles.summaryCard, ...(hasNotes ? null : { width: mode === 'print' ? '82mm' : '280px' }) }}>
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
            <div style={styles.totalDivider} />
            {normalized.showNetTotal ? (
              <div style={styles.totalGrand}>
                <span>Net Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            ) : null}
            {normalized.showPaid ? (
              <div style={styles.totalRow}>
                <span>Paid</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            ) : null}
            {normalized.showBalance && orderType === 'CASH' ? (
              <div style={{ ...styles.totalRow, fontWeight: 700 }}>
                <span>Balance</span>
                <span>{formatCurrency(balance)}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div style={styles.footer}>
          <div>
            {normalized.showThanksMessage ? <p style={styles.thanks}>{normalized.thanksMessage}</p> : null}
          </div>
          {normalized.showCredits ? (
            <div style={styles.credits}>
              <div style={styles.creditsLine1}>{normalized.creditsLine1}</div>
              <div style={styles.creditsLine2}>{normalized.creditsLine2}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
