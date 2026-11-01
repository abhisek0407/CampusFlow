import mongoose from 'mongoose';
import dns from 'dns';

function applyDns() {
  try {
    const dnsStr = process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1';
    const servers = dnsStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (servers.length > 0) {
      dns.setServers(servers);
    }
  } catch (e) {}
}
applyDns();

function normalizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return rawUri;
  // If URI is mongodb+srv for cluster0.zlny5ec.mongodb.net, convert directly to standard replica set URI (no SRV DNS lookups needed)
  if (rawUri.includes('cluster0.zlny5ec.mongodb.net')) {
    const srvMatch = rawUri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
    if (srvMatch) {
      const auth = srvMatch[1];
      const db = srvMatch[3] || 'orchestrai_db';
      return `mongodb://${auth}@ac-uvfq2rq-shard-00-00.zlny5ec.mongodb.net:27017,ac-uvfq2rq-shard-00-01.zlny5ec.mongodb.net:27017,ac-uvfq2rq-shard-00-02.zlny5ec.mongodb.net:27017/${db}?ssl=true&replicaSet=atlas-qbhc28-shard-0&authSource=admin&retryWrites=true&w=majority`;
    }
  }
  return rawUri;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  applyDns();
  const rawTargetUri = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || '';
  const targetUri = normalizeMongoUri(rawTargetUri);

  if (!targetUri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = (async () => {
      try {
        const instance = await mongoose.connect(targetUri, opts);
        console.log('Connected to MongoDB database:', instance.connection.name);
        return instance;
      } catch (err) {
        console.error('MongoDB connection error:', err.message);
        throw err;
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
