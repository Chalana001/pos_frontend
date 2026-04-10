import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';

const ReceiptPrinter = forwardRef((props, ref) => {
  const printFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    printOrder: (orderData, cartItems, storeName, shiftData, customerData) => {
      const frame = printFrameRef.current;
      if (!frame) return;

      const doc = frame.contentWindow.document;
      doc.open();

      // 🔴 CRITICAL: Branch data එක තීරණ කරන්න
      // Historical order (sales reprint): orderData.branchName use කරන්න (snapshot)
      // Current POS (new sale): shiftData use කරන්න
      const branchData = {
        name: orderData?.branchName || shiftData?.branchName || 'Main Branch',
        address: orderData?.branchAddress || shiftData?.branchAddress || '',
        phone: orderData?.branchPhone || shiftData?.branchPhone || '',
        cashierName: shiftData?.cashierName || 'Cashier'
      };

      // 🔴 අකුරු පොඩි කරපු නිසා දැන් එක කොළේකට items 15ක් 20ක් වුණත් දාන්න පුළුවන්
      const ITEMS_PER_PAGE = 15; 
      const totalPages = Math.ceil(cartItems.length / ITEMS_PER_PAGE);

      let allPagesHTML = '';

      for (let page = 0; page < totalPages; page++) {
        const isLastPage = page === totalPages - 1;
        const currentItems = cartItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

        allPagesHTML += `
          <div class="receipt-page ${!isLastPage ? 'page-break' : ''}">
            
            <div class="main-content">
              <div class="header text-center">
                <h1>${storeName || 'Store Name'}</h1>
                <p class="branch-name">Branch: ${branchData.name}</p>
                
                <div class="contact-info">
                  ${branchData.address ? `<p>Address: ${branchData.address}</p>` : ''}
                  ${branchData.phone ? `<p>Phone: 📞 ${branchData.phone}</p>` : ''}
                </div>

                <div class="divider"></div>

                <div class="info-section">
                  <p>Invoice: <b>${orderData.invoiceNo}</b> ${totalPages > 1 ? `(Page ${page + 1} of ${totalPages})` : ''}</p>
                  <p>Date: ${new Date().toLocaleString()}</p>
                  <p>Cashier: ${branchData.cashierName}</p>
                  ${customerData ? `<p>Customer: <b>${customerData.name}</b></p>` : ''}
                </div>
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
                  ${currentItems.map(item => {
                    let itemTotal = item.unitPrice * item.qty;
                    if (item.discountType === 'FIXED') itemTotal -= item.discountValue;
                    if (item.discountType === 'PERCENT') itemTotal -= (itemTotal * item.discountValue) / 100;
                    
                    return `
                      <tr>
                        <td class="item-name text-left">
                          ${item.name} <br/>
                          <span class="item-price">@ ${formatCurrency(item.unitPrice)}</span>
                        </td>
                        <td class="text-center">${item.qty}</td>
                        <td class="text-right">${formatCurrency(Math.max(0, itemTotal))}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>

              <div class="divider"></div>

              ${isLastPage ? `
                <div class="totals avoid-break">
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
                    
                    <tr><td colspan="2" class="spacer"></td></tr>
                    
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
                
                <div class="footer text-center avoid-break">
                  <p class="font-bold">Thank You, Come Again!</p>
                </div>
              </div> <div class="brand-footer avoid-break">
                  <div class="brand-name">⚙️ SOFTWARE BY CHALA</div>
                  <div class="brand-sub">Smart Retail Solutions | 📞 0704589764</div>
              </div>
            ` : `
              </div> <div class="text-center" style="margin-top: 3vw; font-style: italic; font-size: 2.5vw;">
                Continued on next page...
              </div>
            `}
          </div>
        `;
      }

      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page { size: auto; margin: 0; }
            
            html, body {
              margin: 0; padding: 0;
              background-color: #ffffff;
            }
            
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 100%; 
              box-sizing: border-box;
              font-size: 2.8vw; /* 🔴 මුළු බිලේම අකුරු සයිස් එක අඩු කළා (කලින් 3.5vw) */
              line-height: 1.3;
              color: #000;
              padding: 4mm; /* margin වෙනුවට padding දුන්නා */
            }
            
            /* 🔴 පිටුවේ layout එක flex කළා Footer එක යටටම යවන්න */
            .receipt-page { 
              width: 100%; 
              display: flex; 
              flex-direction: column; 
              min-height: 95vh; /* පිටුවේ උසින් 95%ක් ගන්නවා */
            }
            
            .main-content {
              flex: 1; /* ඉතුරු වෙන ඉඩ ඔක්කොම මේකෙන් ගන්නවා */
            }

            .page-break { page-break-after: always; }
            .avoid-break { page-break-inside: avoid; }

            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            
            /* Header Styles - අකුරු සහ spacing අඩු කළා */
            .header h1 { font-size: 5vw; margin: 0 0 0.5vw 0; font-weight: 900; text-transform: uppercase; }
            .header p { margin: 0.3vw 0; font-size: 2.6vw; }
            .header .branch-name { font-weight: bold; margin-bottom: 0.5vw; }
            
            .contact-info { margin: 0.5vw 0 1vw 0; }
            .contact-info p { margin: 0.2vw 0; font-size: 2.4vw; color: #222; }
            
            .info-section p { margin: 0.3vw 0; }
            
            .divider { border-bottom: 0.3vw dashed #000; margin: 1.5vw 0; }
            
            /* Table Styles - ගොඩක් items වලට ඉඩ එන්න padding අඩු කළා */
            table { width: 100%; border-collapse: collapse; margin-top: 1vw; }
            th { border-bottom: 0.3vw dashed #000; padding-bottom: 1vw; font-size: 2.6vw; text-transform: uppercase; }
            td { padding: 1vw 0; vertical-align: top; }
            .item-name { max-width: 65%; word-wrap: break-word; font-weight: bold; }
            .item-price { font-size: 2.2vw; font-weight: normal; color: #444; }
            
            /* Totals */
            .totals { margin-top: 1.5vw; width: 100%; display: flex; justify-content: flex-end; }
            .totals-table { width: 95%; margin-top: 0; } 
            .totals-table td { padding: 0.8vw 0; }
            .net-total { font-size: 3.5vw; font-weight: bold; border-top: 0.3vw dashed #000; border-bottom: 0.3vw dashed #000; padding: 1.5vw 0 !important; }
            .spacer { height: 1vw; }
            
            .footer { margin-top: 3vw; font-size: 2.6vw; }
            
            /* 🔴 Footer එක පහළටම තල්ලු කරන්න margin-top: auto දුන්නා */
            .brand-footer {
               margin-top: auto; 
               padding-top: 2vw;
               border-top: 0.2vw solid #000;
               text-align: center;
               padding-bottom: 1vw; 
            }
            .brand-footer .brand-name { font-size: 2.8vw; font-weight: bold; letter-spacing: 0.1vw; }
            .brand-footer .brand-sub { font-size: 2.2vw; margin-top: 0.5vw; color: #333; }
          </style>
        </head>
        <body>
          ${allPagesHTML}
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