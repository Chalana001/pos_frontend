import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import toast from 'react-hot-toast';
import { normalizeReceiptSettings } from '../../utils/receiptSettings';
import { buildPosReceiptHtml } from '../../utils/buildPosReceiptHtml';
import { getPrintPaperWidth, printerAgentAPI } from '../../api/printerAgent.api';
import { printHtmlInFrame } from '../../utils/printFrame';

const ReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  const printInBrowser = (html) => printHtmlInFrame(printFrameRef.current, html);

  useImperativeHandle(ref, () => ({
    printOrder: async (orderData, cartItems, storeName, shiftData, customerData, receiptSettings) => {
      const settings = normalizeReceiptSettings(receiptSettings);
      const branchData = {
        name: orderData?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderData?.branchAddress || shiftData?.branchAddress || '',
        phone: orderData?.branchPhone || shiftData?.branchPhone || '',
        logo: orderData?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderData?.cashierName || shiftData?.cashierName || 'Cashier',
      };

      // One renderer, the same one the Receipt Design preview draws with. A branch that has
      // never saved a layout gets the default lines from getActiveTemplateLines, the same
      // default the preview shows it, so the slip on the printer is the slip on screen.
      // There used to be a second, older renderer for the unsaved case, and it printed a
      // different table: that is how the preview and the print came to disagree.
      const receiptHtml = buildPosReceiptHtml({
        settings,
        branchData,
        storeName,
        orderData,
        items: Array.isArray(cartItems) ? cartItems : [],
        customerData,
        options: { includeCopies: true },
      });

      if (settings.directPrintEnabled && settings.printerName) {
        try {
          await printerAgentAPI.printReceipt({
            printerName: settings.printerName,
            html: receiptHtml,
            paperWidth: getPrintPaperWidth(settings),
            copies: settings.printerCopies,
          });
          return;
        } catch (error) {
          toast.error(`${error.message || 'Direct print failed'}. Opening browser print.`);
        }
      }
      printInBrowser(receiptHtml);
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
