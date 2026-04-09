import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import Link from 'next/link';

export function BrandHeader() {
    return (
        <header className="pt-2 pb-2 flex flex-col items-start text-left relative w-full">
            {/* Logo */}
            <Link href="/" className="transition-transform duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer z-10 w-full">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                            boxShadow: '0 4px 14px rgba(99,102,241,0.40)',
                        }}
                    >
                        <BrandLogo size="xs" showText={false} />
                    </div>
                    <div className="flex flex-col">
                        <span
                            className="text-lg font-extrabold tracking-[0.12em] uppercase leading-none"
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Alumnest
                        </span>
                        <span className="text-[10px] text-brand-ebony/40 font-medium italic tracking-widest leading-tight mt-0.5">
                            For the Tribe.
                        </span>
                    </div>
                </div>
            </Link>
        </header>
    );
}
