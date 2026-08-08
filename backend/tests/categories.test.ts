import request from 'supertest';
import app from '../src/app';
import { Category } from '../src/models/Category';
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

describe('PUT /api/categories/:id', () => {
  it('updates a category', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });

    const res = await agent.put(`/api/categories/${category._id}`).send({ name: 'Consumer Electronics' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Consumer Electronics');
  });

  it('returns 404 for a well-formed but nonexistent id', async () => {
    const { agent } = await registerOwner();
    const res = await agent.put('/api/categories/507f1f77bcf86cd799439011').send({ name: 'Whatever' });
    expect(res.status).toBe(404);
  });

  it('rejects setting a category as its own parent', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });

    const res = await agent.put(`/api/categories/${category._id}`).send({ parent: category._id.toString() });

    expect(res.status).toBe(400);
  });

  it('rejects a parent update that would create an indirect cycle', async () => {
    const { agent, userId } = await registerOwner();
    const grandparent = await Category.create({ name: 'A', slug: 'a', createdBy: userId });
    const parent = await Category.create({ name: 'B', slug: 'b', parent: grandparent._id, createdBy: userId });
    const child = await Category.create({ name: 'C', slug: 'c', parent: parent._id, createdBy: userId });

    // A -> B -> C already exists; trying to set A's parent to C would close the loop.
    const res = await agent.put(`/api/categories/${grandparent._id}`).send({ parent: child._id.toString() });

    expect(res.status).toBe(400);
    const unchanged = await Category.findById(grandparent._id);
    expect(unchanged?.parent).toBeNull();
  });

  it('rejects an update that tries to set createdBy directly', async () => {
    const { agent, userId } = await registerOwner();
    const category = await Category.create({ name: 'Electronics', slug: 'electronics', createdBy: userId });

    const res = await agent
      .put(`/api/categories/${category._id}`)
      .send({ name: 'Renamed', createdBy: '000000000000000000000000' });

    expect(res.status).toBe(400);
  });
});
