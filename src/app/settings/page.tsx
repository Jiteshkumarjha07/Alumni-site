'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, Monitor, Bell, User, Info, ArrowLeft, Settings2, Lock, Shield, Trash2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';
import { auth } from '@/lib/firebase';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { userData } = useAuth();
    const [showAccountModal, setShowAccountModal] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const sections = [
        {
            title: 'Appearance',
            icon: Moon,
            items: [
                {
                    label: 'Theme',
                    description: 'Choose how Alumnest looks to you.',
                    content: (
                        <div className="flex p-1.5 bg-brand-ebony/5 rounded-xl gap-1 border border-brand-ebony/10">
                            {[
                                { id: 'light', icon: Sun, label: 'Light' },
                                { id: 'dark', icon: Moon, label: 'Dark' },
                                { id: 'system', icon: Monitor, label: 'System' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setTheme(opt.id as 'light' | 'dark' | 'system')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                        theme === opt.id
                                            ? 'bg-gradient-indigo text-white shadow-md'
                                            : 'text-brand-ebony/40 hover:text-brand-ebony hover:bg-brand-ebony/5'
                                    }`}
                                >
                                    <opt.icon className="w-4 h-4" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    ),
                },
            ],
        },
        {
            title: 'Account',
            icon: User,
            items: [
                {
                    label: 'Profile Information',
                    description: 'Manage your name, profession, and location.',
                    content: (
                        <Link
                            href="/profile"
                            className="text-sm font-bold text-brand-burgundy hover:text-indigo-500 bg-brand-burgundy/10 px-4 py-2 rounded-lg transition-colors border border-brand-burgundy/20"
                        >
                            Go to Profile
                        </Link>
                    ),
                },
                {
                    label: 'Email Address',
                    description: userData?.email || 'Not available',
                    content: null,
                },
            ],
        },
        {
            title: 'Security & Account',
            icon: Shield,
            items: [
                {
                    label: 'Password & Security',
                    description: 'Change your password or manage your session.',
                    content: (
                        <button
                            onClick={() => setShowAccountModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                        >
                            <Lock className="w-4 h-4" />
                            Manage Security
                        </button>
                    ),
                },
                {
                    label: 'Sign Out',
                    description: 'Log out of your current session.',
                    content: (
                        <button
                            onClick={() => auth.signOut()}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-all border border-red-500/20"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    ),
                },
            ],
        },
        {
            title: 'Danger Zone',
            icon: Trash2,
            items: [
                {
                    label: 'Permanent Account Deletion',
                    description: 'This action cannot be undone.',
                    content: (
                        <button
                            onClick={() => setShowAccountModal(true)}
                            className="text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                        >
                            Delete Account
                        </button>
                    ),
                },
            ],
        },
    ];

    if (!mounted) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 md:px-8 animate-fade-up">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-brand-ebony/5 rounded-xl animate-pulse" />
                    <div className="w-32 h-8 bg-brand-ebony/5 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-6">
                    <div className="h-48 bg-brand-ebony/5 rounded-[2.5rem] animate-pulse" />
                    <div className="h-64 bg-brand-ebony/5 rounded-[2.5rem] animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 md:px-8 animate-fade-up">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/"
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-brand-ebony/60 hover:text-brand-ebony border border-brand-ebony/5 card-premium backdrop-blur-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="page-header-accent glow-indigo"></div>
                    <h1 className="text-3xl font-serif font-extrabold text-brand-ebony tracking-tight flex items-center gap-2">
                         Settings
                         <Settings2 className="w-6 h-6 text-brand-ebony/20" />
                    </h1>
                </div>
            </div>

            <div className="space-y-6">
                {sections.map((section) => (
                    <div
                        key={section.title}
                        className="card-premium overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(79,70,229,0.06)]"
                    >
                        <div className="px-6 py-4 bg-gradient-to-r from-brand-burgundy/5 to-transparent border-b border-brand-ebony/5 flex items-center gap-3">
                            <section.icon className="w-5 h-5 text-brand-burgundy" />
                            <h2 className="font-semibold text-brand-ebony uppercase tracking-widest text-xs">
                                {section.title}
                            </h2>
                        </div>
                        <div className="divide-y divide-brand-ebony/5">
                            {section.items.map((item) => (
                                <div
                                    key={item.label}
                                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div>
                                        <h3 className="font-bold text-sm text-brand-ebony">{item.label}</h3>
                                        <p className="text-xs text-brand-ebony/50 mt-1 font-medium">
                                            {item.description}
                                        </p>
                                    </div>
                                    <div className="shrink-0">{item.content}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center p-8 border-t border-brand-ebony/10">
                <div className="flex items-center justify-center gap-2 mb-2 text-brand-gold">
                    <Info className="w-4 h-4" />
                    <span className="font-serif italic text-sm">About Alumnest</span>
                </div>
                <p className="text-xs font-bold text-brand-ebony/30 uppercase tracking-[0.3em]">
                    Version 1.2.0 • For the Tribe
                </p>
            </div>


            {userData && (
                <AccountSettingsModal 
                    isOpen={showAccountModal} 
                    onClose={() => setShowAccountModal(false)} 
                    userEmail={userData.email || ''} 
                    userId={userData.uid} 
                    onAccountDeleted={() => window.location.href = '/signup'} 
                />
            )}
        </div>
    );
}
