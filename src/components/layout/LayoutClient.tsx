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
import { SocialRibbon } from './SocialRibbon';
import { useUI } from '@/contexts/UIContext';
import { ShieldOff } from 'lucide-react';

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
    const { userData, signOut } = useAuth();
    const { isFocusMode, focusType } = useUI();
    
    const [isMobile, setIsMobile] = React.useState(false);
    const tabs = ['/', '/messages', '/jobs', '/events', '/network', '/profile'];
    const [prevPath, setPrevPath] = React.useState(pathname);
    
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    React.useEffect(() => {
        setPrevPath(pathname);
    }, [pathname]);

    // ── Suspension wall ────────────────────────────────────────────────────────
    // All hooks are declared above this point. An early return here is safe.
    // The AuthContext's real-time listener already called firebaseSignOut, but
    // we keep this wall as a zero-delay safety net.
    if (userData?.isSuspended) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-brand-cream to-brand-parchment p-8">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-burgundy rounded-full mix-blend-multiply filter blur-[160px] opacity-10 animate-pulse-subtle" />
                <div className="max-w-md w-full text-center animate-fade-up">
                    <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <ShieldOff className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-serif font-extrabold text-brand-ebony mb-3">Account Suspended</h1>
                    <p className="text-brand-ebony/60 text-sm font-medium leading-relaxed mb-8">
                        Your access to Alumnest has been suspended by an administrator.<br />
                        Please contact support to restore your account.
                    </p>
                    <button
                        onClick={() => signOut()}
                        className="px-8 py-3.5 bg-brand-ebony text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-burgundy transition-all active:scale-95"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    const direction = tabs.indexOf(pathname) > tabs.indexOf(prevPath) ? 1 : -1;

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isGlobalAdminPage = pathname.startsWith('/admin');
    const isInstituteAdminPage = pathname.startsWith('/institute-admin');
    
    // Sidebar shows everywhere except Login/Signup and Global Admin
    const showSidebar = userData && !isAuthPage && !isGlobalAdminPage && !isFocusMode;
    
    // Ribbon and MobileNav hide on BOTH Global and Institute Admin pages
    const showRibbon = userData && !isAuthPage && !isGlobalAdminPage && !isInstituteAdminPage && (focusType === 'partial' || !isFocusMode);
    const showMobileNav = userData && !isAuthPage && !isGlobalAdminPage && !isInstituteAdminPage && (focusType === 'partial' || !isFocusMode);

    return (
        <SwipeProvider>
            {userData && <GlobalMessaging />}
            <MessagingProvider>
                <div className="flex flex-col min-h-screen">
                    {showRibbon && (
                        <>
                            <BrandHeader />
                            <SocialRibbon />
                        </>
                    )}
                    {showSidebar && <Sidebar />}
                    <main className={`min-h-screen ${showSidebar ? 'md:pl-80' : ''} ${showRibbon ? 'md:pt-28' : ''} md:pr-12 ${isMobile && !(isGlobalAdminPage || isInstituteAdminPage) && showMobileNav ? 'pb-24' : 'pb-8'} relative z-0 transition-all duration-500`}>
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
            {showMobileNav && <MobileNav />}
        </div>
    </MessagingProvider>
</SwipeProvider>
    );
}
