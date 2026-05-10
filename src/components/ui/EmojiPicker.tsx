'use client';

import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    className?: string;
}

import { createPortal } from 'react-dom';

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // If we're using a portal, we also need to check if the click was inside the portal
                const portalElement = document.getElementById('emoji-picker-portal');
                if (portalElement && portalElement.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const [position, setPosition] = useState<{ top: number; left: number; alignRight?: boolean; openUpwards?: boolean; isMobile?: boolean; width: number }>({ top: 0, left: 0, width: 320 });

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const pickerWidth = Math.min(320, viewportWidth - 32);
            const pickerHeight = viewportWidth < 640 ? 320 : 400;

            let alignRight = false;
            let openUpwards = true;
            const isMobile = viewportWidth < 640;

            // Horizontal check
            if (rect.left + pickerWidth > viewportWidth - 20) {
                alignRight = true;
            }

            // Vertical check
            if (rect.top - pickerHeight < 20) {
                openUpwards = false;
            }

            setPosition({ 
                top: openUpwards ? rect.top : rect.bottom,
                left: alignRight ? rect.right : rect.left,
                alignRight, 
                openUpwards, 
                isMobile,
                width: pickerWidth
            });
        }
    }, [isOpen]);

    const onEmojiClick = (emojiData: EmojiClickData) => {
        onEmojiSelect(emojiData.emoji);
        setIsOpen(false);
    };

    if (!mounted) return null;

    const pickerContent = (
        <div 
            id="emoji-picker-portal"
            className={`fixed z-[9999] animate-in fade-in zoom-in-95 duration-200 ${
                position.openUpwards ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
            }`}
            style={{ 
                width: `${position.width}px`,
                left: position.alignRight ? `${position.left - position.width}px` : `${position.left}px`,
                top: position.openUpwards ? `${position.top - (position.isMobile ? 360 : 440)}px` : `${position.top + 10}px`,
            }}
        >
            <div className="relative p-1 bg-white/95 dark:bg-[#12111a]/95 backdrop-blur-2xl rounded-[1.75rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] border border-brand-ebony/10 dark:border-white/10 ring-1 ring-white/20 overflow-hidden">
                <div className={`absolute left-0 right-0 h-1 bg-gradient-to-r from-brand-burgundy/40 via-indigo-500/40 to-brand-burgundy/40 ${
                    position.openUpwards ? 'bottom-0' : 'top-0'
                }`} />
                
                <EmojiPickerReact
                    onEmojiClick={onEmojiClick}
                    theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    skinTonesDisabled
                    searchDisabled={false}
                    width="100%"
                    height={position.isMobile ? 320 : 400}
                    lazyLoadEmojis={true}
                    previewConfig={{ showPreview: false }}
                    style={{
                        '--epr-bg-color': 'transparent',
                        '--epr-category-label-bg-color': theme === 'dark' ? 'rgba(18, 17, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                        '--epr-search-input-bg-color': theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        '--epr-highlight-color': '#8b1538',
                        '--epr-header-padding': '12px',
                        border: 'none',
                        boxShadow: 'none'
                    } as React.CSSProperties}
                />
            </div>
        </div>
    );

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-xl transition-all duration-300 relative group ${
                    isOpen 
                        ? 'text-brand-burgundy bg-brand-burgundy/10 shadow-inner' 
                        : 'text-brand-ebony/40 hover:text-brand-burgundy hover:bg-brand-burgundy/5'
                }`}
            >
                <Smile className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'scale-110 rotate-12' : 'group-hover:scale-110'}`} />
                {isOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-burgundy rounded-full border-2 border-white dark:border-[#0c0a1e] animate-pulse" />
                )}
            </button>

            {isOpen && createPortal(pickerContent, document.body)}
        </div>
    );
};
