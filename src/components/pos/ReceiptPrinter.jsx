import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import toast from 'react-hot-toast';
import ReceiptTemplate from '../receipt/ReceiptTemplate';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES, parseTemplateLines } from '../../utils/receiptSettings';
import { buildPosReceiptHtml } from '../../utils/buildPosReceiptHtml';
import { getPrintPaperWidth, printerAgentAPI } from '../../api/printerAgent.api';
import { useLanguage } from '../../context/LanguageContext';

const ReceiptPrinter = forwardRef((props, ref) => {
  const { language } = useLanguage();
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
    printOrder: async (orderData, cartItems, storeName, shiftData, customerData, receiptSettings) => {
      const settings = normalizeReceiptSettings(receiptSettings);
      const branchData = {
        name: orderData?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderData?.branchAddress || shiftData?.branchAddress || '',
        phone: orderData?.branchPhone || shiftData?.branchPhone || '',
        logo: orderData?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderData?.cashierName || shiftData?.cashierName || 'Cashier',
      };

      const itemList = Array.isArray(cartItems) ? cartItems : [];

      // ── Template-line based printing ──────────────────────────────────────
      // If the branch has configured a line-by-line template, use the HTML
      // string renderer (buildPosReceiptHtml) which respects the template design.
      const configuredLines = parseTemplateLines(settings.templateLines);
      if (configuredLines.length > 0) {
        const receiptHtml = buildPosReceiptHtml({
          settings,
          branchData,
          storeName,
          orderData,
          items: itemList,
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
        return;
      }

      // ── Legacy React-component based printing (fallback) ──────────────────
      // Thermal roll paper is continuous — one receipt, height driven by content.
      const pagesHtml = renderToStaticMarkup(
        <ReceiptTemplate
          templateType={PRINT_TEMPLATE_TYPES.THERMAL}
          settings={settings}
          branchData={branchData}
          storeName={storeName}
          orderData={orderData}
          items={itemList}
          customerData={customerData}
          pageNumber={1}
          totalPages={1}
          showTotals
          showCredits
          showContinued={false}
          mode="print"
          language={language}
        />
      );

      const receiptHtml = `
        <!DOCTYPE html>
        <html lang="${language === 'si' ? 'si' : 'en'}">
        <head>
          <style>
            @page { size: ${settings.paperWidthMm}mm auto; margin: 0; }
            html, body { margin: 0; padding: 0; background-color: #ffffff; }
            body { margin: 0; padding: 0; background-color: #ffffff; }
          </style>
        </head>
        <body>${pagesHtml}</body>
        </html>
      `;

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
