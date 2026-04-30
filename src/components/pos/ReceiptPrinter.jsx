import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReceiptTemplate from '../receipt/ReceiptTemplate';
import { normalizeReceiptSettings, PRINT_TEMPLATE_TYPES } from '../../utils/receiptSettings';

const ReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    printOrder: (orderData, cartItems, storeName, shiftData, customerData, receiptSettings) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const settings = normalizeReceiptSettings(receiptSettings);
      const branchData = {
        name: orderData?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderData?.branchAddress || shiftData?.branchAddress || '',
        phone: orderData?.branchPhone || shiftData?.branchPhone || '',
        logo: orderData?.branchLogo || shiftData?.branchLogo || '',
        cashierName: orderData?.cashierName || shiftData?.cashierName || 'Cashier',
      };

      const doc = frame.contentWindow.document;
      doc.open();

      const itemList = Array.isArray(cartItems) ? cartItems : [];
      const itemsPerPage = 15;
      const totalPages = Math.max(1, Math.ceil(itemList.length / itemsPerPage));

      const pagesHtml = Array.from({ length: totalPages }, (_, pageIndex) => {
        const currentItems = itemList.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);
        const isLastPage = pageIndex === totalPages - 1;

        return renderToStaticMarkup(
          <ReceiptTemplate
            templateType={PRINT_TEMPLATE_TYPES.THERMAL}
            settings={settings}
            branchData={branchData}
            storeName={storeName}
            orderData={orderData}
            items={currentItems}
            customerData={customerData}
            pageNumber={pageIndex + 1}
            totalPages={totalPages}
            showTotals={isLastPage}
            showCredits={isLastPage}
            showContinued={!isLastPage}
            mode="print"
          />
        );
      }).join('');

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page { size: auto; margin: 0; }
            html, body { margin: 0; padding: 0; background-color: #ffffff; }
            body { margin: 0; padding: 0; background-color: #ffffff; }
          </style>
        </head>
        <body>${pagesHtml}</body>
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
