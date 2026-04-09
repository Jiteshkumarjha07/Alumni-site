'use client';

import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import Link from 'next/link';

export function BrandHeader() {
    return (
        <div className="hidden md:block fixed top-6 left-8 z-[60] pointer-events-auto">
            <Link href="/" className="flex items-center gap-4 transition-transform duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-indigo-500/20"
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    }}
                >
                    <BrandLogo size="xs" showText={false} variant="white" />
                </div>
                <div className="flex flex-col">
                    <span
                        className="text-2xl font-serif font-extrabold tracking-tight uppercase leading-none"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        Alumnest
                    </span>
                    <span className="text-[10px] text-brand-ebony/40 font-bold tracking-[0.2em] uppercase mt-1 ml-0.5">
                        Premiere Excellence
                    </span>
                </div>
            </Link>
        </div>
    );
}
