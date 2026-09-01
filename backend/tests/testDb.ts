import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet: MongoMemoryReplSet | null = null;

// Sales/purchases/deliveries/stock-adjustments use multi-document transactions,
// which only work against a replica set, so the in-memory server must run as one
// (a single-node replica set is enough — transactions don't need multiple nodes).
export const connectTestDb = async (): Promise<void> => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
};

export const disconnectTestDb = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
};

export const clearCollections = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};
