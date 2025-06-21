
export class ExportUtils {
  static exportToExcel(data: any[], filename: string) {
    // Create CSV content
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static exportToPDF(data: any[], title: string) {
    // Create a simple HTML table for printing
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .date { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => 
              `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="date">Generated on: ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(tableHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  static exportTransactionBill(transaction: any, customer: any, vendor: any, format: 'excel' | 'pdf') {
    const isCustomer = transaction.type === 'sale';
    const client = isCustomer ? customer : vendor;
    
    if (format === 'pdf') {
      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${transaction.invoiceNumber}</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 8px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #007bff; padding-bottom: 20px; }
            .company-name { font-size: 28px; font-weight: bold; color: #007bff; margin-bottom: 5px; }
            .invoice-title { font-size: 24px; color: #333; margin: 20px 0 10px; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .client-info, .invoice-info { flex: 1; }
            .client-info { margin-right: 40px; }
            .info-label { font-weight: bold; color: #555; margin-bottom: 5px; }
            .info-value { color: #333; margin-bottom: 15px; font-size: 16px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th { background: #007bff; color: white; padding: 15px 10px; text-align: left; font-weight: bold; }
            .items-table td { padding: 12px 10px; border-bottom: 1px solid #eee; }
            .items-table tr:nth-child(even) { background: #f8f9fa; }
            .total-row { background: #e3f2fd !important; font-weight: bold; }
            .balance-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .balance-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; }
            .balance-label { font-weight: bold; color: #555; }
            .balance-value { font-weight: bold; color: #333; }
            .current-balance { border-top: 2px solid #007bff; padding-top: 10px; font-size: 18px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
            .amount { text-align: right; }
            .highlight { color: #007bff; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">Inventory Management System</div>
              <div class="invoice-title">${isCustomer ? 'SALES INVOICE' : 'PURCHASE INVOICE'}</div>
            </div>
            
            <div class="invoice-meta">
              <div class="client-info">
                <div class="info-label">${isCustomer ? 'Bill To:' : 'Vendor:'}</div>
                <div class="info-value">${client?.name || 'N/A'}</div>
                <div class="info-label">${isCustomer ? 'Customer ID:' : 'Vendor ID:'}</div>
                <div class="info-value">${client?.uniqueId || 'N/A'}</div>
                <div class="info-label">Phone:</div>
                <div class="info-value">${client?.phoneNo || 'N/A'}</div>
              </div>
              
              <div class="invoice-info">
                <div class="info-label">Invoice Number:</div>
                <div class="info-value highlight">${transaction.invoiceNumber}</div>
                <div class="info-label">Date:</div>
                <div class="info-value">${new Date(transaction.date).toLocaleDateString()}</div>
                <div class="info-label">Time:</div>
                <div class="info-value">${new Date(transaction.date).toLocaleTimeString()}</div>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Product</th>
                  <th style="width: 15%;">Quantity</th>
                  <th style="width: 20%;">Unit Price</th>
                  <th style="width: 25%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${transaction.items.map((item: any) => `
                  <tr>
                    <td>${item.productName}</td>
                    <td class="amount">${item.quantity}</td>
                    <td class="amount">PKR ${(item.price || 0).toFixed(2)}</td>
                    <td class="amount">PKR ${(item.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; font-size: 18px;">TOTAL AMOUNT:</td>
                  <td class="amount" style="font-size: 18px;">PKR ${(transaction.totalAmount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="balance-section">
              <div class="balance-row">
                <span class="balance-label">Previous Balance:</span>
                <span class="balance-value">PKR ${(transaction.previousBalance || 0).toFixed(2)}</span>
              </div>
              <div class="balance-row">
                <span class="balance-label">Current ${isCustomer ? 'Sale' : 'Purchase'}:</span>
                <span class="balance-value">PKR ${(transaction.totalAmount || 0).toFixed(2)}</span>
              </div>
              <div class="balance-row current-balance">
                <span class="balance-label">New Balance:</span>
                <span class="balance-value highlight">PKR ${(transaction.newBalance || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(billHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } else {
      // Excel format
      const data = [
        { Field: 'Invoice Number', Value: transaction.invoiceNumber },
        { Field: 'Date', Value: new Date(transaction.date).toLocaleDateString() },
        { Field: 'Type', Value: isCustomer ? 'Sale' : 'Purchase' },
        { Field: isCustomer ? 'Customer Name' : 'Vendor Name', Value: client?.name || 'N/A' },
        { Field: isCustomer ? 'Customer ID' : 'Vendor ID', Value: client?.uniqueId || 'N/A' },
        { Field: 'Phone', Value: client?.phoneNo || 'N/A' },
        { Field: '', Value: '' }, // Empty row
        { Field: 'ITEMS', Value: '' },
        ...transaction.items.map((item: any, index: number) => ({
          Field: `Item ${index + 1}`,
          Value: `${item.productName} - Qty: ${item.quantity} - Price: PKR ${(item.price || 0).toFixed(2)} - Total: PKR ${(item.totalPrice || 0).toFixed(2)}`
        })),
        { Field: '', Value: '' }, // Empty row
        { Field: 'Previous Balance', Value: `PKR ${(transaction.previousBalance || 0).toFixed(2)}` },
        { Field: 'Current Amount', Value: `PKR ${(transaction.totalAmount || 0).toFixed(2)}` },
        { Field: 'New Balance', Value: `PKR ${(transaction.newBalance || 0).toFixed(2)}` },
      ];
      
      ExportUtils.exportToExcel(data, `Invoice_${transaction.invoiceNumber}`);
    }
  }
}
