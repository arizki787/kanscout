import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { initializeUserBoard } from '../init-user-board';
import { Resend } from "resend";

const mongoUri = process.env.MONGODB_URI;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
}

if (!googleClientId || !googleClientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not set');
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

function getSenderEmail(): string {
    const raw = process.env.EMAIL_FROM?.trim();
    if (!raw) {
        return "Kanscout <onboarding@resend.dev>";
    }
    // If the user provided just a domain (e.g. mail.kanscout.adxtinsight.site)
    if (!raw.includes("@")) {
        return `Kanscout <noreply@${raw}>`;
    }
    // If the user provided just an email address (e.g. noreply@domain.com)
    if (!raw.includes("<")) {
        return `Kanscout <${raw}>`;
    }
    return raw;
}

// ---------------------------------------------------------------------------
// Server-side rate limiter for verification emails
// Stores the timestamp of the last send per email address.
// Using globalThis so the map survives Next.js hot reloads in dev.
// ---------------------------------------------------------------------------
const globalForRateLimit = globalThis as typeof globalThis & {
    __emailVerificationRateLimit?: Map<string, number>;
};
if (!globalForRateLimit.__emailVerificationRateLimit) {
    globalForRateLimit.__emailVerificationRateLimit = new Map();
}
const verificationRateLimit = globalForRateLimit.__emailVerificationRateLimit;
const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export const auth = betterAuth({
    database: mongodbAdapter(db, {
        client,
    }),
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60,
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {

            if (!process.env.RESEND_API_KEY) {
                console.warn(
                    "[Email Verification] Warning: RESEND_API_KEY is not defined in process.env. If you just added it to .env.local, restart your dev server (npm run dev)."
                );
                return;
            }

            // --- Rate limit check ---
            const key = user.email.toLowerCase();
            const lastSent = verificationRateLimit.get(key) ?? 0;
            const now = Date.now();
            const elapsed = now - lastSent;

            if (elapsed < EMAIL_RESEND_COOLDOWN_MS) {
                const secondsLeft = Math.ceil((EMAIL_RESEND_COOLDOWN_MS - elapsed) / 1000);
                console.warn(
                    `[Email Verification] Rate limit hit for ${user.email}. ` +
                    `Try again in ${secondsLeft}s.`
                );
                // Silently return — Better Auth will still respond 200 to the client
                // so we don't leak whether the email exists.
                return;
            }

            // Record this send
            verificationRateLimit.set(key, now);

            try {
                const resendClient = new Resend(process.env.RESEND_API_KEY);
                const response = await resendClient.emails.send({
                    from: getSenderEmail(),
                    to: user.email,
                    subject: "Verify your Kanscout account",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #111827; margin-bottom: 16px;">Verify your Kanscout account</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 24px;">Hi ${user.name || "there"},</p>
                            <p style="color: #4b5563; font-size: 16px; line-height: 24px;">Thanks for signing up for Kanscout! Click the button below to verify your email address and activate your account:</p>
                            <div style="margin: 24px 0;">
                                <a href="${url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">Verify Email Address</a>
                            </div>
                            <p style="color: #6b7280; font-size: 14px; line-height: 20px;">If you didn't create an account, you can safely ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                            <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">Button not working? Copy and paste this link into your browser:<br /><a href="${url}" style="color: #3b82f6;">${url}</a></p>
                        </div>
                    `,
                });

                if (response.error) {
                    console.error("[Email Verification] Resend returned an error:", response.error);
                } else {
                    console.log(`[Email Verification] Email successfully sent to ${user.email} (id: ${response.data?.id})`);
                }
            } catch (err) {
                console.error("[Email Verification] Exception while sending email via Resend:", err);
            }
        },
    },
    accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
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
    },
    socialProviders: {
        google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
        },
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