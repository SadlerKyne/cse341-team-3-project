import { describe, expect, test } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import { Role } from '../src/models/schemas/roles.js';
import { User } from '../src/models/schemas/users.js';

const createUser = async (name, username, email, roleName) => {
  const role = await Role.findOne({ name: roleName });
  const user = await User.create({
    name,
    username,
    email,
    passwordHash: await bcrypt.hash('password', 4),
    role: role._id
  });
  return user._id.toString();
};

const signIn = async (email) => {
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email, password: 'password' });
  return agent;
};

describe('user admin', () => {
  test('signed-out users are sent to login and get 401 from the API', async () => {
    const page = await request(app).get('/users-admin');
    const api = await request(app).get('/api/users');

    expect(page.headers.location).toBe('/login');
    expect(api.status).toBe(401);
  });

  test('customers only see and edit themselves', async () => {
    const mayaId = await createUser('Maya', 'maya', 'maya@example.com', 'customer');
    const kenId = await createUser('Ken', 'ken', 'ken@example.com', 'customer');
    const agent = await signIn('maya@example.com');

    expect((await agent.get('/users-admin')).status).toBe(200);

    const list = await agent.get('/api/users');
    expect(list.body.data).toEqual([{
      id: mayaId,
      name: 'Maya',
      username: 'maya',
      email: 'maya@example.com',
      role: 'customer'
    }]);
    expect(list.body.data[0]).not.toHaveProperty('passwordHash');

    const updateSelf = await agent.put(`/api/users/${mayaId}`).send({
      name: 'Maya R',
      username: 'maya-r',
      email: 'maya@example.com'
    });
    expect(updateSelf.status).toBe(200);
    expect(updateSelf.body.name).toBe('Maya R');
    expect(updateSelf.body.username).toBe('maya-r');

    const updateOther = await agent.put(`/api/users/${kenId}`).send({
      name: 'Hacked',
      username: 'hacked',
      email: 'ken@example.com'
    });
    const deleteOther = await agent.delete(`/api/users/${kenId}`);
    const changeRole = await agent.put(`/api/users/${mayaId}`).send({
      name: 'Maya',
      username: 'maya',
      email: 'maya@example.com',
      role: 'admin'
    });
    expect(updateOther.status).toBe(403);
    expect(deleteOther.status).toBe(403);
    expect(changeRole.status).toBe(403);
  });

  test('customers can delete themselves and are signed out', async () => {
    const mayaId = await createUser('Maya', 'maya', 'maya@example.com', 'customer');
    const agent = await signIn('maya@example.com');

    expect((await agent.delete(`/api/users/${mayaId}`)).status).toBe(204);
    expect(await User.findById(mayaId)).toBeNull();
    expect((await agent.get('/users-admin')).headers.location).toBe('/login');
  });

  test('admins see everyone and can update and delete any user', async () => {
    await createUser('Admin', 'admin', 'admin@example.com', 'admin');
    const kenId = await createUser('Ken', 'ken', 'ken@example.com', 'customer');
    const agent = await signIn('admin@example.com');

    expect((await agent.get('/api/users')).body.data).toHaveLength(2);

    const update = await agent.put(`/api/users/${kenId}`).send({
      name: 'Ken',
      username: 'ken',
      email: 'ken@example.com',
      role: 'admin'
    });
    expect(update.body.role).toBe('admin');

    expect((await agent.delete(`/api/users/${kenId}`)).status).toBe(204);
    expect((await agent.delete(`/api/users/${kenId}`)).status).toBe(404);
  });

  test('returns 400 when name or email is missing', async () => {
    const mayaId = await createUser('Maya', 'maya', 'maya@example.com', 'customer');
    const agent = await signIn('maya@example.com');

    expect((await agent.put(`/api/users/${mayaId}`).send({ name: '' })).status).toBe(400);
  });
});

describe('user pagination', () => {
  test('returns 10 users per page sorted by username, with metadata', async () => {
    await createUser('Admin', 'admin', 'admin@example.com', 'admin');
    for (let i = 1; i <= 11; i++) {
      const username = `user${String(i).padStart(2, '0')}`;
      await createUser(username, username, `${username}@example.com`, 'customer');
    }
    const agent = await signIn('admin@example.com');

    const first = await agent.get('/api/users');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ page: 1, limit: 10, total: 12, totalPages: 2 });
    expect(first.body.data).toHaveLength(10);
    expect(first.body.data[0].username).toBe('admin');

    const second = await agent.get('/api/users?page=2');
    expect(second.body.data.map((user) => user.username)).toEqual(['user10', 'user11']);
  });

  test('returns 400 for an invalid page or limit', async () => {
    await createUser('Admin', 'admin', 'admin@example.com', 'admin');
    const agent = await signIn('admin@example.com');

    for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=51']) {
      expect((await agent.get(`/api/users?${query}`)).status).toBe(400);
    }
  });
});
