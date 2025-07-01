import * as XLSX from "xlsx";
import { Customer, Vendor, Transaction } from "@/store/inventoryStore";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ExportUtils {
  static exportToExcel(data: Record<string, any>[], filename: string, companyName: string = 'Company Name') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  static exportToPDF(data: Record<string, any>[], title: string, subtitle?: string, p0?: { previousCashInHand: number; netChange: number; currentCashInHand: number; }, companyName: string = 'Company Name') {
    const doc = new jsPDF();
    let y = 14;
    // Custom layout for Stock Report
    if (title.toLowerCase().includes('stock report')) {
      doc.setFontSize(16);
      doc.setTextColor('#1a237e');
      doc.text(companyName, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 9;
      doc.setFontSize(12);
      doc.setTextColor('#333');
      doc.text('Stock Report', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 8;
      if (subtitle) {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 7;
      }
      doc.setTextColor(0);
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const rows = data.map(row => columns.map(col => row[col]));
        autoTable(doc, {
          head: [columns],
          body: rows,
          startY: y + 2,
          styles: { fontSize: 11, lineColor: 'black', lineWidth: 0.3 },
          headStyles: { fillColor: "#f2f2f2", textColor: 0, fontStyle: 'bold', lineColor: "black", lineWidth: 0.3 },
          tableLineColor: "black",
          tableLineWidth: 0.3,
        });
      } else {
        doc.text('No data available', 14, y + 10);
      }
      // Add footer
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 15;
      doc.setFontSize(8);
      doc.setTextColor(150);
      // Left: Generated date
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, footerY);
      // Right: Developer info
      doc.text('Software developed by Uzair Ahmed | 03172146698', pageWidth - 14, footerY, { align: 'right' });
      // doc.text('03172146687', pageWidth - 14, footerY + 5, { align: 'right' });
      doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
      return;
    }
    // Custom header for General Ledger
    if (title === 'General Ledger') {
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.setTextColor('#1a237e');
      doc.text(companyName, pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.text('General Ledger', pageWidth / 2, y, { align: 'center' });
      y += 8;
      if (subtitle) {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
        y += 7;
      }
      doc.setTextColor(0);
      if (p0 && typeof p0.currentCashInHand === 'number') {
        doc.setFontSize(11);
        doc.text(`Previous Cash in Hand: PKR ${p0.previousCashInHand.toFixed(2)}`, pageWidth - 14, y + 2, { align: 'right' });
        doc.setTextColor(0);
      }
      y += 2;
      // Table
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const rows = data.map(row => columns.map(col => row[col]));
        autoTable(doc, {
          head: [columns],
          body: rows,
          startY: y + 2,
          styles: { fontSize: 10, lineColor: 'black', lineWidth: 0.5 },
          headStyles: { fillColor: "#f2f2f2", textColor: 'black', lineColor: 'black', lineWidth: 0.5 },
          theme: 'grid',
          didDrawPage: function (dataTable) {
            // After table, add current cash in hand only
            const finalY = dataTable.cursor.y + 8;
            if (p0 && typeof p0.currentCashInHand === 'number') {
              doc.setFontSize(11);
              doc.setTextColor(0);
              doc.text(`Current Cash in Hand: PKR ${p0.currentCashInHand.toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });
              doc.setTextColor(0);
            }
          }
        });
      } else {
        doc.text('No data available', 14, y + 10);
      }
      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 15;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, footerY);
      doc.text('Software developed by Uzair Ahmed | 03172146698', pageWidth - 14, footerY, { align: 'right' });
      doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
      return;
    }
    // Default layout for other reports
    doc.setFontSize(16);
    doc.text(title, 14, y);
    y += 8;
    if (subtitle) {
      doc.setFontSize(9);
      doc.text(subtitle, 14, y);
      y += 6;
    }
    // Show cash in hand summary if provided
       if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const rows = data.map(row => columns.map(col => row[col]));
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: y + 2,
        styles: { fontSize: 10 },
        headStyles: { fillColor: "#f2f2f2" },
      });
    } else {
      doc.text('No data available', 14, y + 10);
    }
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  }

  static exportTransactionBill(transaction: Transaction, customer: Customer | null, vendor: Vendor | null, format: 'excel' | 'pdf', companyName: string = 'Company Name') {
    let client: Customer | Vendor | null = null;
    let clientType = '';
    if (transaction.type === 'sale' || (transaction.type === 'return' && transaction.customer_name)) {
      client = customer || (transaction.customer_name ? { id: '', uniqueId: '', name: transaction.customer_name, phoneNo: '', balance: 0, createdAt: null } : null);
      clientType = 'Customer';
    } else if (transaction.type === 'purchase' || (transaction.type === 'return' && transaction.vendor_name)) {
      client = vendor || (transaction.vendor_name ? { id: '', uniqueId: '', name: transaction.vendor_name, phoneNo: '', balance: 0, createdAt: null } : null);
      clientType = 'Vendor';
    }
    // --- Set filename as name-invoiceNo ---
    const safeName = (client?.name || 'Unknown').replace(/\s+/g, '');
    const invoiceNo = transaction.invoiceNumber || 'INV';
    const fileBase = `${safeName}-${invoiceNo}`;
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
            .footer { font-size:8px;clear: both;display:flex;justify-content:space-between; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; color: #666; }
            .highlight { color: #007bff; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">${companyName}</div>
              <div class="invoice-title">${transaction.type === 'sale' ? 'SALES INVOICE' : transaction.type === 'return' ? 'RETURN INVOICE' : 'PURCHASE INVOICE'}</div>
            </div>
            <div class="invoice-meta">
              <div class="client-info">
                <div class="info-label">${clientType}:</div>
                <div class="info-value">${client?.name || 'N/A'}</div>
                <div class="info-label">Date:</div>
                <div class="info-value">${new Date(transaction.date).toLocaleDateString()}</div>
              </div>
              <div class="invoice-info">
                <div class="info-label">Invoice Number:</div>
                <div class="info-value highlight">${transaction.invoiceNumber}</div>
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
                    <td class="amount"> ${Number(item.price || 0).toFixed(2)}</td>
                    <td class="amount"> ${Number(item.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td class="summary-label">Previous Balance:</td>
                  <td class="amount"> ${Number(transaction.previousBalance || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td class="summary-label">Current Bill:</td>
                  <td class="amount"> ${Number(transaction.totalAmount || 0).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="border: none;"></td>
                  <td class="summary-label">Total Balance:</td>
                  <td class="amount highlight"> ${Number(transaction.newBalance || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
            <p style="font-size: 8px;">Generated on: ${new Date().toLocaleString()}</p>
            <div>
              <p>Software developer by Uzair Ahmed | 03172146698</p>
              
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
          printWindow.document.title = fileBase + '.pdf';
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
        { Field: '', Value: '' }, // Empty row
        { Field: 'ITEMS', Value: '' },
        ...transaction.items.map((item, index: number) => ({
          Field: `Item ${index + 1}`,
          Value: `${item.productName} - Qty: ${item.quantity} - Price: ${Number(item.price || 0).toFixed(2)} - Total: PKR ${Number(item.totalPrice || 0).toFixed(2)}`
        })),
        { Field: '', Value: '' }, // Empty row
        { Field: 'Previous Balance', Value: `${Number(transaction.previousBalance || 0).toFixed(2)}` },
        { Field: 'Current Amount', Value: ` ${Number(transaction.totalAmount || 0).toFixed(2)}` },
        { Field: 'New Balance', Value: `${Number(transaction.newBalance || 0).toFixed(2)}` },
      ];
      
      ExportUtils.exportToExcel(data, fileBase);
    }
  }

  static exportOutstandingLedgerPDF(data: Record<string, any>[], options: { title: string, dateRange?: string, companyName?: string, fileName?: string }) {
    const { title, dateRange, companyName = 'Company Name', fileName = 'Outstanding_Balances' } = options;
    const doc = new jsPDF();
    let y = 14;
    doc.setFontSize(16);
    doc.setTextColor('#1a237e');
    doc.text(companyName, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 8;
    if (dateRange) {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Date Range: ${dateRange}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center'});
      y += 7;
    }
    doc.setTextColor(0);
    if (data.length > 0) {
      let columns: string[];
      let rows: any[][];
      if (title.toLowerCase().includes('outstanding')) {
        columns = ['Name', 'Phone No', 'Outstanding Balance'];
        rows = data.map(row => [row['Name'], row['Phone No'], `${Number(row['Outstanding Balance']).toFixed(2)}`]);
        // Calculate total
        const total = data.reduce((sum, row) => sum + Number(row['Outstanding Balance']), 0);
        rows.push([
          { content: 'Total Balance', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `${total.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'center' } }
        ]);
      } else {
        // Use dynamic columns for other reports (like Expenses)
        columns = Object.keys(data[0]);
        rows = data.map(row => columns.map(col => row[col]));
      }
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: y + 2,
        styles: { fontSize: 9, lineColor: "black", lineWidth: 0.3 },
        headStyles: { fillColor: '#f2f2f2', textColor: 'black', halign: 'center' },
        bodyStyles: { halign: 'center' },
        tableLineColor: 'black',
        tableLineWidth: 0.5,
        theme: 'grid',
        didDrawPage: function (data) {
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageWidth = doc.internal.pageSize.getWidth();
          const leftText = `Generated: ${new Date().toLocaleString()}`;
          const rightText1 = 'Software developed by Uzair Ahmed | 03172146698';
          doc.setFontSize(8);
          doc.setTextColor(150); // Set grey color
          doc.text(leftText, 14, pageHeight - 10, { align: 'left' });
          doc.setTextColor(150); // Reset to gray
          doc.text(rightText1, pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
      });
    } else {
      doc.text('No data available', doc.internal.pageSize.getWidth() / 2, y + 10, { align: 'center' });
    }
    doc.save(`${fileName}.pdf`);
  }
}
