import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth/auth";

const protectedRoutes = ["/dashboard"];
const authRoutes = ["/sign-in", "/sign-up"];

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const { pathname } = request.nextUrl;

    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );
    const isAuthRoute = authRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // Redirect unauthenticated users away from protected routes
    if (isProtectedRoute && !session?.user) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Redirect authenticated users away from auth routes
    if (isAuthRoute && session?.user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};