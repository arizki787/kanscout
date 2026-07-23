import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { initializeUserBoard } from '../init-user-board';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
}

const globalForMongo = globalThis as typeof globalThis & {
    __mongoClientPromise?: Promise<MongoClient>;
};

if (!globalForMongo.__mongoClientPromise) {
    const mongoClient = new MongoClient(mongoUri);
    globalForMongo.__mongoClientPromise = mongoClient.connect();
}

const client = await globalForMongo.__mongoClientPromise;
const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db, {
        client,
    }),
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60,
        },
    },
    emailAndPassword: {
        enabled: true,
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    if(user.id) {
                        await initializeUserBoard(user.id)
                    }
                }
            }
        }
    }
});

export async function getSession() {
    const result = await auth.api.getSession({
        headers: await headers(),
    });

    return result;
}

export async function signOut() {
    const result = await auth.api.signOut({
        headers: await headers(),
    });

    if (result.success) {
        redirect('/sign-in');
    }
}