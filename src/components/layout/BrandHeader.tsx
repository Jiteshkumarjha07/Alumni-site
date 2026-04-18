'use client';

import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import Link from 'next/link';

export function BrandHeader() {
    return (
        <div className="hidden md:block fixed top-6 left-8 z-[60] pointer-events-auto">
            <Link href="/" className="flex items-center gap-4 p-2.5 pr-6 rounded-full sidebar-glass transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10 border border-brand-ebony/10">
                <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20"
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    }}
                >
                    <BrandLogo size="xs" showText={false} variant="white" className="!gap-0" />
                </div>
                <div className="flex flex-col">
                    <span
                        className="text-xl font-serif font-extrabold tracking-tight uppercase leading-none"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        Alumnest
                    </span>
                    <span className="text-[9px] text-brand-ebony/60 font-black tracking-[0.2em] uppercase mt-1 ml-0.5">
                        For the Tribe
                    </span>
                </div>
            </Link>
        </div>
    );
}
