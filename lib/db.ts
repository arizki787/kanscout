import mongoose from 'mongoose';

function getMongoUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error(
            "Please define the MONGODB_URI environment inside .env or .env.local"
        );
    }
    return uri;
}

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

async function connectDB() {
    const uri = getMongoUri();

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };
        cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
            return mongoose;
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

export default connectDB;