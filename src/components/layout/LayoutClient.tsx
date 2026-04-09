'use client';

import React from 'react';
import { SwipeProvider } from '@/components/layout/SwipeProvider';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalMessaging } from '@/components/chat/GlobalMessaging';
import { MessagingProvider } from '@/contexts/MessagingContext';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { BrandHeader } from './BrandHeader';

const variants: Variants = {
    initial: (direction: number) => ({
        x: direction > 0 ? '20%' : direction < 0 ? '-20%' : 0,
        opacity: 0
    }),
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            x: { type: "tween", ease: "circOut", duration: 0.1 },
            opacity: { duration: 0.1 }
        }
    },
    exit: (direction: number) => ({
        x: direction > 0 ? '-20%' : direction < 0 ? '20%' : 0,
        opacity: 0,
        transition: {
            x: { type: "tween", ease: "circOut", duration: 0.1 },
            opacity: { duration: 0.1 }
        }
    })
};

export function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { userData } = useAuth();
    
    const [isMobile, setIsMobile] = React.useState(false);
    
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const tabs = ['/', '/messages', '/events', '/jobs', '/network', '/profile'];
    const [prevPath, setPrevPath] = React.useState(pathname);
    const direction = tabs.indexOf(pathname) > tabs.indexOf(prevPath) ? 1 : -1;

    React.useEffect(() => {
        setPrevPath(pathname);
    }, [pathname]);

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isAdminPage = pathname.startsWith('/admin');
    const showNav = userData && !isAuthPage && !isAdminPage;

    return (
        <SwipeProvider>
            {userData && <GlobalMessaging />}
            <MessagingProvider>
                <div className="flex flex-col min-h-screen">
                    {showNav && <BrandHeader />}
                    <Sidebar />
                    <main className={`min-h-screen ${showNav ? 'md:pt-28 md:pl-[340px] md:pr-12' : ''} ${isMobile && !isAdminPage ? 'pb-24' : 'pb-8'} relative z-0`}>
                <div className="mx-auto w-full overflow-x-hidden">
                    {isMobile ? (
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={pathname}
                                custom={direction}
                                variants={variants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="w-full"
                                style={{ willChange: 'transform, opacity' }}
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
            <MobileNav />
        </div>
    </MessagingProvider>
</SwipeProvider>
    );
}
