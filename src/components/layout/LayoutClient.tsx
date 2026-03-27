'use client';

import React from 'react';
import { SwipeProvider } from '@/components/layout/SwipeProvider';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalMessaging } from '@/components/chat/GlobalMessaging';

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
    const { userData } = useAuth();
    // Disable swiping on interactive elements
    const handleCapture = (e: React.TouchEvent | React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const interactiveElements = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
        if (interactiveElements.includes(target.tagName) || target.closest('[data-interactive]')) {
            e.stopPropagation();
        }
    };
    const [isMobile, setIsMobile] = React.useState(false);
    
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const tabs = ['/', '/messages', '/network', '/jobs', '/events', '/profile'];
    const [prevPath, setPrevPath] = React.useState(pathname);
    const direction = tabs.indexOf(pathname) > tabs.indexOf(prevPath) ? 1 : -1;

    React.useEffect(() => {
        setPrevPath(pathname);
    }, [pathname]);

    // Apply fluid padding and spacing to the main container
    // Fixed sidebar space on md: screens, fluid padding for all
    return (
        <SwipeProvider>
            {userData && <GlobalMessaging />}
            <main className={`min-h-screen transition-all duration-300 ${userData ? 'md:pl-64' : ''} ${isMobile ? 'pb-24' : 'pb-8'}`}>
                <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl">
                    {isMobile ? (
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
                    ) : (
                        <div className="w-full animate-in fade-in duration-500">
                            {children}
                        </div>
                    )}
                </div>
            </main>
        </SwipeProvider>
    );
}
