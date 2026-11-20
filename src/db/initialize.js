import trips from './seeds/trips.json' with { type: 'json' };
import schedules from './seeds/schedules.json' with { type: 'json' };
import stations from './seeds/stations.json' with { type: 'json' };
import ticketClasses from './seeds/ticket-classes.json' with { type: 'json' };
import trains from './seeds/trains.json' with { type: 'json' };

const starterCollections = [
  ['trips', trips],
  ['schedules', schedules],
  ['stations', stations],
  ['ticketClasses', ticketClasses],
  ['trains', trains]
];

const standardRoles = [{ name: 'customer' }, { name: 'admin' }];

const initializeDatabase = async (db) => {
  if (!db) {
    throw new Error('A database connection is required to initialize data.');
  }

  const roles = db.collection('roles');
  await roles.createIndex({ name: 1 }, { unique: true });
  for (const role of standardRoles) {
    await roles.updateOne({ name: role.name }, { $setOnInsert: role }, { upsert: true });
  }

  for (const [collectionName, documents] of starterCollections) {
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    await collection.insertMany(documents);
  }

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });

  const bookings = db.collection('bookings');
  await bookings.deleteMany({});
  await bookings.createIndex({ id: 1 }, { unique: true });
};

export { initializeDatabase, starterCollections };
