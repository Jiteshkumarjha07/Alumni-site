import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';

export function BrandHeader() {
    return (
        <header className="pt-8 pb-4 flex flex-col items-start text-left relative pointer-events-none w-full">
            {/* The Logo */}
            <BrandLogo size="md" showText tagline className="mb-2" />

            <div className="flex items-center gap-1.5 w-full mt-1">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-brand-ebony/20 to-brand-ebony/10" />
                <span className="text-brand-ebony font-serif italic text-sm whitespace-nowrap px-1 opacity-70">
                    For the Tribe.
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-brand-ebony/20 to-brand-ebony/10" />
            </div>

            {/* Decorative leaf flourishes */}
            <div className="absolute top-0 left-0 w-24 h-24 opacity-20 select-none -translate-y-6 -translate-x-2">
                <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-gold" xmlns="http://www.w3.org/2000/svg">
                    <path d="M40,100 C40,100 80,40 160,40 C160,40 100,100 40,100 Z" />
                    <path d="M40,100 C40,100 20,40 100,20 C100,20 60,80 40,100 Z" opacity="0.7" />
                </svg>
            </div>
        </header>
    );
}
