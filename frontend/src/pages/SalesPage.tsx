import { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Product, ProductListResponse, Sale } from '../types';
import { useCart } from '../context/CartContext';
import { printInvoiceReceipt } from '../utils/invoice';
import ScannerPanel from '../components/ScannerPanel';

function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { cart, addToCart: addToCartGlobal, removeFromCart, updateQuantity, clearCart, subTotal } = useCart();
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discount, setDiscount] = useState('0');
  const [gstRate, setGstRate] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [scanning, setScanning] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');

  const fetchProducts = async () => {
    const response = await api.get<ProductListResponse>('/products', { params: { page: 1, limit: 100 } });
    setProducts(response.data.data.filter((item) => item.status === 'active'));
  };

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .catch((requestError: any) => {
        setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load products.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.barcode || '').toLowerCase().includes(term)
    );
  }, [products, search]);

  const addToCart = (product: Product) => {
    setError('');
    setNotice('');
    const result = addToCartGlobal(product);
    if (!result.success) {
      setError(result.error || 'Failed to add to cart.');
    }
  };

  const handleScan = (barcode: string) => {
    setUnknownBarcode('');
    const match = products.find((product) => product.barcode === barcode);
    if (!match) {
      setError('');
      setNotice('');
      setUnknownBarcode(barcode);
      return;
    }
    addToCart(match);
    setNotice(`Scanned: added ${match.name} to cart.`);
  };

  const goCreateProductFromScan = () => {
    window.history.pushState({}, '', `/products?barcode=${unknownBarcode}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const discountAmount = Math.max(Number(discount || 0), 0);
  const taxable = Math.max(subTotal - discountAmount, 0);
  const gstAmount = (taxable * Math.max(Number(gstRate || 0), 0)) / 100;
  const grandTotal = taxable + gstAmount;

  const resetAfterSale = () => {
    clearCart();
    setDiscount('0');
    setGstRate('0');
    setCustomerName('');
    setCustomerPhone('');
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      setError('Add at least one product to cart.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setLastSale(null);

    try {
      const response = await api.post<Sale>('/sales', {
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          lineDiscount: 0,
          price: item.product.price
        })),
        paymentMethod,
        discount: discountAmount,
        gstRate: Number(gstRate || 0),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined
      });

      setNotice('Sale completed successfully.');
      setLastSale(response.data);
      resetAfterSale();
      await fetchProducts();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to complete sale.');
    } finally {
      setLoading(false);
    }
  };

  const printLastReceipt = () => {
    if (!lastSale) return;
    const failureMessage = printInvoiceReceipt(lastSale);
    if (failureMessage) setError(failureMessage);
  };

  return (
    <div className="sales-container-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Sales POS</h1>
        <p>Real-time billing with automated inventory sync.</p>
      </header>

      {error && <p className="error-text" style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>{error}</p>}
      {notice && (
        <div
          className="success-text"
          style={{
            padding: '1rem',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <span>{notice}</span>
          {lastSale && (
            <button type="button" className="btn btn-primary" onClick={printLastReceipt} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              Print Receipt
            </button>
          )}
        </div>
      )}

      <section className="sales-container">
        <article className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Select Products</h2>
            <div className="action-row">
              <button
                type="button"
                className={`btn ${scanning ? 'btn-primary' : 'btn-light'}`}
                onClick={() => { setScanning((prev) => !prev); setUnknownBarcode(''); }}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
              >
                {scanning ? 'Stop Scanning' : 'Scan Barcode'}
              </button>
              <button type="button" className="btn btn-light" onClick={fetchProducts} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                Refresh
              </button>
            </div>
          </div>

          {scanning && (
            <div className="panel" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', margin: '1rem 0', padding: '1rem' }}>
              <ScannerPanel onScan={handleScan} />
              {unknownBarcode && (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <p className="warning-text" style={{ margin: '0 0 0.5rem' }}>No product found for barcode {unknownBarcode}.</p>
                  <button type="button" className="btn btn-primary" onClick={goCreateProductFromScan} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    Create New Product
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative', margin: '1rem 0' }}>
            <input
              className="sales-search"
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '10px' }}
            />
            <svg style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                className="product-card"
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-start',
                  border: '1px solid #e2e8f0',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'white',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{product.sku}</span>
                <strong style={{ fontSize: '1rem', margin: '0.25rem 0' }}>{product.name}</strong>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{product.price.toFixed(0)}</span>
                  <span className={`status-pill ${product.stock <= product.lowStockThreshold ? 'status-inactive' : 'status-active'}`} style={{ fontSize: '0.7rem' }}>
                    Stock: {product.stock}
                  </span>
                </div>
              </button>
            ))}

            {!loading && filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <p className="muted">No products found matching your search.</p>
              </div>
            )}
          </div>
        </article>

        <aside className="panel sales-cart-panel" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Current Order</h2>

          <div className="cart-list" style={{ minHeight: '120px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: '1rem' }}>
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <p>Your cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product._id} className="cart-item" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.8rem', marginBottom: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{item.product.name}</strong>
                    <strong>₹{(item.product.price * item.quantity).toFixed(0)}</strong>
                  </div>

                  <div className="cart-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="qty-stepper" style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        style={{ width: '32px', height: '32px', border: 'none', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                        aria-label={`Decrease quantity of ${item.product.name}`}
                      >
                        −
                      </button>
                      <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        style={{ width: '32px', height: '32px', border: 'none', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                        aria-label={`Increase quantity of ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>× ₹{item.product.price.toFixed(0)}</span>
                    <button 
                      type="button" 
                      className="btn btn-light" 
                      onClick={() => removeFromCart(item.product._id)}
                      style={{ marginLeft: 'auto', padding: '0.4rem', color: 'var(--color-danger)', background: 'transparent' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bill-form" style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label>
                Discount
                <input type="number" min={0} step="1" value={discount} onChange={(event) => setDiscount(event.target.value)} />
              </label>

              <label>
                Tax (GST %)
                <input type="number" min={0} step="1" value={gstRate} onChange={(event) => setGstRate(event.target.value)} />
              </label>
            </div>

            <label style={{ marginTop: '0.75rem' }}>
              Customer Details
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.5rem' }}>
                <input placeholder="Name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                <input placeholder="Phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
              </div>
            </label>

            <label style={{ marginTop: '0.75rem' }}>
              Payment Method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'cash' | 'upi' | 'card')}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </label>
          </div>

          <div className="sale-totals" style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
              <span>Subtotal</span>
              <span>₹{subTotal.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-danger)', marginBottom: '0.25rem' }}>
              <span>Discount</span>
              <span>-₹{discountAmount.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
              <span>Tax ({gstRate}%)</span>
              <span>₹{gstAmount.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem' }}>
              <span>Total</span>
              <span>₹{grandTotal.toFixed(0)}</span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-primary complete-sale-btn" 
            onClick={completeSale} 
            disabled={loading || cart.length === 0}
            style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', fontSize: '1.1rem' }}
          >
            {loading ? 'Processing...' : 'Generate Bill'}
          </button>
        </aside>
      </section>
    </div>
  );
}

export default SalesPage;
