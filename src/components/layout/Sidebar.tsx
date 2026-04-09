'use client';

import Link from 'next/link';
import { Home, Users, Briefcase, Calendar, Settings, MessageSquare, LogOut } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Home',           href: '/',         icon: Home },
    { name: 'Messages',       href: '/messages', icon: MessageSquare },
    { name: 'Events',         href: '/events',   icon: Calendar },
    { name: 'Jobs',           href: '/jobs',     icon: Briefcase },
    { name: 'Network',        href: '/network',  icon: Users },
];

export function Sidebar() {
    const { userData, signOut } = useAuth();
    const { totalUnreadCount } = useMessaging();
    const pathname = usePathname();

    if (!userData || pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') return null;

    return (
        <>
            {/* Stable Logo on the Top Left */}
            <div className="hidden md:flex fixed top-4 left-6 z-50 pointer-events-auto">
                <Link href="/" className="flex items-center gap-3 hover:scale-105 transition-transform duration-200 active:scale-95">
                    <div className="w-10 h-10 rounded-full bg-gradient-indigo flex items-center justify-center shadow-lg shadow-brand-burgundy/20">
                        <BrandLogo size="xs" showText={false} variant="white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-extrabold tracking-[0.1em] uppercase text-gradient-indigo leading-none block">
                            Alumnest
                        </span>
                        <span className="text-[9px] text-brand-ebony/40 font-bold tracking-widest uppercase mt-0.5 ml-0.5">
                            For the Tribe
                        </span>
                    </div>
                </Link>
            </div>

            {/* Expandable Nav Ribbon in the Center */}
            <div className="hidden md:block fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none">
                {/* The actual navbar. We use pointer-events-auto so the wrapper doesn't block clicks beneath it */}
                <div 
                    className={`group pointer-events-auto mx-auto flex items-center justify-between px-3 py-2.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] sidebar-glass border border-brand-ebony/10 shadow-[0_4px_24px_rgba(79,70,229,0.12)] origin-top hover:shadow-[0_8px_32px_rgba(79,70,229,0.20)]`}
                >
                    {/* Navigation Items */}
                    <nav className="flex items-center gap-1.5 justify-center">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative flex items-center px-3 py-2.5 rounded-full transition-all duration-300 ease-in-out
                                        ${isActive 
                                            ? 'bg-gradient-indigo text-white shadow-md' 
                                            : 'text-brand-ebony/50 hover:bg-brand-parchment dark:hover:bg-white/10 hover:text-brand-ebony'
                                        }
                                    `}
                                >
                                    <div className="relative shrink-0 flex items-center justify-center">
                                        <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : ''}`} />
                                        
                                        {/* Unread Badge for Messages */}
                                        {item.name === 'Messages' && totalUnreadCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-brand-cream text-[8px] text-white items-center justify-center font-bold">
                                                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Label text that expands on group hover */}
                                    <div className="w-0 opacity-0 overflow-hidden group-hover:w-[65px] group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                                        <span className={`block pl-2 text-xs font-bold tracking-wide whitespace-nowrap ${isActive ? 'text-white' : ''}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side: Profile and Settings */}
                    <div className="flex items-center shrink-0 gap-1.5 pl-3 ml-3 border-l border-brand-ebony/10">
                        <Link 
                            href="/settings"
                            className="p-2.5 text-brand-ebony/40 hover:bg-brand-parchment dark:hover:bg-white/10 hover:text-brand-ebony rounded-full transition-colors flex items-center"
                        >
                            <Settings className="w-[18px] h-[18px]" />
                            <div className="w-0 opacity-0 overflow-hidden group-hover:w-[60px] group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                                <span className="block pl-2 text-xs font-bold whitespace-nowrap">Settings</span>
                            </div>
                        </Link>

                        <Link 
                            href="/profile"
                            className="flex items-center p-1 rounded-full hover:bg-brand-parchment dark:hover:bg-white/10 transition-colors border border-transparent hover:border-brand-burgundy/20"
                        >
                            <img
                                src={userData.profilePic || `https://placehold.co/80x80/4f46e5/ffffff?text=${userData.name.substring(0, 1)}`}
                                alt={userData.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="w-0 opacity-0 overflow-hidden group-hover:w-auto min-w-0 group-hover:min-w-[65px] group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                                <span className="block px-2 text-xs font-bold text-brand-ebony truncate">
                                    {userData.name.split(' ')[0]}
                                </span>
                            </div>
                        </Link>
                        
                        {/* Logout Button reveals entirely on hover */}
                        <button 
                            onClick={() => signOut()}
                            className="w-0 opacity-0 overflow-hidden group-hover:w-9 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                            title="Log out"
                        >
                            <LogOut className="w-[18px] h-[18px] shrink-0" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
