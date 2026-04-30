import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReceiptTemplate from '../receipt/ReceiptTemplate';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';

const KotPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    printKot: (orderMeta, items, storeName, shiftData, receiptSettings) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const settings = normalizeReceiptSettings(receiptSettings);
      const branchData = {
        name: orderMeta?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderMeta?.branchAddress || shiftData?.branchAddress || '',
        phone: orderMeta?.branchPhone || shiftData?.branchPhone || '',
        logo: orderMeta?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderMeta?.cashierName || shiftData?.cashierName || 'Cashier',
      };

      const doc = frame.contentWindow.document;
      doc.open();

      const html = renderToStaticMarkup(
        <ReceiptTemplate
          templateType={PRINT_TEMPLATE_TYPES.KOT}
          settings={settings}
          branchData={branchData}
          storeName={storeName}
          orderData={orderMeta}
          items={Array.isArray(items) ? items : []}
          customerData={orderMeta?.customerName ? { name: orderMeta.customerName } : null}
          showTotals={false}
          showCredits
          showContinued={false}
          mode="print"
        />
      );

      const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page { size: auto; margin: 0; }
            html, body { margin: 0; padding: 0; background: #fff; }
            body { margin: 0; padding: 0; background: #fff; }
          </style>
        </head>
        <body>${html}</body>
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
      title="KOT Printer"
    />
  );
});

export default KotPrinter;
