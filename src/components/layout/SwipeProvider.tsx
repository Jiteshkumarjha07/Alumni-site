'use client';

import React, { useState, createContext, useContext } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useRouter, usePathname } from 'next/navigation';

const tabs = ['/', '/events', '/jobs', '/network', '/messages', '/profile'];

interface SwipeContextType {
    direction: number;
}

const SwipeContext = createContext<SwipeContextType>({ direction: 0 });

export const useSwipeFill = () => useContext(SwipeContext);

export function SwipeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [direction, setDirection] = useState(0); // 1 for next tab, -1 for prev tab

    const currentIndex = tabs.indexOf(pathname);

    const handlers = useSwipeable({
        onSwipedLeft: () => {
            if (currentIndex !== -1 && currentIndex < tabs.length - 1) {
                setDirection(1);
                router.push(tabs[currentIndex + 1]);
            }
        },
        onSwipedRight: () => {
            if (currentIndex > 0) {
                setDirection(-1);
                router.push(tabs[currentIndex - 1]);
            }
        },
        delta: 80, // Reduced from 150 for more responsive trigger
        swipeDuration: 500,
        preventScrollOnSwipe: false,
        trackMouse: false,
    });

    return (
        <SwipeContext.Provider value={{ direction }}>
            <div {...handlers} className="min-h-screen" style={{ touchAction: 'pan-y' }}>
                {children}
            </div>
        </SwipeContext.Provider>
    );
}
