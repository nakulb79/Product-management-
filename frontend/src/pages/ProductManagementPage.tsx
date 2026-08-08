import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/api';
import { Category, Product, ProductListResponse } from '../types';
import { parseCsv } from '../utils/csv';
import { ErrorBanner, SuccessBanner } from '../components/Banner';
import TableStatusRow from '../components/TableStatusRow';
import { getErrorMessage } from '../utils/getErrorMessage';

type BulkImportFailure = { row: number; name: string; error: string };
type BulkImportResult = { createdCount: number; failedCount: number; failures: BulkImportFailure[] };

type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  category: string;
  stock: string;
  lowStockThreshold: string;
  status: 'active' | 'inactive';
};

const defaultForm: ProductFormState = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: '',
  costPrice: '',
  category: '',
  stock: '0',
  lowStockThreshold: '5',
  status: 'active'
};

const parseCategoryId = (category: Product['category']) => (typeof category === 'string' ? category : category?._id || '');
const parseCategoryName = (category: Product['category']) => (typeof category === 'string' ? category : category?.name || 'Unknown');

const PAGE_SIZE = 20;

function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [fromScanner, setFromScanner] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [bulkDataRows, setBulkDataRows] = useState<string[][]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);

  const selectedCategoryName = useMemo(
    () => categories.find((item) => item._id === form.category)?.name || '',
    [categories, form.category]
  );

  const fetchProducts = async (targetPage: number = page) => {
    const response = await api.get<ProductListResponse>('/products', {
      params: {
        page: targetPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined
      }
    });
    setProducts(response.data.data);
    setTotalPages(response.data.pagination.totalPages);
    setTotal(response.data.pagination.total);
    setPage(response.data.pagination.page);
  };

  const fetchCategories = async () => {
    const response = await api.get<Category[]>('/categories');
    setCategories(response.data);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchProducts(1), fetchCategories()]);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to load product page data.'));
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
      await fetchProducts(clamped);
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProducts(1), fetchCategories()]);

        const params = new URLSearchParams(window.location.search);
        const barcode = params.get('barcode');
        const editId = params.get('edit');

        if (editId) {
          const response = await api.get<Product>(`/products/${editId}`);
          handleEdit(response.data);
          setNotice(`Editing product: ${response.data.name}`);
        } else if (barcode) {
          setForm(prev => ({ ...prev, barcode }));
          setFromScanner(true);
          setNotice(`New barcode ${barcode} scanned — fill in the rest and save to add it to your inventory.`);
        }
      } catch (requestError: any) {
        setError(getErrorMessage(requestError, 'Failed to load product page data.'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const didMountFilters = useRef(false);
  useEffect(() => {
    if (!didMountFilters.current) {
      didMountFilters.current = true;
      return;
    }
    const timer = setTimeout(() => {
      fetchProducts(1).catch((requestError: any) => {
        setError(getErrorMessage(requestError, 'Failed to load products.'));
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, statusFilter, categoryFilter]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setFromScanner(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      description: form.description.trim(),
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      category: form.category,
      stock: Number(form.stock || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      status: form.status
    };

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setNotice('Product updated successfully.');
        resetForm();
        await fetchProducts();
      } else {
        await api.post('/products', payload);
        const cameFromScanner = fromScanner;
        resetForm();
        if (cameFromScanner) {
          window.history.pushState({}, '', '/scanner');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }
        setNotice('Product created successfully.');
        await fetchProducts();
      }
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to save product.'));
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      description: product.description || '',
      price: String(product.price),
      costPrice: String(product.costPrice),
      category: parseCategoryId(product.category),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      status: product.status
    });
  };

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    setError('');
    setNotice('');
    try {
      await api.delete(`/products/${productId}`);
      setNotice('Product deleted successfully.');
      if (editingId === productId) resetForm();
      await fetchProducts();
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Failed to delete product.'));
    }
  };

  const openBulkImport = () => {
    setBulkHeaders([]);
    setBulkDataRows([]);
    setBulkFileName('');
    setBulkError('');
    setBulkResult(null);
    setShowBulkImport(true);
  };

  const closeBulkImport = () => {
    setShowBulkImport(false);
  };

  const handleBulkFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkError('');
    setBulkResult(null);
    setBulkFileName(file.name);

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      setBulkError('The file appears to be empty.');
      setBulkHeaders([]);
      setBulkDataRows([]);
      return;
    }

    setBulkHeaders(rows[0].map((cell) => cell.trim()));
    setBulkDataRows(rows.slice(1));
  };

  const downloadBulkTemplate = () => {
    const header = ['name', 'sku', 'barcode', 'category', 'price', 'costPrice', 'stock', 'lowStockThreshold', 'status', 'description'];
    const sample = ['Wireless Mouse', '', '', categories[0]?.name || 'Electronics', '499', '300', '20', '5', 'active', ''];
    const csv = [header, sample]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const submitBulkImport = async () => {
    if (bulkDataRows.length === 0) {
      setBulkError('Choose a CSV file with at least one product row.');
      return;
    }

    const col = (name: string) => bulkHeaders.findIndex((h) => h.toLowerCase() === name);
    const nameIdx = col('name');
    const categoryIdx = col('category');
    const priceIdx = col('price');
    const costPriceIdx = col('costprice');
    const skuIdx = col('sku');
    const barcodeIdx = col('barcode');
    const stockIdx = col('stock');
    const thresholdIdx = col('lowstockthreshold');
    const statusIdx = col('status');
    const descriptionIdx = col('description');

    if (nameIdx === -1 || categoryIdx === -1 || priceIdx === -1 || costPriceIdx === -1) {
      setBulkError('CSV must include at least name, category, price, and costPrice columns.');
      return;
    }

    setBulkLoading(true);
    setBulkError('');
    setBulkResult(null);

    const localFailures: BulkImportFailure[] = [];
    const items: Array<Record<string, unknown>> = [];
    const itemRowNumbers: number[] = [];

    bulkDataRows.forEach((row, i) => {
      const name = row[nameIdx]?.trim();
      if (!name) return;

      const categoryName = row[categoryIdx]?.trim() || '';
      const categoryId = categories.find((c) => c.name.trim().toLowerCase() === categoryName.toLowerCase())?._id;

      if (!categoryId) {
        localFailures.push({ row: i + 2, name, error: `Category not found: "${categoryName}"` });
        return;
      }

      items.push({
        name,
        sku: skuIdx >= 0 ? row[skuIdx]?.trim() || undefined : undefined,
        barcode: barcodeIdx >= 0 ? row[barcodeIdx]?.trim() || undefined : undefined,
        category: categoryId,
        price: Number(row[priceIdx]),
        costPrice: Number(row[costPriceIdx]),
        stock: stockIdx >= 0 ? Number(row[stockIdx] || 0) : 0,
        lowStockThreshold: thresholdIdx >= 0 ? Number(row[thresholdIdx] || 0) : 5,
        status: statusIdx >= 0 && row[statusIdx]?.trim() === 'inactive' ? 'inactive' : 'active',
        description: descriptionIdx >= 0 ? row[descriptionIdx]?.trim() || '' : ''
      });
      itemRowNumbers.push(i + 2);
    });

    try {
      let createdCount = 0;
      let failedCount = localFailures.length;
      const failures = [...localFailures];

      if (items.length > 0) {
        const response = await api.post<{
          createdCount: number;
          failedCount: number;
          results: Array<{ index: number; status: 'created' | 'failed'; error?: string }>;
        }>('/products/bulk-import', { items });

        createdCount = response.data.createdCount;
        failedCount += response.data.failedCount;

        response.data.results.forEach((result) => {
          if (result.status === 'failed') {
            failures.push({
              row: itemRowNumbers[result.index],
              name: String(items[result.index]?.name || ''),
              error: result.error || 'Unknown error'
            });
          }
        });
      }

      setBulkResult({ createdCount, failedCount, failures });
      if (createdCount > 0) await fetchProducts(1);
    } catch (requestError: any) {
      setBulkError(getErrorMessage(requestError, 'Bulk import failed.'));
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="products-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Product Management</h1>
        <p>Maintain your inventory with detailed tracking and low-stock alerts.</p>
      </header>

      {categories.length === 0 && !loading && (
        <div style={{ padding: '1rem', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#f97316', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'grid', placeItems: 'center', fontWeight: 800 }}>!</div>
          <p style={{ margin: 0, color: '#9a3412', fontSize: '0.9rem' }}>
            No categories found. You need to 
            <button
              type="button"
              className="btn btn-outline"
              style={{ margin: '0 0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              onClick={() => {
                window.history.pushState({}, '', '/categories');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              Create a category
            </button> 
            first before you can add products.
          </p>
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {notice && <SuccessBanner>{notice}</SuccessBanner>}

      <div className="purchases-layout" style={{ gridTemplateColumns: '1fr 400px' }}>
        <section className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>All Products</h2>
            <div className="action-row">
              <button type="button" className="btn btn-outline" onClick={openBulkImport} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                Bulk Import (CSV)
              </button>
              <button type="button" className="btn btn-light" onClick={loadData} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                placeholder="Search by name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '10px' }}
              />
              <svg style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="table-container mobile-stack-table" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Pricing</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  <TableStatusRow colSpan={6} text="Loading products..." />
                ) : products.length === 0 ? (
                  <TableStatusRow colSpan={6} text="No products in your inventory." />
                ) : (
                  products.map((product) => (
                    <tr key={product._id}>
                      <td data-label="Product Details">
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>SKU: {product.sku || 'N/A'}</div>
                      </td>
                      <td data-label="Category">
                        <span className="status-pill" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>
                          {parseCategoryName(product.category)}
                        </span>
                      </td>
                      <td data-label="Pricing">
                        <div style={{ fontWeight: 700 }}>₹{product.price.toFixed(0)}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>Cost: ₹{product.costPrice.toFixed(0)}</div>
                      </td>
                      <td data-label="Inventory">
                        <div style={{ fontWeight: 600, color: product.stock <= product.lowStockThreshold ? 'var(--color-danger)' : 'inherit' }}>
                          {product.stock} units
                        </div>
                        {product.stock <= product.lowStockThreshold && (
                          <div className="warning" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            LOW STOCK
                          </div>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`status-pill ${product.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                          {product.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div className="action-row" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-light" onClick={() => handleEdit(product)} style={{ padding: '0.4rem' }} title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button type="button" className="btn btn-light" onClick={() => handleDelete(product._id)} style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-row" style={{ padding: '1rem 0 0 0', borderTop: '1px solid #f1f5f9' }}>
            <p className="muted" style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
              {total === 0 ? 'No products' : `Page ${page} of ${totalPages} · ${total} product${total === 1 ? '' : 's'}`}
            </p>
            <div className="action-row">
              <button type="button" className="btn btn-outline" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading} style={{ padding: '0.4rem 0.8rem' }}>
                Previous
              </button>
              <button type="button" className="btn btn-outline" onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading} style={{ padding: '0.4rem 0.8rem' }}>
                Next
              </button>
            </div>
          </div>
        </section>

        <aside className="panel" style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            {editingId ? 'Edit Product' : fromScanner ? 'New Product (from Scanner)' : 'Add New Product'}
          </h2>

          <form className="login-form" onSubmit={handleSubmit} style={{ gap: '0.875rem' }}>
            <label>
              Product Name *
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required placeholder="e.g. Wireless Mouse" />
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                SKU (optional)
                <input value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="MOUSE-01" />
              </label>
              <label>
                Barcode
                <input value={form.barcode} onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))} placeholder="12345678" />
              </label>
            </div>

            <label>
              Category *
              <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Selling Price (₹) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  required
                />
              </label>
              <label>
                Cost Price (₹) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Current Stock
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                />
              </label>
              <label>
                Low Threshold
                <input
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
                />
              </label>
            </div>

            <label>
              Status
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label>
              Description
              <textarea 
                value={form.description} 
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} 
                style={{ minHeight: '80px' }}
                placeholder="Brief product description..."
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={loading || categories.length === 0}>
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  const cameFromScanner = fromScanner;
                  resetForm();
                  if (cameFromScanner) {
                    window.history.pushState({}, '', '/scanner');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
              >
                {fromScanner ? 'Back to Scanner' : 'Cancel'}
              </button>
            </div>
          </form>
        </aside>
      </div>

      {showBulkImport && (
        <section className="modal-backdrop" role="presentation" onClick={closeBulkImport}>
          <article className="modal-card" role="dialog" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '640px', width: '100%' }}>
            <div className="panel-header">
              <h3 style={{ margin: 0 }}>Bulk Import Products</h3>
              <button className="btn btn-light" type="button" onClick={closeBulkImport}>Close</button>
            </div>

            <p className="muted" style={{ fontSize: '0.9rem' }}>
              Upload a CSV with columns <code>name, sku, barcode, category, price, costPrice, stock, lowStockThreshold, status, description</code>.
              The <code>category</code> column must match an existing category name exactly.
            </p>

            <button type="button" className="btn btn-light" onClick={downloadBulkTemplate} style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Download CSV template
            </button>

            <label>
              CSV File
              <input type="file" accept=".csv,text/csv" onChange={handleBulkFile} />
            </label>

            {bulkFileName && !bulkError && bulkDataRows.length > 0 && (
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {bulkFileName}: {bulkDataRows.length} row{bulkDataRows.length === 1 ? '' : 's'} ready to import.
              </p>
            )}

            {bulkError && <p className="error-text" style={{ marginTop: '0.75rem' }}>{bulkError}</p>}

            {bulkResult && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: bulkResult.failedCount > 0 ? '#fff7ed' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${bulkResult.failedCount > 0 ? '#ffedd5' : '#dcfce7'}` }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {bulkResult.createdCount} created, {bulkResult.failedCount} failed
                </p>
                {bulkResult.failures.length > 0 && (
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                    {bulkResult.failures.map((failure, idx) => (
                      <li key={idx}>Row {failure.row} ({failure.name || 'unnamed'}): {failure.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="action-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-light" onClick={closeBulkImport}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitBulkImport}
                disabled={bulkLoading || bulkDataRows.length === 0}
              >
                {bulkLoading ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

export default ProductManagementPage;
