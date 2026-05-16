'use client';

import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import { Smile, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { createPortal } from 'react-dom';

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ 
        top: number; 
        left: number; 
        alignRight?: boolean; 
        openUpwards?: boolean; 
        isMobile?: boolean; 
        width: number 
    }>({ top: 0, left: 0, width: 320 });

    function updatePosition() {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const isMobile = viewportWidth < 640;
            const pickerWidth = isMobile ? viewportWidth : 320;
            const pickerHeight = isMobile ? 350 : 400;

            let alignRight = false;
            let openUpwards = true;

            if (rect.left + 320 > viewportWidth - 20) {
                alignRight = true;
            }

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
    }

    useEffect(() => {
        setMounted(true);
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const portalElement = document.getElementById('emoji-picker-portal');
                if (portalElement && portalElement.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) updatePosition();
    }, [isOpen]);

    const onEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
        // Stop propagation to prevent any parent listeners from closing the picker
        event.stopPropagation();
        onEmojiSelect(emojiData.emoji);
        // We DO NOT set isOpen(false) here to allow multiple selections
    };

    if (!mounted) return null;

    const pickerContent = (
        <div 
            id="emoji-picker-portal"
            className={`fixed z-[9999] animate-in fade-in zoom-in-95 duration-200 ${
                position.isMobile 
                    ? 'inset-x-0 bottom-0 slide-in-from-bottom-full' 
                    : position.openUpwards ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
            }`}
            style={!position.isMobile ? { 
                width: `${position.width}px`,
                left: position.alignRight ? `${position.left - position.width}px` : `${position.left}px`,
                top: position.openUpwards ? `${position.top - 420}px` : `${position.top + 10}px`,
            } : {}}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`relative bg-white/95 dark:bg-[#12111a]/95 backdrop-blur-2xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] border-t border-x border-brand-ebony/10 dark:border-white/10 ring-1 ring-white/20 overflow-hidden ${
                position.isMobile ? 'rounded-t-[2rem] pb-safe' : 'rounded-[1.75rem] border-b'
            }`}>
                {position.isMobile && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-brand-ebony/5">
                        <span className="text-xs font-black text-brand-ebony/40 uppercase tracking-widest">Select Emojis</span>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-brand-ebony/5 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-brand-ebony/40" />
                        </button>
                    </div>
                )}

                <div className={`absolute left-0 right-0 h-1 bg-gradient-to-r from-brand-burgundy/40 via-indigo-500/40 to-brand-burgundy/40 ${
                    position.openUpwards && !position.isMobile ? 'bottom-0' : 'top-0'
                }`} />
                
                <EmojiPickerReact
                    onEmojiClick={onEmojiClick}
                    theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    emojiStyle={EmojiStyle.APPLE}
                    skinTonesDisabled
                    searchDisabled={false}
                    width="100%"
                    height={position.isMobile ? 350 : 400}
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
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
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

