import { describe, expect, test } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import { Role } from '../src/models/schemas/roles.js';
import { User } from '../src/models/schemas/users.js';

const createUser = async (name, email, roleName) => {
  const role = await Role.findOne({ name: roleName });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash('password', 4), role: role._id });
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
    const mayaId = await createUser('Maya', 'maya@example.com', 'customer');
    const kenId = await createUser('Ken', 'ken@example.com', 'customer');
    const agent = await signIn('maya@example.com');

    expect((await agent.get('/users-admin')).status).toBe(200);

    const list = await agent.get('/api/users');
    expect(list.body).toEqual([{ id: mayaId, name: 'Maya', email: 'maya@example.com', role: 'customer' }]);

    const updateSelf = await agent.put(`/api/users/${mayaId}`).send({ name: 'Maya R', email: 'maya@example.com' });
    expect(updateSelf.status).toBe(200);
    expect(updateSelf.body.name).toBe('Maya R');

    const updateOther = await agent.put(`/api/users/${kenId}`).send({ name: 'Hacked', email: 'ken@example.com' });
    const deleteOther = await agent.delete(`/api/users/${kenId}`);
    const changeRole = await agent.put(`/api/users/${mayaId}`).send({ name: 'Maya', email: 'maya@example.com', role: 'admin' });
    expect(updateOther.status).toBe(403);
    expect(deleteOther.status).toBe(403);
    expect(changeRole.status).toBe(403);
  });

  test('customers can delete themselves and are signed out', async () => {
    const mayaId = await createUser('Maya', 'maya@example.com', 'customer');
    const agent = await signIn('maya@example.com');

    expect((await agent.delete(`/api/users/${mayaId}`)).status).toBe(204);
    expect(await User.findById(mayaId)).toBeNull();
    expect((await agent.get('/users-admin')).headers.location).toBe('/login');
  });

  test('admins see everyone and can update and delete any user', async () => {
    await createUser('Admin', 'admin@example.com', 'admin');
    const kenId = await createUser('Ken', 'ken@example.com', 'customer');
    const agent = await signIn('admin@example.com');

    expect((await agent.get('/api/users')).body).toHaveLength(2);

    const update = await agent.put(`/api/users/${kenId}`).send({ name: 'Ken', email: 'ken@example.com', role: 'admin' });
    expect(update.body.role).toBe('admin');

    expect((await agent.delete(`/api/users/${kenId}`)).status).toBe(204);
    expect((await agent.delete(`/api/users/${kenId}`)).status).toBe(404);
  });

  test('returns 400 when name or email is missing', async () => {
    const mayaId = await createUser('Maya', 'maya@example.com', 'customer');
    const agent = await signIn('maya@example.com');

    expect((await agent.put(`/api/users/${mayaId}`).send({ name: '' })).status).toBe(400);
  });
});
