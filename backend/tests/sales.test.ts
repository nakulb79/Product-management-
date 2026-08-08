import request from 'supertest';
import app from '../src/app';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { clearCollections, connectTestDb, disconnectTestDb } from './testDb';

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearCollections();
});

afterAll(async () => {
  await disconnectTestDb();
});

const registerOwner = async () => {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ name: 'Owner', email: 'owner@example.com', password: 'secret123' });
  return { agent, userId: res.body.user.id as string };
};

const makeProduct = async (userId: string, overrides: Partial<{ price: number; costPrice: number; stock: number }> = {}) => {
  const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });
  return Product.create({
    name: 'Widget',
    sku: 'WID-01',
    price: overrides.price ?? 100,
    costPrice: overrides.costPrice ?? 60,
    category: category._id,
    stock: overrides.stock ?? 10,
    createdBy: userId
  });
};

describe('POST /api/sales', () => {
  it('decrements stock and computes totals from the server-side product price, not the client', async () => {
    const { agent, userId } = await registerOwner();
    const product = await makeProduct(userId, { price: 100, costPrice: 60, stock: 10 });

    const res = await agent.post('/api/sales').send({
      items: [{ productId: product._id.toString(), quantity: 3 }],
      paymentMethod: 'cash'
    });

    expect(res.status).toBe(201);
    expect(res.body.grandTotal).toBe(300);
    expect(res.body.grossProfit).toBe(120);

    const updated = await Product.findById(product._id);
    expect(updated?.stock).toBe(7);
  });

  it('rejects a sale that would oversell stock, and leaves stock untouched', async () => {
    const { agent, userId } = await registerOwner();
    const product = await makeProduct(userId, { stock: 2 });

    const res = await agent.post('/api/sales').send({
      items: [{ productId: product._id.toString(), quantity: 5 }],
      paymentMethod: 'cash'
    });

    expect(res.status).toBe(400);
    const updated = await Product.findById(product._id);
    expect(updated?.stock).toBe(2);
  });

  it('accepts the exact item shape the Sales POS page sends today', async () => {
    // SalesPage.tsx builds each cart line as { productId, quantity, lineDiscount }.
    // It used to also send a client-computed `price`, which the strict sale-item
    // schema rejected outright and broke checkout — regression test for that fix.
    const { agent, userId } = await registerOwner();
    const product = await makeProduct(userId, { price: 50, stock: 5 });

    const res = await agent.post('/api/sales').send({
      items: [{ productId: product._id.toString(), quantity: 1, lineDiscount: 0 }],
      paymentMethod: 'cash',
      discount: 0,
      gstRate: 0
    });

    expect(res.status).toBe(201);
  });
});

describe('POST /api/sales/:id/void', () => {
  it('restores stock and marks the sale voided', async () => {
    const { agent, userId } = await registerOwner();
    const product = await makeProduct(userId, { stock: 10 });

    const sale = await agent.post('/api/sales').send({
      items: [{ productId: product._id.toString(), quantity: 4 }],
      paymentMethod: 'cash'
    });
    expect(sale.status).toBe(201);

    const afterSale = await Product.findById(product._id);
    expect(afterSale?.stock).toBe(6);

    const voidRes = await agent.post(`/api/sales/${sale.body._id}/void`).send({ reason: 'customer changed their mind' });
    expect(voidRes.status).toBe(200);
    expect(voidRes.body.voided).toBe(true);

    const afterVoid = await Product.findById(product._id);
    expect(afterVoid?.stock).toBe(10);
  });

  it('rejects voiding the same sale twice', async () => {
    const { agent, userId } = await registerOwner();
    const product = await makeProduct(userId, { stock: 10 });

    const sale = await agent.post('/api/sales').send({
      items: [{ productId: product._id.toString(), quantity: 1 }],
      paymentMethod: 'cash'
    });

    await agent.post(`/api/sales/${sale.body._id}/void`).send({});
    const secondVoid = await agent.post(`/api/sales/${sale.body._id}/void`).send({});

    expect(secondVoid.status).toBe(400);
  });
});
