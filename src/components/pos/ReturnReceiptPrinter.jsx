// src/components/pos/ReturnReceiptPrinter.jsx
// Prints a thermal return receipt for a processed partial return.
// Mirrors ReceiptPrinter.jsx pattern — uses an invisible iframe + browser print.
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { normalizeReceiptSettings } from '../../utils/receiptSettings';
import { getPrintPaperWidth, printerAgentAPI } from '../../api/printerAgent.api';
import toast from 'react-hot-toast';

const ReturnReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  const printInBrowser = (html) => {
    const frame = printFrameRef.current;
    if (!frame) return;
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }, 500);
  };

  useImperativeHandle(ref, () => ({
    /**
     * printReturn(returnData, storeName, receiptSettings)
     *
     * returnData shape (from OrderReturnResponse):
     *   returnNo, originalInvoiceNo, refundMethod, totalRefundAmount,
     *   reason, cashierNote, cashierName, customerName, createdAt,
     *   branchName, branchAddress, branchPhone, branchLogo,
     *   items: [{ itemName, barcode, returnQty, finalUnitPrice, refundLineAmount, stockReversed }]
     */
    printReturn: async (returnData, storeName, receiptSettings) => {
      const settings = normalizeReceiptSettings(receiptSettings);
      const paperWidthPx = settings.paperSize === '80mm' ? 302 : 226; // 80mm ≈ 302px, 58mm ≈ 226px

      const fmt = (n) =>
        Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const dateStr = returnData.createdAt
        ? new Date(returnData.createdAt).toLocaleString()
        : new Date().toLocaleString();

      const refundMethodLabel = {
        CASH: 'Cash',
        BANK: 'Bank Transfer',
        CARD: 'Card',
        STORE_CREDIT: 'Store Credit',
      }[returnData.refundMethod] || returnData.refundMethod;

      const itemRows = (returnData.items || [])
        .map(
          (item) => `
          <tr>
            <td style="padding:3px 0;font-size:11px;word-break:break-word;">${item.itemName}</td>
            <td style="padding:3px 4px;font-size:11px;text-align:center;">${item.returnQty}</td>
            <td style="padding:3px 0;font-size:11px;text-align:right;">${fmt(item.finalUnitPrice)}</td>
            <td style="padding:3px 0;font-size:11px;text-align:right;">${fmt(item.refundLineAmount)}</td>
          </tr>`
        )
        .join('');

      const logoHtml =
        returnData.branchLogo
          ? `<img src="${returnData.branchLogo}" alt="logo" style="max-width:80px;max-height:60px;margin-bottom:4px;" />`
          : '';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: ${settings.paperSize === '80mm' ? '80mm' : '58mm'} auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 6px; font-family: 'Courier New', Courier, monospace;
         font-size: 11px; color: #000; width: ${paperWidthPx}px; background: #fff; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .divider { border: none; border-top: 1px dashed #555; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; text-align: left; border-bottom: 1px solid #000; padding-bottom: 3px; }
  th.r { text-align: right; }
  th.c { text-align: center; }
  .total-row td { font-weight: bold; font-size: 12px; padding-top: 5px; }
  .badge { display:inline-block; background:#000; color:#fff; font-size:12px;
           font-weight:bold; padding:2px 8px; letter-spacing:1px; margin-bottom:4px; }
</style>
</head>
<body>
  <div class="center">
    ${logoHtml}
    <div class="bold" style="font-size:13px;">${returnData.branchName || storeName || 'Store'}</div>
    ${returnData.branchAddress ? `<div style="font-size:10px;">${returnData.branchAddress}</div>` : ''}
    ${returnData.branchPhone ? `<div style="font-size:10px;">Tel: ${returnData.branchPhone}</div>` : ''}
  </div>

  <hr class="divider"/>
  <div class="center">
    <div class="badge">RETURN RECEIPT</div>
  </div>
  <hr class="divider"/>

  <table style="margin-bottom:4px;">
    <tr><td style="font-size:10px;color:#555;">Return No</td><td class="right bold" style="font-size:10px;">${returnData.returnNo}</td></tr>
    <tr><td style="font-size:10px;color:#555;">Orig. Invoice</td><td class="right" style="font-size:10px;">${returnData.originalInvoiceNo}</td></tr>
    <tr><td style="font-size:10px;color:#555;">Date</td><td class="right" style="font-size:10px;">${dateStr}</td></tr>
    <tr><td style="font-size:10px;color:#555;">Customer</td><td class="right" style="font-size:10px;">${returnData.customerName || 'Walk-in'}</td></tr>
    <tr><td style="font-size:10px;color:#555;">Cashier</td><td class="right" style="font-size:10px;">${returnData.cashierName || '-'}</td></tr>
  </table>

  <hr class="divider"/>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="c">Qty</th>
        <th class="r">Price</th>
        <th class="r">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="padding-top:6px;border-top:1px solid #000;">TOTAL REFUND</td>
        <td style="padding-top:6px;border-top:1px solid #000;text-align:right;">${fmt(returnData.totalRefundAmount)} LKR</td>
      </tr>
    </tfoot>
  </table>

  <hr class="divider"/>
  <table>
    <tr><td style="font-size:10px;color:#555;">Refund Method</td><td class="right bold" style="font-size:10px;">${refundMethodLabel}</td></tr>
    <tr><td style="font-size:10px;color:#555;">Reason</td><td class="right" style="font-size:10px;">${returnData.reason || '-'}</td></tr>
    ${returnData.cashierNote ? `<tr><td style="font-size:10px;color:#555;">Note</td><td class="right" style="font-size:10px;font-style:italic;">${returnData.cashierNote}</td></tr>` : ''}
  </table>

  <hr class="divider"/>
  <div class="center" style="font-size:10px;margin-top:4px;">
    Thank you — Items returned &amp; refund processed.<br/>
    Please retain this receipt for your records.
  </div>
</body>
</html>`;

      if (settings.directPrintEnabled && settings.printerName) {
        try {
          await printerAgentAPI.printReceipt({
            printerName: settings.printerName,
            html,
            paperWidth: getPrintPaperWidth(settings),
            copies: settings.printerCopies,
          });
          return;
        } catch (err) {
          toast.error(`${err.message || 'Direct print failed'}. Opening browser print.`);
        }
      }

      printInBrowser(html);
    },
  }));

  return (
    <iframe
      ref={printFrameRef}
      style={{
        position: 'fixed', right: '0', bottom: '0',
        width: '0', height: '0', border: 'none', visibility: 'hidden',
      }}
      title="Return Receipt Printer"
    />
  );
});

export default ReturnReceiptPrinter;
