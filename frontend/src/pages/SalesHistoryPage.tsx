import { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Sale, SalesListResponse } from '../types';
import { printInvoiceReceipt } from '../utils/invoice';
import { useAuth } from '../context/AuthContext';

type InvoiceData = {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: Sale['items'];
  subTotal: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  notes?: string;
  voided?: boolean;
};

const ITEMS_PER_PAGE = 10;

function SalesHistoryPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'card'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceError, setInvoiceError] = useState('');

  const loadSales = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<SalesListResponse>('/sales', { params: { page: 1, limit: 200 } });
      setSales(response.data.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const createdByName = (createdBy: Sale['createdBy']) =>
    typeof createdBy === 'string' ? createdBy : createdBy?.name || 'Unknown';

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (paymentFilter !== 'all' && sale.paymentMethod !== paymentFilter) return false;

      const saleDate = new Date(sale.createdAt);
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (saleDate < from) return false;
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`);
        if (saleDate > to) return false;
      }

      return true;
    });
  }, [sales, paymentFilter, fromDate, toDate]);

  const totalPages = Math.max(Math.ceil(filteredSales.length / ITEMS_PER_PAGE), 1);

  const paginatedSales = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSales, page]);

  useEffect(() => {
    setPage(1);
  }, [paymentFilter, fromDate, toDate]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);


  const printInvoice = () => {
    if (!invoiceData) return;
    const failureMessage = printInvoiceReceipt(invoiceData);
    if (failureMessage) setInvoiceError(failureMessage);
  };


  const csvValue = (value: string | number | null | undefined) => {
    const raw = value === null || value === undefined ? '' : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const exportSalesCsv = () => {
    const headers = [
      'Invoice',
      'Date',
      'Payment Method',
      'Customer',
      'Phone',
      'Grand Total',
      'Gross Profit',
      'Margin %',
      'Created By'
    ];

    const rows = filteredSales.map((sale) => [
      sale.invoiceNumber,
      new Date(sale.createdAt).toISOString(),
      sale.paymentMethod,
      sale.customerName || '',
      sale.customerPhone || '',
      sale.grandTotal.toFixed(2),
      (sale.grossProfit || 0).toFixed(2),
      (sale.margin || 0).toFixed(2),
      createdByName(sale.createdBy)
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => csvValue(cell)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `sales-history-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const voidSale = async (sale: Sale) => {
    const reason = window.prompt(
      `Void invoice ${sale.invoiceNumber}?\n\nThis restores stock for every item on this sale and removes it from revenue totals. This cannot be undone.\n\nOptional reason:`
    );
    if (reason === null) return;

    setVoidingId(sale._id);
    setError('');
    try {
      await api.post(`/sales/${sale._id}/void`, { reason });
      await loadSales();
      if (selectedSale?._id === sale._id) setSelectedSale(null);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to void sale.');
    } finally {
      setVoidingId(null);
    }
  };

  const openInvoice = async (saleId: string) => {
    setInvoiceLoading(true);
    setInvoiceError('');
    setInvoiceData(null);
    try {
      const response = await api.get<InvoiceData>(`/sales/${saleId}/invoice`);
      setInvoiceData(response.data);
    } catch (requestError: any) {
      setInvoiceError(requestError?.response?.data?.error || requestError?.message || 'Failed to load invoice.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <div className="sales-history-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Sales History</h1>
        <p>Audit previous sales, search by date, and view detailed invoices.</p>
      </header>

      <section className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Filter Records</h2>
          <div className="action-row">
            <button type="button" className="btn btn-outline" onClick={exportSalesCsv} disabled={loading || filteredSales.length === 0} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export CSV
            </button>
            <button type="button" className="btn btn-light" onClick={loadSales} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="history-filters" style={{ marginTop: '1rem' }}>
          <label>
            Payment Method
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as 'all' | 'cash' | 'upi' | 'card')} style={{ textTransform: 'capitalize' }}>
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </label>

          <label>
            From Date
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>

          <label>
            To Date
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
      </section>

      {error && <p className="error-text" style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '1.5rem' }}>{error}</p>}

      <section className="panel">
        <div className="table-container mobile-stack-table">
          <table>
            <thead>
              <tr>
                <th>Invoice Info</th>
                <th>Payment</th>
                <th>Financials</th>
                <th>Created By</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading sales records...
                  </td>
                </tr>
              ) : paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>
                    No sales found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr key={sale._id} style={sale.voided ? { opacity: 0.6 } : undefined}>
                    <td data-label="Invoice Info">
                      <div style={{ fontWeight: 600 }}>{sale.invoiceNumber}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>{new Date(sale.createdAt).toLocaleString()}</div>
                    </td>
                    <td data-label="Payment">
                      <span className="status-pill" style={{ background: '#f8fafc', color: '#475569', textTransform: 'capitalize' }}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td data-label="Financials">
                      <div style={{ fontWeight: 700, textDecoration: sale.voided ? 'line-through' : 'none' }}>₹{sale.grandTotal.toFixed(0)}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>Profit: ₹{(sale.grossProfit || 0).toFixed(0)} ({(sale.margin || 0).toFixed(1)}%)</div>
                    </td>
                    <td data-label="Created By" className="muted" style={{ fontSize: '0.875rem' }}>{createdByName(sale.createdBy)}</td>
                    <td data-label="Status" style={{ textAlign: 'center' }}>
                      {sale.voided ? (
                        <span className="status-pill status-inactive" style={{ fontSize: '0.7rem' }} title={sale.voidReason || undefined}>Voided</span>
                      ) : (
                        <span className="status-pill status-active" style={{ fontSize: '0.7rem' }}>Completed</span>
                      )}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div className="action-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setSelectedSale(sale)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                          Details
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => openInvoice(sale._id)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                          Invoice
                        </button>
                        {user?.role === 'owner' && !sale.voided && (
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => voidSale(sale)}
                            disabled={voidingId === sale._id}
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                          >
                            {voidingId === sale._id ? 'Voiding...' : 'Void'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-row" style={{ padding: '1rem 0 0 0', borderTop: '1px solid #f1f5f9' }}>
          <p className="muted" style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>Page {page} of {totalPages}</p>
          <div className="action-row">
            <button type="button" className="btn btn-outline" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1} style={{ padding: '0.4rem 0.8rem' }}>
              Previous
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} disabled={page >= totalPages} style={{ padding: '0.4rem 0.8rem' }}>
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedSale && (
        <section className="modal-backdrop" role="presentation" onClick={() => setSelectedSale(null)}>
          <article className="modal-card" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h3>Sale Details</h3>
              <button className="btn btn-light" type="button" onClick={() => setSelectedSale(null)}>Close</button>
            </div>
            {selectedSale.voided && (
              <p className="error-text" style={{ fontWeight: 700 }}>
                VOIDED{selectedSale.voidReason ? ` — ${selectedSale.voidReason}` : ''}
              </p>
            )}
            <p><strong>Invoice:</strong> {selectedSale.invoiceNumber}</p>
            <p><strong>Customer:</strong> {selectedSale.customerName || '-'}</p>
            <p><strong>Phone:</strong> {selectedSale.customerPhone || '-'}</p>
            <p><strong>Payment:</strong> {selectedSale.paymentMethod}</p>
            <p><strong>Sub Total:</strong> ₹{selectedSale.subTotal.toFixed(2)}</p>
            <p><strong>Discount:</strong> ₹{selectedSale.discount.toFixed(2)}</p>
            <p><strong>GST:</strong> ₹{selectedSale.gstAmount.toFixed(2)} ({selectedSale.gstRate}%)</p>
            <p><strong>Grand Total:</strong> ₹{selectedSale.grandTotal.toFixed(2)}</p>
            <p><strong>Gross Profit:</strong> ₹{(selectedSale.grossProfit || 0).toFixed(2)}</p>
            <p><strong>Margin:</strong> {(selectedSale.margin || 0).toFixed(2)}%</p>
            <h4>Items</h4>
            <ul className="modal-items-list">
              {selectedSale.items.map((item) => (
                <li key={`${selectedSale._id}-${item.productId}`}>
                  {item.productName} ({item.quantity} × ₹{item.unitPrice.toFixed(2)}) = ₹{item.lineTotal.toFixed(2)}
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {(invoiceLoading || invoiceData || invoiceError) && (
        <section className="modal-backdrop" role="presentation" onClick={() => { setInvoiceData(null); setInvoiceError(''); }}>
          <article className="modal-card" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h3>Invoice</h3>
              <div className="action-row">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={printInvoice}
                  disabled={!invoiceData || invoiceLoading}
                >
                  Print
                </button>
                <button className="btn btn-light" type="button" onClick={() => { setInvoiceData(null); setInvoiceError(''); }}>
                  Close
                </button>
              </div>
            </div>

            {invoiceLoading && <p>Loading invoice...</p>}
            {!invoiceLoading && invoiceError && <p className="error-text">{invoiceError}</p>}

            {!invoiceLoading && invoiceData && (
              <div>
                {invoiceData.voided && <p className="error-text" style={{ fontWeight: 700 }}>VOIDED — this sale no longer counts toward revenue.</p>}
                <p><strong>Invoice #:</strong> {invoiceData.invoiceNumber}</p>
                <p><strong>Date:</strong> {new Date(invoiceData.createdAt).toLocaleString()}</p>
                <p><strong>Customer:</strong> {invoiceData.customerName || '-'}</p>
                <p><strong>Phone:</strong> {invoiceData.customerPhone || '-'}</p>
                <p><strong>Payment:</strong> {invoiceData.paymentMethod}</p>
                <h4>Items</h4>
                <ul className="modal-items-list">
                  {invoiceData.items.map((item) => (
                    <li key={`invoice-${invoiceData.invoiceNumber}-${item.productId}`}>
                      {item.productName} ({item.quantity} × ₹{item.unitPrice.toFixed(2)}) = ₹{item.lineTotal.toFixed(2)}
                    </li>
                  ))}
                </ul>
                <p><strong>Sub Total:</strong> ₹{invoiceData.subTotal.toFixed(2)}</p>
                <p><strong>Discount:</strong> ₹{invoiceData.discount.toFixed(2)}</p>
                <p><strong>GST:</strong> ₹{invoiceData.gstAmount.toFixed(2)} ({invoiceData.gstRate}%)</p>
                <h3>Total: ₹{invoiceData.grandTotal.toFixed(2)}</h3>
              </div>
            )}
          </article>
        </section>
      )}
    </div>
  );
}

export default SalesHistoryPage;
