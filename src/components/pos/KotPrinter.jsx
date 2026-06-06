import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import toast from 'react-hot-toast';
import ReceiptTemplate from '../receipt/ReceiptTemplate';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';
import { getPrintPaperWidth, printerAgentAPI } from '../../api/printerAgent.api';

const KotPrinter = forwardRef((props, ref) => {
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
    printKot: async (orderMeta, items, storeName, shiftData, receiptSettings) => {
      const settings = normalizeReceiptSettings(receiptSettings);
      const branchData = {
        name: orderMeta?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderMeta?.branchAddress || shiftData?.branchAddress || '',
        phone: orderMeta?.branchPhone || shiftData?.branchPhone || '',
        logo: orderMeta?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderMeta?.cashierName || shiftData?.cashierName || 'Cashier',
      };

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

      if (settings.directPrintEnabled && settings.printerName) {
        try {
          await printerAgentAPI.printKot({
            printerName: settings.printerName,
            html: documentHtml,
            paperWidth: getPrintPaperWidth(settings),
            copies: settings.printerCopies,
          });
          return;
        } catch (error) {
          toast.error(`${error.message || 'Direct KOT print failed'}. Opening browser print.`);
        }
      }

      printInBrowser(documentHtml);
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
