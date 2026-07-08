import React from 'react';
import { formatCurrency, formatDateTime, formatQuantityWithUnit } from '../../utils/formatters';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';
import { translateText, LANGUAGES } from '../../utils/translations';

const getInvoiceLogoPercent = (settings) =>
  Math.max(35, Math.min(200, Number(settings.invoiceLogoWidthPercent ?? settings.logoWidthPercent) || 78));

const getLogoWidth = (settings, mode) => {
  const percent = getInvoiceLogoPercent(settings);
  return mode === 'print'
    ? `${Math.max(34, (68 * percent) / 100)}mm`
    : `${Math.round(Math.max(120, (percent / 100) * 257))}px`;
};

const getLogoMaxHeight = (settings, mode) => {
  const percent = getInvoiceLogoPercent(settings);
  return mode === 'print'
    ? `${Math.max(18, 12 + (percent - 35) * 0.18)}mm`
    : `${Math.round(Math.max(56, 44 + (percent - 35) * 0.65))}px`;
};

const getValue = (value, fallback = '-') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
};

const calculateItemTotal = (item) => {
  const lineTotal = Number(item?.lineTotal);
  if (Number.isFinite(lineTotal) && lineTotal >= 0) {
    return lineTotal;
  }

  const qty = Number(item?.qty || 0);
  const unitPrice = Number(item?.unitPrice || 0);
  const perSmallUnitPrice = Number(item?.perSmallUnitPrice ?? item?.perGramPrice);
  const qtyUnit = String(item?.qtyUnit || '').toUpperCase();

  let total = (qtyUnit === 'G' || qtyUnit === 'ML') && Number.isFinite(perSmallUnitPrice)
    ? qty * perSmallUnitPrice
    : qty * unitPrice;

  const discountType = item?.discountType || item?.effectiveDiscountType;
  const discountValue = Number((item?.discountValue ?? item?.effectiveDiscountValue) || 0);

  if (discountType === 'FIXED') {
    total -= discountValue;
  } else if (discountType === 'PERCENT') {
    total -= (total * discountValue) / 100;
  }

  const promotionDiscountAmount = Number(item?.promotionDiscountAmount || 0);
  if (promotionDiscountAmount > 0) {
    total -= promotionDiscountAmount;
  }

  return Math.max(0, total);
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

const InvoiceTemplate = ({
  settings,
  branchData = {},
  storeName,
  orderData = {},
  items = [],
  customerData = null,
  mode = 'preview',
  language = LANGUAGES.EN,
}) => {
  const t = (s) => translateText(language, s);
  const normalized = normalizeReceiptSettings({
    ...settings,
    templateType: PRINT_TEMPLATE_TYPES.A4,
    paperWidthMm: 210,
  });

  const createdAt = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();
  const invoiceDate = formatDateTime(createdAt);
  const invoiceValue = getValue(orderData?.invoiceNo || orderData?.orderId);
  const customerName = getValue(customerData?.name || orderData?.customerName, 'Walk-in Customer');
  const customerPhone = getValue(customerData?.phone || orderData?.customerPhone, '');
  const customerAddress = getValue(customerData?.address || orderData?.customerAddress, '');
  const subTotal = Number(orderData?.subTotal ?? 0);
  const billDiscount = Number(orderData?.billDiscount ?? 0);
  const grandTotal = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
  const paidAmount = Number(orderData?.paidAmount ?? 0);
  const dueAmount = Math.max(0, Number(orderData?.dueAmount ?? 0));
  const balanceAmount = Math.max(0, paidAmount - grandTotal);
  const paymentMethod = getValue(orderData?.paymentMethod || orderData?.orderType || 'CASH').replaceAll('_', ' ');
  const noteText = String(orderData?.note || '').trim();
  const companyName = getValue(storeName, 'ZenSys POS');
  const branchName = getValue(branchData?.name, 'Main Branch');
  const branchAddress = getValue(branchData?.address, '');
  const branchPhone = getValue(branchData?.phone, '');
  const cashierName = getValue(branchData?.cashierName || orderData?.cashierName, 'Cashier');
  const logo = branchData?.logo || '';
  const itemRows = Array.isArray(items) ? items : [];
  const isPrint = mode === 'print';

  const styles = {
    page: {
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0,
      width: isPrint ? '210mm' : '100%',
      minHeight: isPrint ? '297mm' : 'auto',
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: isPrint ? '#ffffff' : '#f0f0f0',
      color: '#111827',
      boxSizing: 'border-box',
    },
    sheet: {
      background: '#ffffff',
      width: isPrint ? '210mm' : '100%',
      maxWidth: '210mm',
      minHeight: isPrint ? '297mm' : 'auto',
      padding: isPrint ? '12mm' : '15mm',
      border: isPrint ? 'none' : '2px solid darkviolet',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: isPrint ? '4mm' : '10mm',
      gap: '12px',
    },
    headerRight: {
      textAlign: 'right',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '2px',
      maxWidth: '86mm',
    },
    logo: {
      width: getLogoWidth(normalized, mode),
      maxWidth: '100%',
      maxHeight: getLogoMaxHeight(normalized, mode),
      objectFit: 'contain',
      display: 'block',
      marginBottom: 0,
    },
    invoiceTitle: {
      color: '#032b4a',
      margin: 0,
      fontSize: isPrint ? '36px' : '34px',
      textTransform: 'uppercase',
      fontWeight: 700,
      lineHeight: 1,
    },
    companyText: {
      fontWeight: 700,
      textTransform: 'uppercase',
      color: '#032b4a',
      fontSize: '14px',
    },
    branchText: {
      color: '#475569',
      fontSize: '12px',
      lineHeight: 1.4,
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      marginBottom: isPrint ? '4mm' : '10mm',
      gap: '10px',
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'flex-start',
      marginBottom: '3px',
      fontSize: '12px',
      lineHeight: 1.5,
    },
    detailLabel: {
      width: '28mm',
      fontWeight: 700,
      flexShrink: 0,
    },
    toLabel: {
      width: '22mm',
      fontWeight: 700,
      flexShrink: 0,
    },
    invoiceTo: {
      textAlign: 'right',
      alignSelf: 'end',
      fontSize: '12px',
      lineHeight: 1.5,
    },
    divider: {
      height: '1px',
      backgroundColor: '#032b4a',
      margin: isPrint ? '4mm 0' : '10mm 0',
    },
    sectionTitle: {
      color: '#032b4a',
      textTransform: 'uppercase',
      fontSize: '18px',
      fontWeight: 700,
      marginBottom: '5px',
    },
    paymentTable: {
      width: '100%',
      borderCollapse: 'collapse',
      tableLayout: 'fixed',
      fontSize: '12px',
    },
    paymentCell: {
      padding: isPrint ? '2px 4px' : '5px 4px',
      verticalAlign: 'top',
    },
    itemTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: isPrint ? '5mm' : '10mm',
      tableLayout: 'fixed',
      fontSize: '12px',
    },
    itemHead: {
      backgroundColor: '#032b4a',
      color: '#ffffff',
      padding: '8px',
      textAlign: 'left',
      textTransform: 'uppercase',
      fontSize: '11px',
    },
    itemCell: {
      padding: '8px',
      borderBottom: '1px solid #ccc',
      verticalAlign: 'top',
      fontSize: '12px',
    },
    rowAlt: {
      backgroundColor: '#f9f9f9',
    },
    summaryWarrantyRow: {
      display: 'flex',
      gap: '10px',
      marginBottom: isPrint ? '5mm' : '10mm',
      alignItems: 'stretch',
    },
    summaryBlock: {
      width: '40%',
    },
    summaryTable: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    summaryCell: {
      padding: '5px 0',
      fontWeight: 700,
      fontSize: '12px',
    },
    termsBlock: {
      width: '60%',
    },
    bodyText: {
      fontSize: '14px',
      color: '#333333',
      lineHeight: 1.55,
    },
    thanks: {
      textAlign: 'left',
      marginBottom: isPrint ? '5mm' : '10mm',
      fontSize: '14px',
    },
    footer: {
      backgroundColor: '#032b4a',
      color: '#ffffff',
      padding: isPrint ? '8px 10px' : '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      boxSizing: 'border-box',
      marginTop: 'auto',
    },
    footerLeft: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '5px',
      fontSize: '14px',
    },
    signatureBlock: {
      textAlign: 'right',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      minWidth: '250px',
    },
    signatureTitle: {
      fontSize: '14px',
      marginBottom: '2px',
    },
    signatureLine: {
      width: '200px',
      height: '1px',
      backgroundColor: '#ffffff',
      marginBottom: '2px',
    },
    signLabel: {
      fontWeight: 700,
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.sheet}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.invoiceTitle}>{t('Invoice')}</h1>
          </div>
          <div style={styles.headerRight}>
            {normalized.showLogo && logo ? <img src={logo} alt={companyName} style={styles.logo} /> : null}
            {normalized.showStoreName ? <div style={styles.companyText}>{companyName}</div> : null}
            {normalized.showBranchName ? <div style={styles.branchText}>{branchName}</div> : null}
          </div>
        </div>

        <div style={styles.detailsGrid}>
          <div>
            {normalized.showInvoiceNumber ? (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('Invoice No:')}</span>
                <span>{invoiceValue}</span>
              </div>
            ) : null}
            {normalized.showDateTime ? (
              <>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>{t('Due Date:')}</span>
                  <span>{dueAmount > 0 ? invoiceDate : t('Paid')}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>{t('Invoice Date:')}</span>
                  <span>{invoiceDate}</span>
                </div>
              </>
            ) : null}
            {normalized.showCashier ? (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('Cashier:')}</span>
                <span>{cashierName}</span>
              </div>
            ) : null}
          </div>

          <div style={styles.invoiceTo}>
            {normalized.showCustomer ? (
              <>
                <div style={{ ...styles.detailRow, justifyContent: 'flex-end' }}>
                  <span style={styles.toLabel}>{t('Invoice To:')}</span>
                  <span style={{ fontWeight: 700 }}>{customerName}</span>
                </div>
                {customerPhone ? <div>{customerPhone}</div> : null}
                {customerAddress ? <div>{customerAddress}</div> : null}
              </>
            ) : null}
          </div>
        </div>

        <div style={styles.divider} />

        <div style={{ marginBottom: isPrint ? '4mm' : '10mm' }}>
          <div style={styles.sectionTitle}>{t('Payment Method')}</div>
          <table style={styles.paymentTable}>
            <tbody>
              <tr>
                <td style={styles.paymentCell}>{t('Payment Type:')}</td>
                <td style={styles.paymentCell}>{paymentMethod}</td>
                <td style={{ ...styles.paymentCell, textAlign: 'right' }}>{t('Phone:')}</td>
                <td style={{ ...styles.paymentCell, textAlign: 'right' }}>{normalized.showPhone ? branchPhone : ''}</td>
              </tr>
              <tr>
                <td style={styles.paymentCell}>{t('Paid Amount:')}</td>
                <td style={styles.paymentCell}>{formatCurrency(paidAmount)}</td>
                <td style={{ ...styles.paymentCell, textAlign: 'right' }}>{t('Branch:')}</td>
                <td style={{ ...styles.paymentCell, textAlign: 'right' }}>{normalized.showBranchName ? branchName : ''}</td>
              </tr>
              <tr>
                <td style={styles.paymentCell}>{t('Due Amount:')}</td>
                <td style={styles.paymentCell}>{formatCurrency(dueAmount)}</td>
                <td style={{ ...styles.paymentCell, textAlign: 'right' }}>{t('Address:')}</td>
                <td style={{ ...styles.paymentCell, textAlign: 'right' }}>{normalized.showAddress ? branchAddress : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={styles.divider} />

        {normalized.showItemTable ? (
          <table style={styles.itemTable}>
            <thead>
              <tr>
                <th style={{ ...styles.itemHead, width: normalized.showWarranty ? '34%' : '46%' }}>{t('Item Description')}</th>
                {normalized.showWarranty ? <th style={{ ...styles.itemHead, width: '18%' }}>{t('Warranty')}</th> : null}
                <th style={{ ...styles.itemHead, width: normalized.showWarranty ? '16%' : '18%', textAlign: 'right' }}>{t('Price (Rs)')}</th>
                <th style={{ ...styles.itemHead, width: normalized.showWarranty ? '14%' : '16%', textAlign: 'center' }}>{t('Qty')}</th>
                <th style={{ ...styles.itemHead, width: normalized.showWarranty ? '18%' : '20%', textAlign: 'right' }}>{t('Subtotal (Rs)')}</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.map((item, index) => {
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
                  <>
                    <tr key={`${primaryName}-${index}`} style={index % 2 === 1 ? styles.rowAlt : undefined}>
                      <td style={styles.itemCell}>
                        <div style={{ fontWeight: 700 }}>{resolvedItemName}</div>
                        {item.barcode ? <div style={{ marginTop: '2px', color: '#64748b' }}>{t('Barcode:')} {item.barcode}</div> : null}
                      </td>
                      {normalized.showWarranty ? (
                        <td style={styles.itemCell}>
                          {item.warrantyLabel ? (
                            <>
                              <div style={{ fontWeight: 700 }}>{item.warrantyLabel}</div>
                              {item.warrantyPeriodValue && item.warrantyPeriodUnit ? (
                                <div style={{ marginTop: '2px', color: '#64748b' }}>
                                  {item.warrantyPeriodValue} {item.warrantyPeriodUnit}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      ) : null}
                      <td style={{ ...styles.itemCell, textAlign: 'right' }}>{formatCurrency(Number(item.unitPrice || 0))}</td>
                      <td style={{ ...styles.itemCell, textAlign: 'center' }}>{formatQuantityWithUnit(item.qty, item.qtyUnit || item.defaultUnit)}</td>
                      <td style={{ ...styles.itemCell, textAlign: 'right' }}>{formatCurrency(calculateItemTotal(item))}</td>
                    </tr>
                    {normalized.showLineDiscount && hasDiscount ? (
                      <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <td colSpan={normalized.showWarranty ? 4 : 3} style={{ ...styles.itemCell, textAlign: 'right', paddingRight: '8px', color: '#666', fontStyle: 'italic' }}>
                          {discountLabel}
                        </td>
                        <td style={styles.itemCell} />
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
        ) : null}

        <div style={styles.summaryWarrantyRow}>
          <div style={styles.summaryBlock}>
            <table style={styles.summaryTable}>
              <tbody>
                {normalized.showSubtotal ? (
                  <tr>
                    <td style={styles.summaryCell}>{t('Total (Rs):')}</td>
                    <td style={{ ...styles.summaryCell, textAlign: 'right' }}>{formatCurrency(subTotal)}</td>
                  </tr>
                ) : null}
                {normalized.showDiscount ? (
                  <tr>
                    <td style={styles.summaryCell}>{t('Discount (Rs):')}</td>
                    <td style={{ ...styles.summaryCell, textAlign: 'right' }}>-{formatCurrency(calculateTotalDiscount(itemRows, billDiscount, orderData?.promotionDiscountTotal ?? orderData?.billPromotionDiscountAmount ?? 0))}</td>
                  </tr>
                ) : null}
                {normalized.showNetTotal ? (
                  <tr>
                    <td style={styles.summaryCell}>{t('Grand Total (Rs):')}</td>
                    <td style={{ ...styles.summaryCell, textAlign: 'right' }}>{formatCurrency(grandTotal)}</td>
                  </tr>
                ) : null}
                {normalized.showPaid ? (
                  <tr>
                    <td style={styles.summaryCell}>{t('Paid (Rs):')}</td>
                    <td style={{ ...styles.summaryCell, textAlign: 'right' }}>{formatCurrency(paidAmount)}</td>
                  </tr>
                ) : null}
                {normalized.showBalance && balanceAmount > 0 ? (
                  <tr>
                    <td style={styles.summaryCell}>{t('Balance (Rs):')}</td>
                    <td style={{ ...styles.summaryCell, textAlign: 'right' }}>{formatCurrency(balanceAmount)}</td>
                  </tr>
                ) : null}
                {normalized.showDueAmount ? (
                  <tr>
                    <td style={styles.summaryCell}>{t('Due Amount (Rs):')}</td>
                    <td style={{ ...styles.summaryCell, textAlign: 'right' }}>{formatCurrency(dueAmount)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={styles.termsBlock}>
            <div style={styles.sectionTitle}>{t('Terms & Condition')}</div>
            <div style={styles.bodyText}>
              Payment must be completed according to the selected sale method. Please keep the invoice number for future reference. All item values and totals are generated directly from the sale record.
            </div>
            {noteText ? (
              <div style={{ ...styles.bodyText, marginTop: '8px' }}>
                <strong>{t('Notes:')}</strong> {noteText}
              </div>
            ) : null}
          </div>
        </div>

        {normalized.showThanksMessage ? (
          <div style={styles.thanks}>
            {normalized.thanksMessage}
          </div>
        ) : null}

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            {normalized.showPhone && branchPhone ? <div>{branchPhone}</div> : null}
            {normalized.showAddress && branchAddress ? <div>{branchAddress}</div> : null}
            {normalized.showCredits ? <div>{normalized.creditsLine2}</div> : null}
          </div>
          <div style={styles.signatureBlock}>
            <div style={styles.signatureTitle}>{t('Authorized Signature')}</div>
            <div style={styles.signatureLine} />
            <div style={styles.signLabel}>{t('Sign')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
