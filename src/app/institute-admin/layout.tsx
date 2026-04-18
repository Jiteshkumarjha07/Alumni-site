'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function InstituteAdminLayout({ children }: { children: React.ReactNode }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else if (userData && !userData.isinsadmin) {
                router.replace('/');
            }
        }
    }, [user, userData, loading, router]);

    // Show loading state while checking auth or waiting for userData
    if (loading || (user && !userData)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-brand-cream to-brand-parchment">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-burgundy/40 mx-auto mb-4" />
                    <p className="text-brand-ebony/40 text-xs font-bold uppercase tracking-widest">
                        Verifying Access
                    </p>
                </div>
            </div>
        );
    }

    // Do not render children if unauthorized (prevents flash of content before redirect)
    if (!user || !userData?.isinsadmin) {
        return null;
    }

    // Render children if the user is an institute admin
    return <>{children}</>;
}
