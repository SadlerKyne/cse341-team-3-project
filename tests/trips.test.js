import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';

const insertTrips = async () => {
  const trips = getDb().collection('trips');
  await trips.deleteMany({});
  return trips.insertMany(Array.from({ length: 12 }, (_, index) => ({
    id: `trip-${String(index + 1).padStart(2, '0')}`,
    name: `Trip ${String(index + 1).padStart(2, '0')}`,
    region: index < 6 ? 'central' : 'northern',
    bestSeason: index % 2 === 0 ? 'summer' : 'winter'
  })));
};

describe('GET /api/trips', () => {
  test('returns 10 trips by default and supports paging', async () => {
    await insertTrips();

    const first = await request(app).get('/api/trips');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ page: 1, limit: 10, total: 12, totalPages: 2 });
    expect(first.body.data).toHaveLength(10);

    const second = await request(app).get('/api/trips?page=2');
    expect(second.body.data.map((trip) => trip.id)).toEqual(['trip-11', 'trip-12']);
  });

  test.each(['page=0', 'page=abc', 'limit=0', 'limit=51'])(
    'rejects invalid query parameters: %s',
    async (query) => {
      const response = await request(app).get(`/api/trips?${query}`);
      expect(response.status).toBe(400);
    }
  );
});
