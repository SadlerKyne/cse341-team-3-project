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
    description: index === 0
      ? 'Special Alpine scenery'
      : 'Scenic rail journey',
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
    expect(first.body.filterOptions).toEqual({
      regions: ['central', 'northern'],
      seasons: ['summer', 'winter']
    });

    const second = await request(app).get('/api/trips?page=2');
    expect(second.body.data.map((trip) => trip.id)).toEqual(['trip-11', 'trip-12']);
  });

  test('filters trips by region and season before paging', async () => {
    await insertTrips();

    const response = await request(app).get('/api/trips?region=central&season=summer');

    expect(response.status).toBe(200);
    expect(response.body.data.map((trip) => trip.id)).toEqual([
      'trip-01', 'trip-03', 'trip-05'
    ]);
    expect(response.body).toMatchObject({
      total: 3,
      totalPages: 1,
      filters: { region: 'central', season: 'summer' }
    });
  });

  test('searches names and descriptions case-insensitively and combines with filters', async () => {
    await insertTrips();

    const nameMatch = await request(app).get('/api/trips?q=TRIP%2001');
    expect(nameMatch.body.data.map((trip) => trip.id)).toEqual(['trip-01']);

    const descriptionMatch = await request(app).get('/api/trips?q=ALPINE');
    expect(descriptionMatch.body.data.map((trip) => trip.id)).toEqual(['trip-01']);

    const filteredMatch = await request(app).get('/api/trips?region=central&season=summer&q=alpine');
    expect(filteredMatch.body.data.map((trip) => trip.id)).toEqual(['trip-01']);
    expect(filteredMatch.body).toMatchObject({
      total: 1,
      totalPages: 1,
      filters: { region: 'central', season: 'summer', q: 'alpine' }
    });
  });

  test('treats keyword regex characters literally', async () => {
    await insertTrips();

    const response = await request(app).get('/api/trips?q=%2E');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.total).toBe(0);
  });

  test('paginates keyword search results', async () => {
    await insertTrips();

    const response = await request(app).get('/api/trips?q=trip&page=2');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 2, limit: 10, total: 12, totalPages: 2 });
    expect(response.body.data.map((trip) => trip.id)).toEqual(['trip-11', 'trip-12']);
  });

  test.each([
    'page=0',
    'page=abc',
    'limit=0',
    'limit=51',
    'region=',
    'season=summer&season=winter',
    'q=',
    'q=one&q=two',
    `q=${'a'.repeat(101)}`
  ])(
    'rejects invalid query parameters: %s',
    async (query) => {
      const response = await request(app).get(`/api/trips?${query}`);
      expect(response.status).toBe(400);
    }
  );
});
