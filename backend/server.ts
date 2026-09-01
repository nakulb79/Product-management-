import dotenv from 'dotenv';
import app from './src/app';
import { connectDb } from './src/config/db';

dotenv.config();

const PORT = Number(process.env.PORT || 5000);

const boot = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required. Copy backend/.env.example to backend/.env and set it.');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Copy backend/.env.example to backend/.env and set a strong, random value.');
  }

  await connectDb(mongoUri);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

boot();
