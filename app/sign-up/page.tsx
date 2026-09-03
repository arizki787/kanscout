'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, signUp, authClient, useSession } from '@/lib/auth/auth-client';
import { useRouter } from "next/navigation";
import { FaGoogle } from "react-icons/fa";
import { Mail, CheckCircle2 } from "lucide-react";

const RESEND_COOLDOWN = 60;

export default function SignUp() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);

    const router = useRouter();
    const { data: session, isPending } = useSession();

    useEffect(() => {
        if (!isPending && session?.user) {
            router.push('/dashboard');
        }
    }, [session, isPending, router]);

    // Countdown tick
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signUp.email({
                name,
                email,
                password,
                callbackURL: "/dashboard"
            });

            if (result.error) {
                setError(result.error.message ?? 'Failed to Sign Up');
            } else {
                setEmailSent(true);
                setResendCooldown(RESEND_COOLDOWN);
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
                setResendCooldown(RESEND_COOLDOWN);
            }
        } catch {
            setError("Failed to resend verification email.");
        } finally {
            setResendLoading(false);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white p-4">
            <Card className="w-full max-w-md border-gray-200 shadow-lg">
                {emailSent ? (
                    <div className="p-6 text-center space-y-6">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Mail className="h-7 w-7" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-bold text-black">
                                Check your email
                            </CardTitle>
                            <CardDescription className="text-gray-600 text-sm">
                                We sent a verification link to <span className="font-semibold text-gray-900">{email}</span>. Click the link to activate your Kanscout account.
                            </CardDescription>
                        </div>

                        {resendMessage && (
                            <div className="flex items-center justify-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{resendMessage}</span>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResendVerification}
                                disabled={resendLoading || resendCooldown > 0}
                                className="w-full border-gray-300 hover:bg-gray-50"
                            >
                                {resendLoading
                                    ? "Resending..."
                                    : resendCooldown > 0
                                    ? `Resend available in ${resendCooldown}s`
                                    : "Resend verification email"}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setEmailSent(false);
                                    setResendMessage("");
                                    setError("");
                                }}
                                className="w-full text-gray-600 hover:text-gray-900"
                            >
                                Use a different email
                            </Button>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <Link
                                href="/sign-in"
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Already verified? Sign In
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-black">
                                Sign Up
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Create an account to start tracking your job applications
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <CardContent className="space-y-4">
                                {error && (
                                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor='name' className="text-gray-700">Name</Label>
                                    <Input 
                                        id='name' 
                                        type='text' 
                                        placeholder="John Doe" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required 
                                        className="border-gray-300 focus:border-primary focus:ring-primary"    
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-700">Email</Label>
                                    <Input 
                                        id='email' 
                                        type='email' 
                                        placeholder="john@example.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
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
                                        className='border-gray-300 focus:border-primary focus:ring-primary'
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-gray-200 flex flex-col space-y-4">
                                <Button 
                                    type='submit'
                                    className='w-full bg-primary hover:bg-primary/90'
                                    disabled={loading}
                                >
                                    {loading ? "Creating account..." : "Sign Up"}
                                </Button>
                                <Button 
                                    type="button"
                                    onClick={() => handleSubmitGoogle()}
                                    className='w-full bg-white text-primary border-primary hover:bg-primary/90 hover:text-white'
                                    disabled={loading}
                                >
                                    <FaGoogle className="w-4 h-4"/>
                                    {loading ? "Signing Up ..." : "Sign Up With Google"}
                                </Button>
                                <p>
                                    Already have an account? {" "} 
                                    <Link 
                                        href='/sign-in'
                                        className="font-medium text-primary hover:underline"
                                    >
                                        Sign In
                                    </Link>
                                </p>
                            </CardFooter>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
}