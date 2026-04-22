import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { formatCurrency, formatQuantityWithUnit } from '../../utils/formatters';
import { normalizeReceiptSettings } from '../../utils/receiptSettings';

const ReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  const formatReceiptQty = (qty, qtyUnit) => {
    const formatted = formatQuantityWithUnit(qty, qtyUnit);
    return formatted.replace(/\bSERVICE\b/g, 'S');
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

  useImperativeHandle(ref, () => ({
    printOrder: (orderData, cartItems, storeName, shiftData, customerData, receiptSettings) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const settings = normalizeReceiptSettings(receiptSettings);
      const logoWidthMm = Math.max(20, ((settings.paperWidthMm - 6) * settings.logoWidthPercent) / 100);
      const branchData = {
        name: orderData?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderData?.branchAddress || shiftData?.branchAddress || '',
        phone: orderData?.branchPhone || shiftData?.branchPhone || '',
        logo: orderData?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderData?.cashierName || shiftData?.cashierName || 'Cashier',
      };

      const doc = frame.contentWindow.document;
      doc.open();

      const receiptDate = orderData?.createdAt ? new Date(orderData.createdAt) : new Date();
      const itemList = Array.isArray(cartItems) ? cartItems : [];
      const itemsPerPage = 15;
      const totalPages = Math.max(1, Math.ceil(itemList.length / itemsPerPage));
      const netTotal = Number(orderData?.netTotal ?? orderData?.grandTotal ?? 0);
      const subTotal = Number(orderData?.subTotal ?? 0);
      const billDiscount = Number(orderData?.billDiscount ?? 0);
      const paidAmount = Number(orderData?.paidAmount ?? 0);
      const orderType = orderData?.orderType || 'CASH';

      let allPagesHtml = '';

      for (let page = 0; page < totalPages; page += 1) {
        const isLastPage = page === totalPages - 1;
        const currentItems = itemList.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

        const customerHtml = settings.showCustomer && customerData?.name
          ? `<p>Customer: <b>${customerData.name}</b></p>`
          : '';

        const itemsTableHtml = settings.showItemTable ? `
          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th class="text-left" style="width: 50%;">ITEM</th>
                <th class="text-center" style="width: 15%;">QTY</th>
                <th class="text-right" style="width: 35%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${currentItems.map((item) => `
                <tr>
                  <td class="item-name text-left">
                    ${item.name} <br/>
                    <span class="item-price">@ ${formatCurrency(item.unitPrice)}</span>
                  </td>
                  <td class="text-center">${formatReceiptQty(item.qty, item.qtyUnit || item.defaultUnit)}</td>
                  <td class="text-right">${formatCurrency(calculateItemTotal(item))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '';

        const totalsHtml = isLastPage ? `
          <div class="divider"></div>
          <div class="totals avoid-break">
            <table class="totals-table">
              ${settings.showSubtotal ? `
                <tr>
                  <td>Sub Total</td>
                  <td class="text-right">${formatCurrency(subTotal)}</td>
                </tr>
              ` : ''}
              ${settings.showDiscount && billDiscount > 0 ? `
                <tr>
                  <td>Discount</td>
                  <td class="text-right">-${formatCurrency(billDiscount)}</td>
                </tr>
              ` : ''}
              ${settings.showNetTotal ? `
                <tr>
                  <td class="net-total">Net Total</td>
                  <td class="text-right net-total">${formatCurrency(netTotal)}</td>
                </tr>
              ` : ''}
              ${settings.showPaid ? `
                <tr>
                  <td>Paid (${orderType})</td>
                  <td class="text-right">${formatCurrency(paidAmount)}</td>
                </tr>
              ` : ''}
              ${settings.showBalance && orderType === 'CASH' ? `
                <tr>
                  <td class="font-bold">Balance</td>
                  <td class="text-right font-bold">${formatCurrency(paidAmount - netTotal)}</td>
                </tr>
              ` : ''}
            </table>
          </div>
        ` : '';

        const thanksHtml = isLastPage && settings.showThanksMessage
          ? `<div class="footer text-center avoid-break"><p class="font-bold">${settings.thanksMessage}</p></div>`
          : '';

        const creditsHtml = isLastPage ? `
          <div class="brand-footer avoid-break">
            <div class="brand-name">${settings.creditsLine1}</div>
            <div class="brand-sub">${settings.creditsLine2}</div>
          </div>
        ` : '';

        const continueHtml = !isLastPage
          ? `<div class="text-center continued-note">Continued on next page...</div>`
          : '';

        allPagesHtml += `
          <div class="receipt-page ${!isLastPage ? 'page-break' : ''}">
            <div class="main-content">
              <div class="header text-center">
                ${settings.showLogo && branchData.logo ? `
                  <div class="logo-wrap">
                    <img src="${branchData.logo}" alt="Branch Logo" class="logo" />
                  </div>
                ` : ''}
                ${settings.showStoreName ? `<h1>${storeName || 'Store Name'}</h1>` : ''}
                ${settings.showBranchName ? `<p class="branch-name">Branch: ${branchData.name}</p>` : ''}

                <div class="contact-info">
                  ${settings.showAddress && branchData.address ? `<p>Address: ${branchData.address}</p>` : ''}
                  ${settings.showPhone && branchData.phone ? `<p>Phone: ${branchData.phone}</p>` : ''}
                </div>

                <div class="divider"></div>

                <div class="info-section">
                  ${settings.showInvoiceNumber ? `<p>Invoice: <b>${orderData.invoiceNo}</b> ${totalPages > 1 ? `(Page ${page + 1} of ${totalPages})` : ''}</p>` : ''}
                  ${settings.showDateTime ? `<p>Date: ${receiptDate.toLocaleString()}</p>` : ''}
                  ${settings.showCashier ? `<p>Cashier: ${branchData.cashierName}</p>` : ''}
                  ${customerHtml}
                </div>
              </div>

              ${itemsTableHtml}
              ${totalsHtml}
              ${thanksHtml}
            </div>
            ${creditsHtml}
            ${continueHtml}
          </div>
        `;
      }

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page {
              size: auto;
              margin: 0;
            }

            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }

            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${settings.paperWidthMm}mm;
              box-sizing: border-box;
              font-size: 3mm;
              line-height: 1.35;
              color: #000;
              padding: 3mm;
            }

            .receipt-page {
              width: 100%;
            }

            .page-break {
              page-break-after: always;
            }

            .avoid-break {
              page-break-inside: avoid;
            }

            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }

            .header h1 {
              font-size: 5.6mm;
              margin: 0 0 1mm 0;
              font-weight: 900;
              text-transform: uppercase;
            }

            .header p {
              margin: 0.8mm 0;
              font-size: 3mm;
            }

            .header .branch-name {
              font-weight: bold;
            }

            .logo-wrap {
              margin-bottom: 2mm;
              display: flex;
              justify-content: center;
            }

            .logo {
              width: ${logoWidthMm}mm;
              max-width: 100%;
              max-height: 28mm;
              height: auto;
              object-fit: contain;
            }

            .contact-info {
              margin: 1mm 0 0;
            }

            .contact-info p {
              margin: 0.5mm 0;
              font-size: 2.8mm;
              color: #222;
            }

            .info-section p {
              margin: 0.6mm 0;
            }

            .divider {
              border-bottom: 0.35mm dashed #000;
              margin: 2mm 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1.2mm;
            }

            th {
              border-bottom: 0.35mm dashed #000;
              padding-bottom: 1mm;
              font-size: 2.8mm;
              text-transform: uppercase;
            }

            td {
              padding: 1.2mm 0;
              vertical-align: top;
            }

            .item-name {
              max-width: 65%;
              word-wrap: break-word;
              font-weight: bold;
            }

            .item-price {
              font-size: 2.4mm;
              font-weight: normal;
              color: #444;
            }

            .totals {
              margin-top: 2mm;
              width: 100%;
              display: flex;
              justify-content: flex-end;
            }

            .totals-table {
              width: 100%;
              margin-top: 0;
            }

            .totals-table td {
              padding: 0.9mm 0;
            }

            .net-total {
              font-size: 3.5mm;
              font-weight: bold;
              border-top: 0.35mm dashed #000;
              border-bottom: 0.35mm dashed #000;
              padding: 1.4mm 0 !important;
            }

            .footer {
              margin-top: 3mm;
              font-size: 2.9mm;
            }

            .brand-footer {
              margin-top: 3mm;
              padding-top: 2.2mm;
              border-top: 0.25mm solid #000;
              text-align: center;
              padding-bottom: 1mm;
            }

            .brand-footer .brand-name {
              font-size: 2.9mm;
              font-weight: bold;
            }

            .brand-footer .brand-sub {
              font-size: 2.4mm;
              margin-top: 0.8mm;
              color: #333;
            }

            .continued-note {
              margin-top: 3mm;
              font-style: italic;
              font-size: 2.7mm;
            }
          </style>
        </head>
        <body>
          ${allPagesHtml}
        </body>
        </html>
      `;

      doc.write(receiptHtml);
      doc.close();

      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      }, 500);
    },
  }));

  return (
    <iframe
      ref={printFrameRef}
      style={{ position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: 'none', visibility: 'hidden' }}
      title="Receipt Printer"
    />
  );
});

export default ReceiptPrinter;
