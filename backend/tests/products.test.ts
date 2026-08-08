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

describe('POST /api/products - mass assignment protection', () => {
  it('sources createdBy from the authenticated session, not the request body', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });

    const res = await agent.post('/api/products').send({
      name: 'Widget',
      price: 100,
      costPrice: 50,
      category: category._id.toString()
    });

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(userId);
  });

  it('rejects a request body that tries to set createdBy directly, rather than silently dropping it', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });

    const res = await agent.post('/api/products').send({
      name: 'Widget',
      price: 100,
      costPrice: 50,
      category: category._id.toString(),
      createdBy: '000000000000000000000000'
    });

    expect(res.status).toBe(400);
  });

  it('rejects an unrecognized field instead of silently accepting it', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });

    const res = await agent.post('/api/products').send({
      name: 'Widget',
      price: 100,
      costPrice: 50,
      category: category._id.toString(),
      isFeatured: true
    });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id - mass assignment protection', () => {
  it('rejects an update that tries to set createdBy directly', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });
    const created = await agent.post('/api/products').send({
      name: 'Widget',
      price: 100,
      costPrice: 50,
      category: category._id.toString()
    });

    const res = await agent
      .put(`/api/products/${created.body._id}`)
      .send({ price: 150, createdBy: '000000000000000000000000' });

    expect(res.status).toBe(400);

    const unchanged = await Product.findById(created.body._id);
    expect(unchanged?.price).toBe(100);
  });
});

describe('GET /api/products/:id - malformed id handling', () => {
  it('returns 400 instead of a raw Mongoose CastError on a malformed id', async () => {
    const { agent } = await registerOwner();
    const res = await agent.get('/api/products/not-a-valid-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 for a well-formed but nonexistent id', async () => {
    const { agent } = await registerOwner();
    const res = await agent.get('/api/products/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/categories - mass assignment protection', () => {
  it('sources createdBy from the authenticated session, not the request body', async () => {
    const { agent, userId } = await registerOwner();

    const res = await agent.post('/api/categories').send({ name: 'Groceries', slug: 'groceries' });

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(userId);
  });

  it('rejects a request body that tries to set createdBy directly', async () => {
    const { agent } = await registerOwner();

    const res = await agent.post('/api/categories').send({
      name: 'Groceries',
      slug: 'groceries',
      createdBy: '000000000000000000000000'
    });

    expect(res.status).toBe(400);
  });
});
