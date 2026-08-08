import { useEffect, useState } from 'react';
import api from '../api/api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Banner';
import TableStatusRow from '../components/TableStatusRow';
import { getErrorMessage } from '../utils/getErrorMessage';

const parseCategoryName = (category: Product['category']) => (typeof category === 'string' ? category : category?.name || 'Unknown');

const goTo = (url: string) => {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function ReorderPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Product[]>('/stock/alerts/low');
      setItems(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load low-stock products.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="products-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Reorder List</h1>
        <p>Every active product at or below its low-stock threshold, lowest stock first.</p>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <section className="panel">
        <div className="panel-header">
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{loading ? 'Loading...' : `${items.length} product${items.length === 1 ? '' : 's'} need restocking`}</h2>
          <button type="button" className="btn btn-light" onClick={load} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="table-container mobile-stack-table" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <TableStatusRow colSpan={5} text="Loading reorder list..." />
              ) : items.length === 0 ? (
                <TableStatusRow colSpan={5} text="Nothing is low on stock right now." />
              ) : (
                items.map((product) => (
                  <tr key={product._id}>
                    <td data-label="Product">
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>SKU: {product.sku || 'N/A'}</div>
                    </td>
                    <td data-label="Category">
                      <span className="status-pill" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>
                        {parseCategoryName(product.category)}
                      </span>
                    </td>
                    <td data-label="Stock">
                      <span style={{ fontWeight: 700, color: product.stock <= 0 ? 'var(--color-danger)' : 'inherit' }}>{product.stock}</span>
                    </td>
                    <td data-label="Threshold">{product.lowStockThreshold}</td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div className="action-row" style={{ justifyContent: 'flex-end' }}>
                        {user?.role === 'owner' ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => goTo(`/purchases?productId=${product._id}`)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            Restock
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => goTo(`/stock-adjustments?productId=${product._id}`)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            Adjust Stock
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
      </section>
    </div>
  );
}

export default ReorderPage;
