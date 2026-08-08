import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

// Sales/purchases/deliveries/stock-adjustments all wrap their stock updates in a
// Mongo transaction, which only works against a replica set (Atlas's free tier
// qualifies; a plain standalone `mongodb://localhost:27017/...` does not). Verify
// that up front so a misconfigured connection fails at boot with a clear message
// instead of on the first checkout a real user runs.
const assertTransactionsSupported = async (conn: typeof mongoose): Promise<void> => {
  const session = await conn.startSession();
  try {
    session.startTransaction();
    await session.abortTransaction();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      'MongoDB connection does not support transactions (it is not a replica set). ' +
        'Sales, purchases, deliveries, and stock adjustments require a replica-set-enabled ' +
        'MongoDB (e.g. MongoDB Atlas, free tier is fine). ' +
        `Original error: ${detail}`
    );
  } finally {
    await session.endSession();
  }
};

export const connectDb = async (mongoUri: string): Promise<void> => {
  if (cachedConnection) {
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    await assertTransactionsSupported(conn);
    cachedConnection = conn;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
