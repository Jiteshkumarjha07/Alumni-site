import React from 'react';

interface AlumnestLogoProps {
    size?: number;
    className?: string;
    color?: string;
    showText?: boolean;
    textClassName?: string;
}

/**
 * Alumnest brand logo — a stylised bird rising from a nest.
 * Renders as inline SVG so it can inherit colours from the current theme
 * and scale without any external asset.
 */
export function AlumnestLogo({
    size = 48,
    className = '',
    color = 'currentColor',
    showText = false,
    textClassName = '',
}: AlumnestLogoProps) {
    return (
        <div className={`inline-flex items-center gap-3 ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
                aria-label="Alumnest Logo"
            >
                {/* Nest / Bowl */}
                <path
                    d="M40,140 C40,170 75,190 100,190 C125,190 160,170 160,140"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Bird Body */}
                <path
                    d="M100,140 C100,140 95,120 90,110 C85,100 80,85 85,75 C90,65 100,60 105,65 C110,70 108,80 105,85"
                    stroke={color}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Bird Head & Beak */}
                <path
                    d="M105,65 C110,58 118,55 125,58 C130,60 132,65 128,70 C124,75 115,75 110,72"
                    stroke={color}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Eye */}
                <circle cx="120" cy="62" r="3.5" fill={color} />

                {/* Wing — Upper */}
                <path
                    d="M85,75 C75,65 60,50 55,40 C50,30 55,25 65,30 C75,35 85,50 90,60"
                    stroke={color}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Wing — Lower feather */}
                <path
                    d="M80,80 C70,72 55,60 48,52 C42,45 45,40 52,42 C60,45 72,58 80,68"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Tail feathers */}
                <path
                    d="M95,115 C85,108 70,95 62,85 C55,76 58,72 65,76 C72,80 82,95 88,105"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>

            {showText && (
                <span
                    className={`font-bold tracking-[0.12em] uppercase select-none ${textClassName}`}
                    style={{ fontSize: size * 0.45 }}
                >
                    Alumnest
                </span>
            )}
        </div>
    );
}
