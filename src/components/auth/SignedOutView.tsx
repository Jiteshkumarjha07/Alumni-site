'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '../brand/BrandLogo';

export function SignedOutView({ user, signOut }: { user: any; signOut: () => Promise<void>; }) {
    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center p-8 bg-brand-parchment/80 rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-brand-ebony/10 backdrop-blur-md">
                <Link href="/" className="block transition-transform hover:scale-105 active:scale-95 mb-6">
                    <BrandLogo size="lg" className="mx-auto" />
                </Link>
                <h2 className="text-2xl font-serif font-bold mb-4 text-brand-ebony">Welcome back!</h2>

                {user ? (
                    <>
                        <p className="text-brand-ebony/70 mb-6 font-medium">
                            We found your account, but your profile details are missing. 
                            This usually happens if the final step of registration was interrupted.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link href="/signup" className="w-full px-6 py-3 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 text-center">
                                Complete Profile
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className="w-full px-6 py-3 border border-brand-ebony/20 text-brand-ebony/80 rounded-xl hover:bg-brand-ebony/5 transition-all font-semibold"
                            >
                                Log Out & Try Again
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-brand-ebony/70 mb-6 font-medium">Connect with fellow alumni. For the Tribe.</p>
                        <div className="space-y-3">
                            <Link href="/login" className="block w-full px-6 py-3 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 text-center">
                                Log In
                            </Link>
                            <Link href="/signup" className="block w-full px-6 py-3 border border-brand-burgundy/30 text-brand-burgundy rounded-xl font-bold hover:bg-brand-burgundy/5 transition-all text-center">
                                Sign Up
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
