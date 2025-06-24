import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, X } from 'lucide-react';
import { ExportUtils } from '@/utils/exportUtils';
import { CompletedPayment } from '@/types';

interface PaymentSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: CompletedPayment | null;
}

export const PaymentSuccessDialog: React.FC<PaymentSuccessDialogProps> = ({ isOpen, onClose, payment }) => {
  const [mode, setMode] = useState('Cash');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [givenBy, setGivenBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  if (!isOpen || !payment) return null;

  const handleDownload = (format: 'pdf' | 'excel') => {
    // Make Giver and Receiver mandatory
    if (!givenBy.trim() || !receivedBy.trim()) {
      alert('Please enter both Giver and Receiver name before downloading the receipt.');
      return;
    }
    // Prepare values for the receipt
    const cash = mode === 'Cash' ? payment?.amount || 0 : '';
    const cheque = mode === 'Cheque' ? payment?.amount || 0 : '';
    const chequeNoVal = mode === 'Cheque' ? chequeNo : '';
    const chequeBankVal = mode === 'Cheque' ? chequeBank : '';
    const customerName = payment?.entity?.name || '-';
    const phone = payment?.entity?.phoneNo || '-';
    // Always get invoice number from payment.invoiceNumber
    const invoiceNumber = (payment as any).invoiceNumber? (payment as any).invoiceNumber : '-';
    const remainingBalance = (payment as any)?.remainingBalance !== undefined ? (payment as any).remainingBalance : '-';
    const givenByVal = givenBy || '-';
    const receivedByVal = receivedBy || '-';
    const dateVal = payment ? new Date(payment.date).toLocaleDateString() : '-';
    if (!isOpen || !payment) return null;
console.log('Payment object:', payment); // Debug log
    // Previous/Current/New balance logic
    let previousBalance = '-';
    let newBalance = '-';
    if ((payment as any)?.previousBalance !== undefined) {
      previousBalance = String((payment as any).previousBalance);
    } else if (payment?.entity && typeof payment.entity.balance === 'number' && typeof payment.amount === 'number') {
      previousBalance = String(payment.entity.balance); // fallback: before payment
    }
    if ((payment as any)?.newBalance !== undefined) {
      newBalance = String((payment as any).newBalance);
    } else if (payment?.entity && typeof payment.entity.balance === 'number') {
      newBalance = String(payment.entity.balance - payment.amount);
    }

    if (format === 'pdf') {
      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 8px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .company-name { font-size: 22px; font-weight: bold; color: #007bff; margin-bottom: 2px; }
            .invoice-title { font-size: 18px; color: #333; margin: 10px 0 5px; }
            .meta-table { width: 100%; margin-bottom: 10px; }
            .meta-table td { padding: 4px 8px; font-size: 14px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .items-table th, .items-table td { border: 1px solid #333; padding: 3px 5px; text-align: left; font-size: 13px; }
            .items-table th { background: #007bff; color: white; font-weight: bold; }
            .footer { font-size:11px;clear: both;display:flex;justify-content:space-between; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; color: #666; }
            .highlight { color: #007bff; font-weight: bold; }
            .summary-table { width: 100%; border-collapse: collapse; }
            .summary-table td { border: 1px solid #333; padding: 4px 8px; font-size: 14px; }
            .summary-label { font-weight: bold; text-align: left; }
            .summary-value { text-align: right; }
            .summary-total { font-weight: bold; color: #007bff; text-align: right; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">Company Name</div>
              <div class="invoice-title">PAYMENT RECEIPT</div>
            </div>
            <table class="meta-table">
              <tr><td><b>Given By:</b></td><td>${givenByVal}</td><td><b>Received By:</b></td><td>${receivedByVal}</td></tr>
              <tr><td><b>Invoice No:</b></td><td>${invoiceNumber}</td><td><b>Date:</b></td><td>${dateVal}</td></tr>
            </table>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Cash</th>
                  <th>Cheque</th>
                  <th>Cheque No</th>
                  <th>Bank</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${customerName}</td>
                  <td>${phone}</td>
                  <td>${cash ?Number(cash).toFixed(2) : '-'}</td>
                  <td>${cheque ?+ Number(cheque).toFixed(2) : '-'}</td>
                  <td>${chequeNoVal || '-'}</td>
                  <td>${chequeBankVal || '-'}</td>
                  <td>${payment ? Number(payment.amount).toFixed(2) : '-'}</td>
                </tr>
                <tr>
                  <td colspan="4" style="border:none;"></td>
                  <td colspan="3" style="padding:0; border:none;">
                    <table class="summary-table">
                      <tr>
                        <td class="summary-label">Previous Balance:</td>
                        <td class="summary-value">${previousBalance !== '-' ? Number(previousBalance).toFixed(2) : '-'}</td>
                      </tr>
                      <tr>
                        <td class="summary-label">Current Payment:</td>
                        <td class="summary-value">${payment ? Number(payment.amount).toFixed(2) : '-'}</td>
                      </tr>
                      <tr>
                        <td class="summary-label">New Balance:</td>
                        <td class="summary-total">${newBalance !== '-' ? Number(newBalance).toFixed(2) : '-'}</td>
                      </tr>
                    </table>
                  </td>
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
      const data = [
        {
          'Invoice No': invoiceNumber,
          'Customer Name': customerName,
          'Phone': phone,
          'Cash': cash,
          'Cheque': cheque,
          'Cheque No': chequeNoVal,
          'Bank': chequeBankVal,
          'Amount': payment ? payment.amount : '',
          'Previous Balance': previousBalance,
          'Current Payment': payment ? payment.amount : '',
          'New Balance': newBalance,
        },
      ];
      ExportUtils.exportToExcel(data, 'Payment_Receipt');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">
              Payment Receipt
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-right text-sm font-semibold text-blue-700">
            Invoice Number: {payment.invoiceNumber ? payment.invoiceNumber : '-'}
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <table className="w-full text-sm border border-green-200 rounded">
              <tbody>
                <tr>
                  <td className="font-semibold p-2 w-1/3">Given By</td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-full" value={givenBy} onChange={e => setGivenBy(e.target.value)} placeholder="Enter payer name" /></td>
                </tr>
                <tr>
                  <td className="font-semibold p-2">Received By</td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-full" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Enter receiver name" /></td>
                </tr>
                <tr>
                  <td className="font-semibold p-2">Date</td>
                  <td className="p-2">{new Date(payment.date).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td className="font-semibold p-2">Mode of Payment</td>
                  <td className="p-2">
                    <select className="border rounded px-2 py-1" value={mode} onChange={e => setMode(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </td>
                </tr>
                {mode === 'Cheque' && (
                  <>
                    <tr>
                      <td className="font-semibold p-2">Cheque No</td>
                      <td className="p-2"><input className="border rounded px-2 py-1 w-full" value={chequeNo} onChange={e => setChequeNo(e.target.value)} placeholder="Enter cheque number" /></td>
                    </tr>
                    <tr>
                      <td className="font-semibold p-2">Bank</td>
                      <td className="p-2"><input className="border rounded px-2 py-1 w-full" value={chequeBank} onChange={e => setChequeBank(e.target.value)} placeholder="Enter bank name" /></td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="font-semibold p-2">Name</td>
                  <td className="p-2">{payment.entity?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="font-semibold p-2">Phone</td>
                  <td className="p-2">{payment.entity?.phoneNo || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="font-semibold p-2">Amount</td>
                  <td className="p-2 font-bold text-green-700">PKR {Number(payment.amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="font-semibold p-2">Notes</td>
                  <td className="p-2">{payment.notes || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Download Receipt:</p>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleDownload('pdf')}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => handleDownload('excel')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}; 