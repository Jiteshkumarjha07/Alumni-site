'use client';

'use client';

import Link from 'next/link';
import { Home, Users, Briefcase, User, Calendar, Settings, MessageSquare } from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Alumni Network', href: '/network', icon: Users },
];

export function Sidebar() {
    const { userData } = useAuth();
    const pathname = usePathname();

    if (!userData) return null;

    return (
        <div className="flex flex-col h-full w-64 border-r border-brand-ebony/10 px-6 py-6 fixed left-0 top-0 overflow-y-auto hidden md:flex scrollbar-hide"
            style={{ background: 'transparent' }}>

            <BrandHeader />

            <nav className="space-y-2 mt-8 flex-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center justify-between px-4 py-3 rounded-full transition-all duration-200 group ${isActive
                                ? 'bg-brand-parchment text-brand-ebony shadow-sm font-semibold'
                                : 'text-brand-ebony/80 hover:bg-brand-burgundy/5 hover:text-brand-ebony'
                                }`}
                        >
                            <div className="flex items-center">
                                <item.icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-brand-burgundy' : 'text-brand-ebony/60 group-hover:text-brand-burgundy'
                                    }`} />
                                <span>{item.name}</span>
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {userData ? (
                <div className="mt-8 pt-6 border-t border-brand-ebony/10 flex flex-col items-center bg-brand-parchment/50 rounded-2xl p-4 shadow-sm border border-brand-parchment">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-parchment shadow-md mb-2">
                        <img
                            src={userData.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${userData.name.substring(0, 1)}`}
                            alt={userData.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h3 className="font-serif font-bold text-lg text-brand-ebony text-center leading-tight">
                        {userData.name}
                    </h3>
                    <p className="text-sm text-brand-ebony/70 mb-4">Class of {userData.batch}</p>

                    <div className="flex w-full justify-around text-center px-2 mb-4">
                        <div>
                            <p className="font-bold text-brand-ebony text-sm">{userData.connections?.length || 0}</p>
                            <p className="text-[10px] text-brand-ebony/60 uppercase tracking-wider">Connections</p>
                        </div>
                        <div className="w-[1px] bg-brand-ebony/10"></div>
                        <div>
                            <p className="font-bold text-brand-ebony text-sm">{userData.groups?.length || 0}</p>
                            <p className="text-[10px] text-brand-ebony/60 uppercase tracking-wider">Groups</p>
                        </div>
                    </div>

                    <Link
                        href="/profile"
                        className="w-full py-2 bg-brand-burgundy/5 border border-brand-burgundy/20 rounded-xl text-sm font-bold text-brand-burgundy shadow-sm hover:bg-brand-burgundy/10 transition-all text-center uppercase tracking-widest"
                    >
                        Edit Profile
                    </Link>
                </div>
            ) : (
                <div className="mt-8 pt-6 border-t border-brand-ebony/10">
                    <Link
                        href="/login"
                        className="flex items-center px-4 py-3 text-brand-ebony/80 hover:bg-brand-burgundy/5 hover:text-brand-burgundy rounded-full transition-all group"
                    >
                        <User className="h-5 w-5 mr-3 text-brand-ebony/60 group-hover:text-brand-burgundy" />
                        <span className="font-semibold">Sign In</span>
                    </Link>
                </div>
            )}

            <div className="mt-4">
                <Link
                    href="/settings"
                    className="flex items-center px-4 py-3 text-brand-ebony/80 hover:bg-brand-burgundy/5 hover:text-brand-burgundy rounded-full transition-all group"
                >
                    <Settings className="h-5 w-5 mr-3 text-brand-ebony/60 group-hover:text-brand-burgundy" />
                    <span className="font-semibold">Settings</span>
                </Link>
            </div>

            {/* Decorative bottom corner leaf */}
            <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20 pointer-events-none -translate-x-4 translate-y-4">
                <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-ebony">
                    <path d="M40,160 C40,160 80,100 160,100 C160,100 100,160 40,160 Z" />
                    <path d="M40,160 C40,160 20,100 100,80 C100,80 60,140 40,160 Z" opacity="0.7" />
                </svg>
            </div>
        </div>
    );
}
