import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';

const ReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    // paperSize parameter එක අයින් කළා, දැන් ඒක auto
    printOrder: (orderData, cartItems, storeName, shiftData, customerData) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const doc = frame.contentWindow.document;
      doc.open();

      // 🔥 සම්පූර්ණ CSS එක vw (Viewport Width) වලට හැදුවා
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* කොළේ Size එක Browser එකෙන් තෝරන එක ගන්නවා. Margin එකක් පොඩියට තියනවා */
            @page { size: auto; margin: 4mm; }
            
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }
            
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 100%; 
              box-sizing: border-box;
              /* මෙන්න මේ vw අගයන් නිසා තමයි ඕනම size එකකට auto හැදෙන්නේ */
              font-size: 3.5vw; 
              line-height: 1.4;
              color: #000;
              padding: 2vw;
            }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            
            .header h1 { font-size: 6vw; margin: 0 0 1vw 0; font-weight: 900; }
            .header p { margin: 0 0 0.5vw 0; font-size: 3vw; }
            .divider { border-bottom: 0.4vw dashed #000; margin: 3vw 0; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 2vw; }
            th { border-bottom: 0.4vw dashed #000; padding-bottom: 2vw; font-size: 3.2vw; text-transform: uppercase; }
            td { padding: 2vw 0; vertical-align: top; }
            .item-name { max-width: 60%; word-wrap: break-word; font-weight: bold; }
            
            .totals { margin-top: 4vw; width: 100%; display: flex; justify-content: flex-end; }
            .totals-table { width: 90%; } 
            .totals-table td { padding: 1.5vw 0; }
            .net-total { font-size: 4.5vw; font-weight: bold; border-top: 0.4vw dashed #000; border-bottom: 0.4vw dashed #000; padding: 2.5vw 0 !important; }
            
            .footer { margin-top: 6vw; font-size: 3vw; }
            
            .brand-footer {
               margin-top: 8vw;
               padding-top: 3vw;
               border-top: 0.3vw solid #000;
               text-align: center;
               padding-bottom: 3vw; 
            }
            .brand-footer .brand-name { font-size: 3.5vw; font-weight: bold; letter-spacing: 0.2vw; }
            .brand-footer .brand-sub { font-size: 2.5vw; margin-top: 1vw; }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <h1>${storeName || 'Store Name Not Provided'}</h1>
            <p>Branch: ${shiftData?.branchName || 'Main Branch'}</p>
            <p>Invoice: <b>${orderData.invoiceNo}</b></p>
            <p>Date: ${new Date().toLocaleString()}</p>
            <p>Cashier: ${shiftData?.cashierName || 'Cashier'}</p>
            ${customerData ? `<p>Customer: <b>${customerData.name}</b></p>` : ''}
          </div>
          
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
              ${cartItems.map(item => {
                let itemTotal = item.unitPrice * item.qty;
                if (item.discountType === 'FIXED') itemTotal -= item.discountValue;
                if (item.discountType === 'PERCENT') itemTotal -= (itemTotal * item.discountValue) / 100;
                
                return `
                  <tr>
                    <td class="item-name text-left">
                      ${item.name} <br/>
                      <span style="font-size: 2.5vw; font-weight: normal;">@ ${formatCurrency(item.unitPrice)}</span>
                    </td>
                    <td class="text-center">${item.qty}</td>
                    <td class="text-right">${formatCurrency(Math.max(0, itemTotal))}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="totals">
            <table class="totals-table">
              <tr>
                <td>Sub Total</td>
                <td class="text-right">${formatCurrency(orderData.subTotal)}</td>
              </tr>
              ${orderData.billDiscount > 0 ? `
              <tr>
                <td>Discount</td>
                <td class="text-right">-${formatCurrency(orderData.billDiscount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="net-total">Net Total</td>
                <td class="text-right net-total">${formatCurrency(orderData.netTotal)}</td>
              </tr>
              
              <tr><td colspan="2" style="height: 2vw;"></td></tr>
              
              <tr>
                <td>Paid (${orderData.orderType})</td>
                <td class="text-right">${formatCurrency(orderData.paidAmount)}</td>
              </tr>
              ${orderData.orderType === 'CASH' ? `
              <tr>
                <td class="font-bold">Balance</td>
                <td class="text-right font-bold">${formatCurrency(orderData.paidAmount - orderData.netTotal)}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div class="footer text-center">
            <p class="font-bold">Thank You, Come Again!</p>
          </div>

          <div class="brand-footer">
             <div class="brand-name">⚙️ SOFTWARE BY CHALA</div>
             <div class="brand-sub">Smart Retail Solutions | 📞 0704589764</div>
          </div>
        </body>
        </html>
      `;

      doc.write(receiptHTML);
      doc.close();

      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      }, 500);
    }
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