import { SaleItem } from '../types';

export type PrintableInvoice = {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: SaleItem[];
  subTotal: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card';
};

export function printInvoiceReceipt(invoice: PrintableInvoice): string | null {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    return 'Unable to open print window. Please allow pop-ups and try again.';
  }

  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #d0d7de;">${item.productName}</td>
          <td style="padding:8px;border:1px solid #d0d7de;">${item.quantity}</td>
          <td style="padding:8px;border:1px solid #d0d7de;">₹${item.unitPrice.toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #d0d7de;">₹${item.lineTotal.toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1, h2, h3, p { margin: 0 0 10px; }
          .meta { margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; }
          th, td { text-align: left; }
          th { padding: 8px; border: 1px solid #d0d7de; background: #f8fafc; }
          .totals p { margin: 4px 0; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <h2>Sales Invoice</h2>
        <div class="meta">
          <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${invoice.customerName || '-'}</p>
          <p><strong>Phone:</strong> ${invoice.customerPhone || '-'}</p>
          <p><strong>Payment:</strong> ${invoice.paymentMethod}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <p><strong>Sub Total:</strong> ₹${invoice.subTotal.toFixed(2)}</p>
          <p><strong>Discount:</strong> ₹${invoice.discount.toFixed(2)}</p>
          <p><strong>GST:</strong> ₹${invoice.gstAmount.toFixed(2)} (${invoice.gstRate}%)</p>
          <h3>Total: ₹${invoice.grandTotal.toFixed(2)}</h3>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return null;
}
