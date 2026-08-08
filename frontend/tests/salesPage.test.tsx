import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SalesPage from '../src/pages/SalesPage';
import { CartProvider } from '../src/context/CartContext';
import { Product, ProductListResponse, Sale } from '../src/types';
import api from '../src/api/api';

vi.mock('../src/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const mockedApi = vi.mocked(api, true);

const product: Product = {
  _id: 'prod-1',
  name: 'Wireless Mouse',
  sku: 'MOUSE-01',
  description: '',
  price: 500,
  costPrice: 300,
  category: { _id: 'cat-1', name: 'Electronics', slug: 'electronics' },
  stock: 10,
  lowStockThreshold: 2,
  images: [],
  status: 'active',
  createdBy: 'user-1'
};

const productListResponse: { data: ProductListResponse } = {
  data: { data: [product], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } }
};

const sale: Sale = {
  _id: 'sale-1',
  invoiceNumber: 'INV-1',
  customerName: 'Walk-in Customer',
  items: [],
  subTotal: 500,
  discount: 0,
  gstRate: 0,
  gstAmount: 0,
  grandTotal: 500,
  paymentMethod: 'cash',
  createdBy: 'user-1',
  createdAt: new Date().toISOString()
};

const renderSalesPage = () =>
  render(
    <CartProvider>
      <SalesPage />
    </CartProvider>
  );

describe('POS checkout flow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('adds a product to the cart and completes a sale', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue(productListResponse);
    mockedApi.post.mockResolvedValue({ data: sale });

    renderSalesPage();

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/products', { params: { page: 1, limit: 100 } }));

    await user.click(await screen.findByText('Wireless Mouse'));
    expect(screen.queryByText('Your cart is empty')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate Bill' }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/sales', expect.objectContaining({
      items: [{ productId: 'prod-1', quantity: 1, lineDiscount: 0 }],
      paymentMethod: 'cash'
    })));

    expect(await screen.findByText('Sale completed successfully.')).toBeInTheDocument();
  });

  it('does not attempt checkout when the cart is empty', async () => {
    mockedApi.get.mockResolvedValue(productListResponse);

    renderSalesPage();
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: 'Generate Bill' })).toBeDisabled();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
