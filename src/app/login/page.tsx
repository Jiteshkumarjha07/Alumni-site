'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

export default function LoginPage() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);

            // ── Suspension gate ──────────────────────────────────────────
            // After auth succeeds, verify the account is not suspended before
            // allowing entry. We read the user doc directly (auth.currentUser is
            // set synchronously by Firebase after signIn resolves).
            const currentUser = auth.currentUser;
            if (currentUser) {
                const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                if (userSnap.exists() && userSnap.data().isSuspended) {
                    await signOut(auth);
                    setError('Your account has been suspended. Please contact your administrator.');
                    setLoading(false);
                    return;
                }
            }

            router.push('/');
        } catch (err: unknown) {
            console.error('Login error:', err);
            const error = err as { message?: string };
            setError(error.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
            {/* Dark premium background gradient specific to auth */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cream to-brand-parchment z-[-1]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-burgundy rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-40 animate-pulse-subtle" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold rounded-full mix-blend-multiply filter blur-[128px] opacity-10 dark:opacity-20 animate-pulse-subtle" style={{ animationDelay: '1s' }} />

            <div className="max-w-md w-full relative z-10 animate-fade-up">
                {/* Back Button */}
                <Link href="/" className="inline-flex items-center gap-2 text-brand-ebony/50 hover:text-brand-ebony mb-8 font-semibold transition-colors text-sm uppercase tracking-wider backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-brand-ebony/10">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                {/* Card */}
                <div className="card-premium p-8 sm:p-10">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <Link href="/" className="inline-block transition-transform duration-300 hover:scale-[1.03] active:scale-95 mb-6">
                            <div className="p-3 bg-gradient-indigo rounded-2xl shadow-xl flex items-center justify-center glow-indigo mx-auto w-16 h-16">
                                <BrandLogo size="md" showText={false} variant="white" />
                            </div>
                        </Link>
                        <h1 className="text-3xl font-serif font-bold text-brand-ebony mb-2">Welcome Back</h1>
                        <p className="text-brand-ebony/60 text-sm font-medium">Sign in to your alumni account</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full px-4 py-3.5 input-premium rounded-xl text-sm font-medium"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3.5 input-premium rounded-xl text-sm font-medium pr-12"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ebony/40 hover:text-brand-burgundy transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-indigo text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs shimmer overflow-hidden relative"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-ebony/10 to-brand-ebony/10" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-brand-ebony/30">or</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-brand-ebony/10 to-brand-ebony/10" />
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-sm text-brand-ebony/60 font-medium">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-brand-burgundy hover:text-indigo-500 font-bold ml-1 transition-colors relative group">
                                Sign Up
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-burgundy scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] font-bold text-brand-ebony/30 mt-8 uppercase tracking-[0.25em]">
                    © {new Date().getFullYear()} Alumnest • For the Tribe.
                </p>
            </div>
        </div>
    );
}
