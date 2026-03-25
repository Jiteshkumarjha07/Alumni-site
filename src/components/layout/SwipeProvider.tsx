'use client';

import React, { useState, createContext, useContext } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useRouter, usePathname } from 'next/navigation';

const tabs = ['/', '/messages', '/network', '/jobs', '/events', '/profile'];

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
        delta: 150, // Minimum distance to trigger swipe
        swipeDuration: 500, // Maximum time for a swipe
        preventScrollOnSwipe: false, // Don't prevent vertical scroll
        trackMouse: false,
    });

    return (
        <SwipeContext.Provider value={{ direction }}>
            <div {...handlers} className="min-h-screen">
                {children}
            </div>
        </SwipeContext.Provider>
    );
}
