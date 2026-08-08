import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductManagementPage from '../src/pages/ProductManagementPage';
import { Category, Product, ProductListResponse } from '../src/types';
import api from '../src/api/api';

vi.mock('../src/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const mockedApi = vi.mocked(api, true);

const category: Category = {
  _id: 'cat-1',
  name: 'Electronics',
  slug: 'electronics',
  status: 'active',
  createdBy: 'user-1'
};

const emptyProductList: { data: ProductListResponse } = {
  data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }
};

const createdProduct: Product = {
  _id: 'prod-new',
  name: 'Wireless Mouse',
  sku: '',
  description: '',
  price: 500,
  costPrice: 300,
  category: category._id,
  stock: 0,
  lowStockThreshold: 5,
  images: [],
  status: 'active',
  createdBy: 'user-1'
};

const renderPage = () => render(<ProductManagementPage />);

const getForm = (container: HTMLElement) => {
  const form = container.querySelector('form');
  if (!form) throw new Error('form not found');
  return form;
};

describe('Product CRUD - create flow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('submits the new-product form and reports success', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/categories') return Promise.resolve({ data: [category] });
      return Promise.resolve(emptyProductList);
    });
    mockedApi.post.mockResolvedValue({ data: createdProduct });

    renderPage();

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/categories'));

    await user.type(screen.getByLabelText(/Product Name/), 'Wireless Mouse');
    await user.selectOptions(screen.getByLabelText(/Category/), category._id);
    await user.type(screen.getByLabelText(/Selling Price/), '500');
    await user.type(screen.getByLabelText(/Cost Price/), '300');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ name: 'Wireless Mouse', category: category._id, price: 500, costPrice: 300 })
      )
    );

    expect(await screen.findByText('Product created successfully.')).toBeInTheDocument();
  });

  it('rejects a negative price before calling the API', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/categories') return Promise.resolve({ data: [category] });
      return Promise.resolve(emptyProductList);
    });

    const { container } = renderPage();
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/categories'));

    await user.type(screen.getByLabelText(/Product Name/), 'Broken Product');
    await user.selectOptions(screen.getByLabelText(/Category/), category._id);
    await user.type(screen.getByLabelText(/Selling Price/), '-5');
    await user.type(screen.getByLabelText(/Cost Price/), '300');

    // fireEvent.submit bypasses the browser's native `min="0"` constraint-validation
    // gate (which would otherwise block the click-to-submit path before React's
    // onSubmit runs) so this exercises the app's own JS-level guard directly.
    fireEvent.submit(getForm(container));

    expect(await screen.findByText(/must be a valid number that isn't negative/)).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
