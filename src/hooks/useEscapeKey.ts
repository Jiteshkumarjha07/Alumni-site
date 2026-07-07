'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `onEscape` when the user presses Escape, while `enabled` is true.
 * Uses a ref for the callback so the key listener isn't re-bound on every render.
 */
export function useEscapeKey(enabled: boolean, onEscape: () => void) {
    const cb = useRef(onEscape);
    cb.current = onEscape;

    useEffect(() => {
        if (!enabled) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cb.current();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled]);
}
