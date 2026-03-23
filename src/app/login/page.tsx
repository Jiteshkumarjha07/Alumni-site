'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        <div className="min-h-screen bg-brand-cream border-brand-ebony/5 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative Background Leaves */}
            <div className="absolute top-0 left-0 w-64 h-64 opacity-5 pointer-events-none -translate-x-1/4 -translate-y-1/4 rotate-45">
                <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-ebony">
                    <path d="M40,100 C40,100 80,40 160,40 C160,40 100,100 40,100 Z" />
                </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 opacity-5 pointer-events-none translate-x-1/4 translate-y-1/4 -rotate-12">
                <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-ebony">
                    <path d="M40,100 C40,100 80,40 160,40 C160,40 100,100 40,100 Z" />
                </svg>
            </div>

            <div className="max-w-md w-full relative z-10">
                {/* Back Button */}
                <Link href="/" className="inline-flex items-center gap-2 text-brand-ebony/60 hover:text-brand-burgundy mb-6 font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                {/* Card */}
                <div className="bg-brand-parchment/80 rounded-2xl shadow-xl p-8 border border-brand-ebony/10 backdrop-blur-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-brand-burgundy rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-2 border-white shadow-lg">
                            <div className="w-full h-full flex items-center justify-center bg-brand-burgundy">
                                <span className="text-2xl font-bold text-white font-serif">A</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-brand-ebony mb-2">Welcome Back</h1>
                        <p className="text-brand-ebony/60">Sign in to your alumni account</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-brand-ebony/70 mb-2 uppercase tracking-widest">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-brand-ebony/70 mb-2 uppercase tracking-widest">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none pr-12 text-brand-ebony"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ebony/40 hover:text-brand-burgundy"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="text-sm text-gray-500">or</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-brand-ebony/60">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-brand-burgundy hover:underline font-bold">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs font-bold text-brand-ebony/40 mt-6 uppercase tracking-[0.2em]">
                    © 2024 Alumnest • For the Tribe.
                </p>
            </div>
        </div>
    );
}
