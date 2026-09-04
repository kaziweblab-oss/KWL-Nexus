import mongoose, { Connection } from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

type ConnectionCache = { conn: Connection | null; promise: Promise<Connection> | null };

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
  integrationConnections?: Map<string, ConnectionCache>;
};

const cached: MongooseCache = globalWithMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cached;
const integrationConnections = globalWithMongoose.integrationConnections ?? new Map<string, ConnectionCache>();
globalWithMongoose.integrationConnections = integrationConnections;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please define MONGODB_URI in .env.local");
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
    }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

export async function getConnection(uri: string) {
  const key = Buffer.from(uri).toString("base64url").slice(0, 32);
  let cachedConnection = integrationConnections.get(key);
  if (!cachedConnection) {
    cachedConnection = { conn: null, promise: null };
    integrationConnections.set(key, cachedConnection);
  }
  if (cachedConnection.conn?.readyState === 1) return cachedConnection.conn;
  if (!cachedConnection.promise) {
    cachedConnection.promise = mongoose.createConnection(uri, { bufferCommands: false, serverSelectionTimeoutMS: 3000, maxPoolSize: 10 }).asPromise().catch((err) => {
      cachedConnection.promise = null;
      throw err;
    });
  }
  try {
    cachedConnection.conn = await cachedConnection.promise;
    return cachedConnection.conn;
  } catch (error) {
    cachedConnection.promise = null;
    integrationConnections.delete(key);
    throw error;
  }
}
