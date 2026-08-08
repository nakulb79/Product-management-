import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Product, ProductListResponse, Purchase, PurchaseListResponse } from '../types';
import { ErrorBanner, SuccessBanner } from '../components/Banner';
import TableStatusRow from '../components/TableStatusRow';
import { getErrorMessage } from '../utils/getErrorMessage';

type DraftItem = {
  productId: string;
  quantity: string;
  costPrice: string;
};

const PAGE_SIZE = 10;

function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [draftItem, setDraftItem] = useState<DraftItem>({ productId: '', quantity: '1', costPrice: '' });
  const [items, setItems] = useState<Array<{ product: Product; quantity: number; costPrice: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProducts = async () => {
    const response = await api.get<ProductListResponse>('/products', { params: { page: 1, limit: 100 } });
    setProducts(response.data.data);
  };

  const loadPurchases = async (targetPage: number = page) => {
    const response = await api.get<PurchaseListResponse>('/purchases', { params: { page: targetPage, limit: PAGE_SIZE } });
    setPurchases(response.data.data);
    setTotalPages(response.data.pagination.totalPages);
    setPage(response.data.pagination.page);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadProducts(), loadPurchases(1)]);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to load purchases module.'));
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    if (clamped === page) return;
    setLoading(true);
    setError('');
    try {
      await loadPurchases(clamped);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to load purchases.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([loadProducts(), loadPurchases(1)]);

        const params = new URLSearchParams(window.location.search);
        const productId = params.get('productId');
        if (productId) {
          setDraftItem(prev => ({ ...prev, productId }));
          setNotice('Product pre-selected from scanner.');
        }
      } catch (requestError: any) {
        setError(getErrorMessage(requestError, 'Failed to load purchases module.'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const addItem = () => {
    setError('');
    const product = products.find((p) => p._id === draftItem.productId);
    const quantity = Number(draftItem.quantity);
    const costPrice = Number(draftItem.costPrice);

    if (!product) return setError('Please select a product.');
    if (!quantity || quantity < 1) return setError('Quantity must be at least 1.');
    if (Number.isNaN(costPrice) || costPrice < 0) return setError('Cost price must be a valid non-negative number.');

    setItems((prev) => {
      const existing = prev.find((row) => row.product._id === product._id);
      if (!existing) return [...prev, { product, quantity, costPrice }];
      return prev.map((row) =>
        row.product._id === product._id
          ? { ...row, quantity: row.quantity + quantity, costPrice }
          : row
      );
    });

    setDraftItem({ productId: '', quantity: '1', costPrice: '' });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [items]
  );

  const submitPurchase = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!supplierName.trim()) return setError('Supplier name is required.');
    if (items.length === 0) return setError('Add at least one item.');

    setLoading(true);
    try {
      await api.post('/purchases', {
        supplierName: supplierName.trim(),
        items: items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          costPrice: item.costPrice
        }))
      });

      setNotice('Purchase created and stock updated successfully.');
      setSupplierName('');
      setItems([]);
      await Promise.all([loadPurchases(1), loadProducts()]);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to create purchase.'));
    } finally {
      setLoading(false);
    }
  };

  const itemProductName = (productId: Purchase['items'][number]['productId']) =>
    typeof productId === 'string' ? productId : `${productId.name} (${productId.sku})`;

  const createdByName = (createdBy: Purchase['createdBy']) =>
    typeof createdBy === 'string' ? createdBy : createdBy?.name || 'Unknown';

  return (
    <div className="purchases-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Purchases</h1>
        <p>Record stock intake from suppliers and track inventory costs.</p>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {notice && <SuccessBanner>{notice}</SuccessBanner>}

      <section className="purchases-layout" style={{ gridTemplateColumns: '1fr 420px' }}>
        <article className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Add New Purchase</h2>
          </div>

          <form onSubmit={submitPurchase} className="login-form" style={{ marginTop: '1.5rem' }}>
            <label>
              Supplier Name *
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required placeholder="e.g. Acme Wholesale" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 1fr auto', gap: '0.75rem', alignItems: 'end', marginTop: '0.5rem' }}>
              <label>
                Select Product
                <select value={draftItem.productId} onChange={(e) => setDraftItem((prev) => ({ ...prev, productId: e.target.value }))}>
                  <option value="">Choose product...</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.sku}) - {product.stock} in stock
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Qty
                <input
                  type="number"
                  min={1}
                  value={draftItem.quantity}
                  onChange={(e) => setDraftItem((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </label>

              <label>
                Unit Cost (₹)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draftItem.costPrice}
                  onChange={(e) => setDraftItem((prev) => ({ ...prev, costPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </label>

              <button type="button" className="btn btn-primary" onClick={addItem} style={{ padding: '0.625rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>

            <div className="table-container mobile-stack-table" style={{ marginTop: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Total</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <TableStatusRow colSpan={5} text="No items added to this purchase yet." style={{ padding: '2rem' }} />
                  ) : (
                    items.map((item) => (
                      <tr key={item.product._id}>
                        <td data-label="Product">
                          <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>{item.product.sku}</div>
                        </td>
                        <td data-label="Qty">{item.quantity}</td>
                        <td data-label="Cost">₹{item.costPrice.toFixed(0)}</td>
                        <td data-label="Total" style={{ fontWeight: 600 }}>₹{(item.quantity * item.costPrice).toFixed(0)}</td>
                        <td data-label="Action" style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-light" onClick={() => removeItem(item.product._id)} style={{ padding: '0.4rem', color: 'var(--color-danger)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="sale-totals" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', marginTop: '1rem' }}>
              <div style={{ fontSize: '1.1rem' }}>
                <span className="muted">Grand Total:</span> 
                <strong style={{ marginLeft: '0.5rem', fontSize: '1.25rem' }}>₹{totalAmount.toFixed(0)}</strong>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || items.length === 0} style={{ padding: '0.75rem 2rem' }}>
                {loading ? 'Processing...' : 'Save Purchase'}
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Activity</h2>
            <button type="button" className="btn btn-light" onClick={() => loadPurchases(page)} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Refresh</button>
          </div>

          <div className="table-container mobile-stack-table" style={{ marginTop: '1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Info</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <TableStatusRow colSpan={2} text="No history yet." style={{ padding: '2rem' }} />
                ) : (
                  purchases.map((purchase) => (
                    <tr key={purchase._id}>
                      <td data-label="Info">
                        <div style={{ fontWeight: 600 }}>{purchase.supplierName}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>{new Date(purchase.purchaseDate || purchase.createdAt || '').toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {purchase.items.length} items • by {createdByName(purchase.createdBy)}
                        </div>
                      </td>
                      <td data-label="Amount">
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{purchase.totalAmount.toFixed(0)}</div>
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
    </div>
  );
}

export default PurchasesPage;
