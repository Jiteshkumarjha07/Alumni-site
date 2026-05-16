'use client';

import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { InstituteSwitcher } from './InstituteSwitcher';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export function MobileHeader() {
    const pathname = usePathname();
    const { userData } = useAuth();

    if (!userData || pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') return null;

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-brand-cream/80 backdrop-blur-xl border-b border-brand-ebony/5 dark:border-white/5 px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-indigo flex items-center justify-center flex-shrink-0">
                    <BrandLogo size="xs" showText={false} variant="white" className="!gap-0" />
                </div>
                <span className="text-lg font-serif font-black text-brand-ebony dark:text-white tracking-tight">
                    Alumnest
                </span>
            </Link>

        </header>
    );
}
