'use client';

import Link from 'next/link';
import { Home, Users, User, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';

const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Groups', href: '/messages?view=groups', icon: Users },
    { name: 'Network', href: '/network', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
    const { userData } = useAuth();
    const { totalUnreadCount } = useMessaging();
    if (!userData) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-cream border-t border-brand-ebony/10 py-1 flex justify-around items-center md:hidden z-50 backdrop-blur-md bg-opacity-90">
            {navigation.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className="flex flex-col items-center justify-center p-2 text-brand-ebony/60 hover:text-brand-burgundy transition-colors relative"
                >
                    <div className="relative">
                        <item.icon className="h-5 w-5" />
                        {item.name === 'Messages' && totalUnreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-brand-cream text-[7px] text-white items-center justify-center font-bold">
                                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                </span>
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] mt-1 font-medium">{item.name}</span>
                </Link>
            ))}
        </div>
    );
}
