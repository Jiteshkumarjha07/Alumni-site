'use client';

import React, { useState, createContext, useContext } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useRouter, usePathname } from 'next/navigation';

const tabs = ['/', '/messages', '/jobs', '/events', '/network', '/profile'];

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
        onSwipedLeft: (eventData) => {
            // Ignore swipes that start near the edges (common for back gestures)
            if (eventData.initial[0] < 80 || eventData.initial[0] > window.innerWidth - 80) return;
            
            if (currentIndex !== -1 && currentIndex < tabs.length - 1) {
                setDirection(1);
                router.push(tabs[currentIndex + 1]);
            }
        },
        onSwipedRight: (eventData) => {
            // Ignore swipes that start near the edges (common for back gestures)
            if (eventData.initial[0] < 80 || eventData.initial[0] > window.innerWidth - 80) return;

            if (currentIndex > 0) {
                setDirection(-1);
                router.push(tabs[currentIndex - 1]);
            }
        },
        delta: 150, // Reduced from 250 for easier swiping, edge check still prevents accidental back gestures
        swipeDuration: 500,
        preventScrollOnSwipe: true,
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
