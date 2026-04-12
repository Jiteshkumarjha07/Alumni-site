'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronDown, Building2, Check, RefreshCw } from 'lucide-react';

export function InstituteSwitcher() {
    const { userData, switchInstitute } = useAuth();
    const [institutes, setInstitutes] = useState<{ id: string, name: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState<string | null>(null);

    useEffect(() => {
        if (!userData?.instituteIds || userData.instituteIds.length === 0) return;

        const fetchNames = async () => {
            try {
                const results: { id: string, name: string }[] = [];
                // Fetch each institute document by its ID using getDoc
                for (const id of userData.instituteIds!) {
                    const instSnap = await getDoc(doc(db, 'institutes', id));
                    if (instSnap.exists()) {
                        results.push({ id, name: instSnap.data().name });
                    }
                }
                setInstitutes(results);
            } catch (err) {
                console.error('Error fetching institute names for switcher:', err);
            }
        };

        fetchNames();
    }, [userData?.instituteIds]);

    if (!userData || institutes.length <= 1) return null;

    const handleSwitch = async (id: string, name: string) => {
        if (id === userData.instituteId) {
            setIsOpen(false);
            return;
        }
        
        setSwitching(id);
        await switchInstitute(id, name);
        setSwitching(null);
        setIsOpen(false);
    };

    return (
        <div className="relative mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-3 bg-white dark:bg-white/10 border border-brand-ebony/5 dark:border-white/10 rounded-[1.5rem] hover:shadow-premium hover:border-brand-burgundy/20 dark:hover:border-brand-burgundy/40 transition-all duration-300 group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-burgundy to-[#4a1c1f] flex items-center justify-center text-white shadow-lg shadow-brand-burgundy/20 shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div className="text-left overflow-hidden">
                        <p className="text-[8px] font-black text-brand-burgundy/70 dark:text-brand-burgundy uppercase tracking-[0.2em] mb-0.5">Active Network</p>
                        <p className="text-[11px] font-extrabold text-brand-ebony dark:text-white truncate max-w-[90px] md:max-w-[120px]">{userData.instituteName}</p>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-brand-ebony/40 dark:text-white/50 group-hover:text-brand-burgundy transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-gray-900 backdrop-blur-2xl rounded-2xl shadow-premium border border-white dark:border-white/10 overflow-hidden z-[60] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ring-1 ring-brand-ebony/5 dark:ring-white/5">
                    <div className="p-2 space-y-1">
                        <p className="px-3 py-2 text-[9px] font-black text-brand-ebony/40 dark:text-white/50 uppercase tracking-[0.2em] border-b border-brand-ebony/5 dark:border-white/10 mb-2">
                            Select Network
                        </p>
                        {institutes.map((inst) => (
                            <button
                                key={inst.id}
                                onClick={() => handleSwitch(inst.id, inst.name)}
                                disabled={switching !== null}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-left group ${
                                    inst.id === userData.instituteId 
                                    ? 'bg-gradient-to-r from-brand-burgundy/10 to-transparent text-brand-burgundy dark:text-brand-burgundy border border-brand-burgundy/15 dark:border-brand-burgundy/30 shadow-sm' 
                                    : 'text-brand-ebony/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 border border-transparent'
                                }`}
                            >
                                <span className={`text-[11px] font-extrabold truncate pr-2 ${inst.id === userData.instituteId ? 'text-brand-burgundy' : 'group-hover:text-brand-ebony dark:group-hover:text-white'}`}>{inst.name}</span>
                                {switching === inst.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-burgundy opacity-60 shrink-0" />
                                ) : inst.id === userData.instituteId ? (
                                    <Check className="w-3.5 h-3.5 shrink-0 text-brand-burgundy" />
                                ) : null}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
