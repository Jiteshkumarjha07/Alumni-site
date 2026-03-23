'use client';

import Link from 'next/link';
import { Home, Users, Briefcase, User, Calendar, MessageSquare, Settings } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Network', href: '/network', icon: Users },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
    const { userData } = useAuth();
    if (!userData) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-cream border-t border-brand-ebony/10 py-1 flex justify-around items-center md:hidden z-50 backdrop-blur-md bg-opacity-90">
            {navigation.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className="flex flex-col items-center justify-center p-2 text-brand-ebony/60 hover:text-brand-burgundy transition-colors"
                >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] mt-1 font-medium">{item.name}</span>
                </Link>
            ))}
        </div>
    );
}
