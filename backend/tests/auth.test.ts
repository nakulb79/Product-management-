import request from 'supertest';
import app from '../src/app';
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

describe('POST /api/auth/register', () => {
  it('makes the first registered user an owner and signs them in', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('owner');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects a second registration with no authenticated owner', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'secret123' });

    expect(res.status).toBe(403);
  });

  it('rejects a duplicate email even when requested by an authenticated owner', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    const res = await agent
      .post('/api/auth/register')
      .send({ name: 'Alice Two', email: 'alice@example.com', password: 'differentpass' });

    expect(res.status).toBe(400);
  });

  it('rejects a request body with fields outside the allow-list', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123', isAdmin: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('rejects a password shorter than the minimum length', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and sets the auth cookie', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects an incorrect password without revealing whether the email exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('rejects a login for an email that was never registered', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 with no auth cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
  });
});
