import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';

const ReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    // 👈 මෙතනට customerData එකතු කළා
    printOrder: (orderData, cartItems, storeName, shiftData, customerData) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const doc = frame.contentWindow.document;
      doc.open();
      
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* 🔥 Height එක Auto හැදෙන්න size එක අයින් කරලා margin 0 දුන්නා */
            @page { margin: 0; }
            html, body {
              margin: 0;
              padding: 0;
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; /* 80mm පළල */
              margin: 0 auto; 
              padding: 4mm 5mm; 
              font-size: 12px; 
              line-height: 1.2;
              color: #000;
              position: relative;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            
            /* Watermark එක මැදට වෙන්න */
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 60px;
              font-weight: 900;
              color: rgba(0, 0, 0, 0.08); 
              z-index: -1;
              letter-spacing: 5px;
              pointer-events: none;
            }

            .header h1 { font-size: 18px; margin: 0 0 5px 0; text-transform: uppercase; }
            .header p { margin: 0 0 3px 0; font-size: 11px; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { border-bottom: 1px dashed #000; padding-bottom: 3px; font-size: 11px; }
            td { padding: 4px 0; vertical-align: top; font-size: 12px; }
            .item-name { max-width: 40mm; word-wrap: break-word; font-weight: bold;}
            
            .totals { margin-top: 5px; }
            .totals table { width: 100%; }
            .totals td { padding: 2px 0; }
            .net-total { font-size: 16px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0 !important; }
            
            .footer { margin-top: 15px; font-size: 11px; }
            
            .brand-footer {
               margin-top: 15px;
               padding-top: 5px;
               border-top: 1px solid #000;
               text-align: center;
               padding-bottom: 10px; /* යටින් පොඩි ඉඩක් */
            }
            .brand-footer .brand-name { font-size: 13px; font-weight: bold; letter-spacing: 1px; }
            .brand-footer .brand-sub { font-size: 9px; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="watermark">CHALA</div>

          <div class="header text-center">
            <h1>${storeName || 'Super Mart'}</h1>
            <p>Branch: ${shiftData?.branchName || 'Main Branch'}</p>
            <p>Invoice: <b>${orderData.invoiceNo}</b></p>
            <p>Date: ${new Date().toLocaleString()}</p>
            <p>Cashier: ${shiftData?.cashierName || 'Cashier'}</p>
            <!-- 🔥 Customer Name එක තියෙනවා නම් පෙන්වනවා -->
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
                      <span style="font-size: 10px; font-weight: normal;">@ ${formatCurrency(item.unitPrice)}</span>
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
            <table>
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
              
              <tr><td colspan="2" style="height: 5px;"></td></tr>
              
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
             <div class="brand-sub">Smart Retail Solutions</div>
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
      style={{ display: 'none' }}
      title="Receipt Printer"
    />
  );
});

export default ReceiptPrinter;