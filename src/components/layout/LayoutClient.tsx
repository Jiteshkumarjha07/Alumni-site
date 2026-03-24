'use client';

import React from 'react';
import { SwipeProvider } from '@/components/layout/SwipeProvider';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants: Variants = {
    initial: (direction: number) => ({
        x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
        opacity: 0
    }),
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
        }
    },
    exit: (direction: number) => ({
        x: direction > 0 ? '-100%' : direction < 0 ? '100%' : 0,
        opacity: 0,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
        }
    })
};

export function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // We don't have the direction here easily from the SwipeProvider without context
    // But we can just use path index comparison to determine direction automatically!
    const tabs = ['/', '/messages', '/network', '/jobs', '/events', '/profile'];
    const [prevPath, setPrevPath] = React.useState(pathname);
    const direction = tabs.indexOf(pathname) > tabs.indexOf(prevPath) ? 1 : -1;

    React.useEffect(() => {
        setPrevPath(pathname);
    }, [pathname]);

    return (
        <SwipeProvider>
            <main className="md:pl-64 min-h-screen pb-24 md:pb-0 overflow-x-hidden relative">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={pathname}
                        custom={direction}
                        variants={variants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="w-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </SwipeProvider>
    );
}
