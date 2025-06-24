import * as XLSX from "xlsx";
import { Customer, Vendor, Transaction } from "@/store/inventoryStore";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { log } from "console";

export class ExportUtils {
  static exportToExcel(data: Record<string, any>[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  static exportToPDF(data: Record<string, any>[], title: string, subtitle?: string) {
    const doc = new jsPDF();
    let y = 14;
    doc.setFontSize(16);
    doc.text(title, 14, y);
    y += 8;
    if (subtitle) {
      doc.setFontSize(12);
      doc.text(subtitle, 14, y);
      y += 6;
    }
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const rows = data.map(row => columns.map(col => row[col]));
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: y + 2,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [40, 167, 69] },
      });
    } else {
      doc.text('No data available', 14, y + 10);
    }
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  }

  static exportTransactionBill(transaction: Transaction, customer: Customer | null, vendor: Vendor | null, format: 'excel' | 'pdf') {
    console.log("Vendor",vendor);
    
    let client: Customer | Vendor;
    let clientType = '';
    console.log("Client:",client);
    
    if (transaction.type === 'sale' || (transaction.type === 'return' && transaction.customerId)) {
      client = customer;
      console.log("Client:",client);
      clientType = 'Customer';
    } else if (transaction.type === 'purchase' || (transaction.type === 'return' && transaction.vendorId)) {
      client = vendor;
      console.log("Client:",client);
      clientType = 'Vendor';
    }
    if (format === 'pdf') {
      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${transaction.invoiceNumber}</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 8px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .company-name { font-size: 22px; font-weight: bold; color: #007bff; margin-bottom: 2px; }
            .invoice-title { font-size: 18px; color: #333; margin: 10px 0 5px; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .client-info, .invoice-info { flex: 1; }
            .client-info { margin-right: 20px; }
            .info-label { font-weight: bold; color: #555; margin-bottom: 1px; }
            .info-value { color: #333; margin-bottom: 3px; font-size: 14px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 0px 0; }
            .items-table th, .items-table td { border: 1px solid #333; padding: 3px 5px; text-align: left; font-size: 13px; }
            .items-table th { background: #007bff; color: white; font-weight: bold; }
            .items-table td.amount { text-align: right; }
            .items-table tr:nth-child(even) { background: #f8f9fa; }
            .total-row { background: #e3f2fd !important; font-weight: bold; }
            .footer { font-size:11px;clear: both;display:flex;justify-content:space-between; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; color: #666; }
            .highlight { color: #007bff; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">Company Name</div>
              <div class="invoice-title">${transaction.type === 'sale' ? 'SALES INVOICE' : transaction.type === 'return' ? 'RETURN INVOICE' : 'PURCHASE INVOICE'}</div>
            </div>
            <div class="invoice-meta">
              <div class="client-info">
                <div class="info-label">${clientType}:</div>
                <div class="info-value">${client?.name || 'N/A'}</div>
                <div class="info-label">${clientType} ID:</div>
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
                  <th style="width: 8%;">S.No</th>
                  <th style="width: 40%;">Product</th>
                  <th style="width: 15%;">Quantity</th>
                  <th style="width: 20%;">Unit Price</th>
                  <th style="width: 17%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${transaction.items.map((item, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.productName}</td>
                    <td class="amount">${item.quantity}</td>
                    <td class="amount"> ${(item.price || 0).toFixed(2)}</td>
                    <td class="amount"> ${(item.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td class="summary-label">Previous Balance:</td>
                  <td class="amount"> ${(transaction.previousBalance || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td class="summary-label">Current Bill:</td>
                  <td class="amount"> ${(transaction.totalAmount || 0).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="border: none;"></td>
                  <td class="summary-label">Total Balance:</td>
                  <td class="amount highlight"> ${(transaction.newBalance || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
            <p style="font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
            <div>
              <p>Software developer by Uzair Ahmed</p>
              <p>03172146698</p>
              </div>
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
        { Field: 'Type', Value: transaction.type === 'sale' ? 'Sale' : transaction.type === 'return' ? 'Return' : 'Purchase' },
        { Field: `${clientType} Name`, Value: client?.name || 'N/A' },
        { Field: `${clientType} ID`, Value: client?.uniqueId || 'N/A' },
        { Field: 'Phone', Value: client?.phoneNo || 'N/A' },
        { Field: '', Value: '' }, // Empty row
        { Field: 'ITEMS', Value: '' },
        ...transaction.items.map((item, index: number) => ({
          Field: `Item ${index + 1}`,
          Value: `${item.productName} - Qty: ${item.quantity} - Price: ${(item.price || 0).toFixed(2)} - Total: PKR ${(item.totalPrice || 0).toFixed(2)}`
        })),
        { Field: '', Value: '' }, // Empty row
        { Field: 'Previous Balance', Value: `${(transaction.previousBalance || 0).toFixed(2)}` },
        { Field: 'Current Amount', Value: ` ${(transaction.totalAmount || 0).toFixed(2)}` },
        { Field: 'New Balance', Value: `${(transaction.newBalance || 0).toFixed(2)}` },
      ];
      
      ExportUtils.exportToExcel(data, `Invoice_${transaction.invoiceNumber}`);
    }
  }
}
