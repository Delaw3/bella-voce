import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const globalCache = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };

const cached: MongooseCache = globalCache.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalCache.mongooseCache) {
  globalCache.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error("Missing MONGODB_URI. Add it to your .env.local file.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUri, { bufferCommands: false });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
