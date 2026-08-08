import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Product, ProductListResponse, StockAdjustment, StockAdjustmentListResponse, StockAdjustmentReason } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';

const reasons: StockAdjustmentReason[] = ['damaged', 'expired', 'count_correction', 'theft', 'return', 'other'];
const PAGE_SIZE = 15;

function StockAdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [productId, setProductId] = useState('');
  const [quantityChange, setQuantityChange] = useState('');
  const [reason, setReason] = useState<StockAdjustmentReason>('count_correction');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAdjustments = async (targetPage: number = page) => {
    const adjustmentsRes = await api.get<StockAdjustmentListResponse>('/stock-adjustments', { params: { page: targetPage, limit: PAGE_SIZE } });
    setAdjustments(adjustmentsRes.data.data);
    setTotalPages(adjustmentsRes.data.pagination.totalPages);
    setPage(adjustmentsRes.data.pagination.page);
  };

  const loadData = async (targetPage: number = 1) => {
    const [productsRes] = await Promise.all([
      api.get<ProductListResponse>('/products', { params: { page: 1, limit: 100 } }),
      loadAdjustments(targetPage)
    ]);
    setProducts(productsRes.data.data);
  };

  const goToPage = async (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    if (clamped === page) return;
    setLoading(true);
    setError('');
    try {
      await loadAdjustments(clamped);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to load stock adjustments.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadData(1);

        const params = new URLSearchParams(window.location.search);
        const pid = params.get('productId');
        if (pid) {
          setProductId(pid);
          setNotice('Product pre-selected from scanner.');
        }
      } catch (requestError: any) {
        setError(getErrorMessage(requestError, 'Failed to load stock adjustments.'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const totalAdjusted = useMemo(
    () => adjustments.reduce((sum, item) => sum + item.quantityChange, 0),
    [adjustments]
  );

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const delta = Number(quantityChange);
    if (!productId) return setError('Product is required.');
    if (!delta || Number.isNaN(delta)) return setError('Quantity change must be a non-zero number.');

    setLoading(true);
    try {
      await api.post('/stock-adjustments', {
        productId,
        quantityChange: delta,
        reason,
        notes: notes.trim() || undefined
      });
      setNotice('Stock adjusted successfully.');
      setQuantityChange('');
      setNotes('');
      setReason('count_correction');
      await loadData(1);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to adjust stock.'));
    } finally {
      setLoading(false);
    }
  };

  const productLabel = (entry: StockAdjustment['productId']) =>
    typeof entry === 'string' ? entry : `${entry.name} (${entry.sku})`;

  const userLabel = (entry: StockAdjustment['createdBy']) =>
    typeof entry === 'string' ? entry : entry.name || entry.email || 'Unknown';

  return (
    <main className="app">
      <header>
        <h1>Stock Adjustments</h1>
        <p>Record manual stock corrections for damaged, expired or counted inventory differences.</p>
      </header>

      {error && <p className="error-text">{error}</p>}
      {notice && <p className="success-text">{notice}</p>}

      <section className="purchases-layout">
        <article className="panel">
          <h2>Add Adjustment</h2>
          <form className="form-grid" onSubmit={submitAdjustment}>
            <label>
              Product *
              <select value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.sku}) - stock {product.stock}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity Change *
              <input
                type="number"
                value={quantityChange}
                onChange={(event) => setQuantityChange(event.target.value)}
                placeholder="Use + for add, - for reduce"
                required
              />
            </label>
            <label>
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value as StockAdjustmentReason)}>
                {reasons.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <label className="full-width">
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context" />
            </label>
            <div className="form-actions full-width">
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Adjustment'}</button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Adjustment History</h2>
            <button type="button" className="btn btn-light" onClick={() => loadAdjustments(page)} disabled={loading}>Refresh</button>
          </div>
          <p className="muted"><strong>Net stock change (this page):</strong> {totalAdjusted >= 0 ? '+' : ''}{totalAdjusted}</p>
          <div className="table-container mobile-stack-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Change</th>
                  <th>Reason</th>
                  <th>Created By</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr><td colSpan={5} className="muted">No adjustments recorded yet.</td></tr>
                ) : (
                  adjustments.map((entry) => (
                    <tr key={entry._id}>
                      <td data-label="Date">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td data-label="Product">{productLabel(entry.productId)}</td>
                      <td data-label="Change">{entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}</td>
                      <td data-label="Reason">{entry.reason}</td>
                      <td data-label="Created By">{userLabel(entry.createdBy)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-row" style={{ padding: '1rem 0 0 0', borderTop: '1px solid #f1f5f9' }}>
            <p className="muted" style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>Page {page} of {totalPages}</p>
            <div className="action-row">
              <button type="button" className="btn btn-outline" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading} style={{ padding: '0.4rem 0.8rem' }}>
                Previous
              </button>
              <button type="button" className="btn btn-outline" onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading} style={{ padding: '0.4rem 0.8rem' }}>
                Next
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

export default StockAdjustmentsPage;
