import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InvoiceTemplate from '../invoice/InvoiceTemplate';
import { getReceiptSettingsDefaults, normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';

const InvoicePrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    printInvoice: (orderData, cartItems, storeName, shiftData, customerData, receiptSettings) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const settings = normalizeReceiptSettings({
        ...getReceiptSettingsDefaults(PRINT_TEMPLATE_TYPES.A4),
        ...(receiptSettings || {}),
        templateType: PRINT_TEMPLATE_TYPES.A4,
        paperWidthMm: 210,
      });
      const branchData = {
        name: orderData?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderData?.branchAddress || shiftData?.branchAddress || '',
        phone: orderData?.branchPhone || shiftData?.branchPhone || '',
        logo: orderData?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderData?.cashierName || shiftData?.cashierName || 'Cashier',
      };

      const doc = frame.contentWindow.document;
      doc.open();

      const html = renderToStaticMarkup(
        <InvoiceTemplate
          settings={settings}
          branchData={branchData}
          storeName={storeName}
          orderData={orderData}
          items={Array.isArray(cartItems) ? cartItems : []}
          customerData={customerData}
          mode="print"
        />
      );

      const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body {
              margin: 0;
              padding: 0;
              width: 210mm;
              background: #ffffff;
              overflow: visible;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              display: block;
            }
            #invoice-print-root {
              width: 210mm;
              margin: 0;
              padding: 0;
              overflow: visible;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { page-break-inside: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { page-break-inside: avoid; }
          </style>
        </head>
        <body><div id="invoice-print-root">${html}</div></body>
        </html>
      `;

      doc.write(documentHtml);
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
      title="Invoice Printer"
    />
  );
});

export default InvoicePrinter;
