'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, authClient } from "@/lib/auth/auth-client";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle } from "react-icons/fa";
import { CheckCircle2, Mail } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState(""); 
    const [loading, setLoading] = useState(false);
    const [isUnverified, setIsUnverified] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState("");

    const router = useRouter();
    const { data: session, isPending } = useSession();

    useEffect(() => {
        if (!isPending && session?.user) {
            router.push('/dashboard');
        }
    }, [session, isPending, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setIsUnverified(false);
        setResendMessage("");
        setLoading(true);

        try {
            const result = await signIn.email({
                email,
                password,
            });
            if (result.error) {
                if (result.error.code === "EMAIL_NOT_VERIFIED") {
                    setIsUnverified(true);
                    setError("Your email address has not been verified yet.");
                } else {
                    setError(result.error.message ?? 'Failed to Sign In');
                }
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('An unexpected error occurred!');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitGoogle(){
        setError("");
        setLoading(true);
        try {
            const result = await signIn.social({
                provider: 'google',
                callbackURL: '/dashboard'
            });
            if (result.error){
                setError(result.error.message ?? 'Failed to Sign In')
            }
        } catch (err) {
            setError('OAuth error occured!');
        } finally {
            setLoading(false);
        }
    }

    async function handleResendVerification() {
        if (!email) {
            setError("Please enter your email above to resend the verification link.");
            return;
        }
        setResendLoading(true);
        setResendMessage("");
        setError("");
        try {
            const result = await authClient.sendVerificationEmail({
                email,
                callbackURL: "/dashboard",
            });
            if (result.error) {
                setError(result.error.message ?? "Failed to resend verification email.");
            } else {
                setResendMessage("Verification email resent! Please check your inbox.");
            }
        } catch {
            setError("An error occurred while resending verification email.");
        } finally {
            setResendLoading(false);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white p-4">
            <Card className="w-full max-w-md border-gray-200 shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-black">
                        Sign In
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive space-y-2">
                                <p>{error}</p>
                                {isUnverified && (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={resendLoading}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive underline hover:opacity-80 disabled:opacity-50"
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                            {resendLoading ? "Resending verification email..." : "Click here to resend verification email"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {resendMessage && (
                            <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{resendMessage}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700">Email</Label>
                            <Input 
                                id='email' 
                                type='email' 
                                placeholder="john@example.com" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="border-gray-300 focus:border-primary focus:ring-primary"    
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input 
                                id='password' 
                                type='password' 
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                className="border-gray-300 focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-gray-200 flex flex-col space-y-4">
                        <Button 
                            type='submit'
                            className='w-full bg-primary hover:bg-primary/90'
                            disabled={loading}
                        >
                            {loading ? "Signing In ..." : "Sign In"}
                        </Button>
                        <Button 
                            type="button"
                            onClick={() => handleSubmitGoogle()}
                            className='w-full bg-white text-primary border-primary hover:bg-primary/90 hover:text-white'
                            disabled={loading}
                        >
                            <FaGoogle className="w-4 h-4"/>
                            {loading ? "Signing In ..." : "Sign In With Google"}
                        </Button>
                        <p>
                            Don't have an account? {" "} 
                            <Link 
                                href='/sign-up'
                                className="font-medium text-primary hover:underline"
                            >
                                Sign Up
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}