'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Centralized Brand Logo Component
 * ─────────────────────────────────
 * To update the logo across the ENTIRE site, simply replace:
 *   public/logo.png
 * 
 * This component is used everywhere the Alumnest logo appears:
 * - Sidebar header
 * - Login / Signup pages
 * - SignedOutView (guest landing)
 * - Browser tab (favicon) → update public/favicon.ico separately
 * 
 * Props:
 * @param size      'xs' | 'sm' | 'md' | 'lg' | 'xl' — predefined sizes
 * @param className  Additional TailwindCSS classes
 * @param showText   Whether to show "Alumnest" text next to the logo
 * @param variant    'default' | 'white' — color variant for dark backgrounds
 */

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type LogoVariant = 'default' | 'white';

interface BrandLogoProps {
    size?: LogoSize;
    className?: string;
    showText?: boolean;
    variant?: LogoVariant;
    tagline?: boolean;
}

const sizeMap: Record<LogoSize, { container: string; text: string; tagline: string; imgSize: number }> = {
    xs: { container: 'w-8 h-8',   text: 'text-sm',  tagline: 'text-[8px]',  imgSize: 32 },
    sm: { container: 'w-10 h-10', text: 'text-base', tagline: 'text-[9px]',  imgSize: 40 },
    md: { container: 'w-14 h-14', text: 'text-lg',   tagline: 'text-[10px]', imgSize: 56 },
    lg: { container: 'w-20 h-20', text: 'text-2xl',  tagline: 'text-xs',     imgSize: 80 },
    xl: { container: 'w-28 h-28', text: 'text-3xl',  tagline: 'text-sm',     imgSize: 112 },
};

export function BrandLogo({ 
    size = 'md', 
    className = '', 
    showText = false, 
    variant = 'default',
    tagline = false 
}: BrandLogoProps) {
    const config = sizeMap[size];
    const textColor = variant === 'white' ? 'text-white' : 'text-brand-ebony';
    const taglineColor = variant === 'white' ? 'text-white/70' : 'text-brand-ebony/60';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Logo Image Container */}
            <div className={`${config.container} relative flex-shrink-0 rounded-xl overflow-hidden bg-white shadow-md border border-brand-ebony/5 p-1`}>
                <Image
                    src="/logo.png"
                    alt="Alumnest — For the Tribe"
                    width={config.imgSize}
                    height={config.imgSize}
                    className="w-full h-full object-contain"
                    priority
                    unoptimized
                />
            </div>

            {/* Optional Text & Tagline */}
            {showText && (
                <div className="flex flex-col">
                    <span className={`${config.text} font-bold ${textColor} tracking-[0.15em] uppercase leading-tight`}>
                        Alumnest
                    </span>
                    {tagline && (
                        <span className={`${config.tagline} ${taglineColor} font-serif italic leading-tight mt-0.5`}>
                            For the Tribe.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Logo-only icon — perfect for favicons, loading states, small indicators
 */
export function BrandIcon({ size = 'sm', className = '' }: { size?: LogoSize; className?: string }) {
    const config = sizeMap[size];
    
    return (
        <div className={`${config.container} relative flex-shrink-0 rounded-full overflow-hidden bg-white shadow-lg border-2 border-white p-1.5 ${className}`}>
            <Image
                src="/logo.png"
                alt="Alumnest"
                width={config.imgSize}
                height={config.imgSize}
                className="w-full h-full object-contain"
                priority
                unoptimized
            />
        </div>
    );
}
