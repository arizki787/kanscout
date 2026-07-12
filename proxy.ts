// this file similar to middleware

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth/auth";

// create function proxy with parameter request: NextRequest with return NextResponse.redirect()   

export default async function proxy(request: NextRequest) {
    
    const session = await getSession();
    
    const isSignInPage = request.nextUrl.pathname.startsWith('/sign-in');
    const isSignUpPage = request.nextUrl.pathname.startsWith('/sign-up');

    if ((isSignInPage || isSignUpPage) && session?.user){
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }


    return NextResponse.next();
}