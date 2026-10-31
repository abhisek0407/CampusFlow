import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/orchestrai_db';
const PRIMARY_URI = process.env.MONGODB_ATLAS_URI || DEFAULT_LOCAL_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
    };

    cached.promise = (async () => {
      try {
        const instance = await mongoose.connect(PRIMARY_URI, opts);
        console.log('Connected to MongoDB database:', instance.connection.name);
        return instance;
      } catch (primaryErr) {
        if (PRIMARY_URI !== DEFAULT_LOCAL_URI) {
          console.warn('Primary MongoDB connection failed. Falling back to local MongoDB:', primaryErr.message);
          try {
            const fallbackInstance = await mongoose.connect(DEFAULT_LOCAL_URI, opts);
            console.log('Connected to fallback local MongoDB database:', fallbackInstance.connection.name);
            return fallbackInstance;
          } catch (fallbackErr) {
            console.error('Local fallback MongoDB also failed:', fallbackErr.message);
            throw fallbackErr;
          }
        }
        throw primaryErr;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
