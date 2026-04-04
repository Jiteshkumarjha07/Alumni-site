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
                className="w-full flex items-center justify-between px-4 py-3 bg-brand-burgundy/10 border border-brand-burgundy/20 rounded-2xl hover:bg-brand-burgundy/20 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-burgundy/20 rounded-lg text-brand-burgundy">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-brand-burgundy uppercase tracking-widest">Active Account</p>
                        <p className="text-sm font-bold text-brand-ebony truncate max-w-[120px]">{userData.instituteName}</p>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-brand-ebony/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-brand-parchment rounded-2xl shadow-2xl border border-brand-ebony/10 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2">
                        <p className="px-3 py-2 text-[10px] font-bold text-brand-ebony/40 uppercase tracking-widest border-b border-brand-ebony/5 mb-1">
                            Switch Institute
                        </p>
                        {institutes.map((inst) => (
                            <button
                                key={inst.id}
                                onClick={() => handleSwitch(inst.id, inst.name)}
                                disabled={switching !== null}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                                    inst.id === userData.instituteId 
                                    ? 'bg-brand-burgundy text-white shadow-md' 
                                    : 'text-brand-ebony hover:bg-brand-burgundy/10'
                                }`}
                            >
                                <span className="text-sm font-medium truncate pr-2">{inst.name}</span>
                                {switching === inst.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin opacity-60" />
                                ) : inst.id === userData.instituteId ? (
                                    <Check className="w-4 h-4" />
                                ) : null}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
