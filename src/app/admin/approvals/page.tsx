'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShieldCheck, Plus, Loader2, Trash2, Mail, Building2, Sparkles, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { isAuthenticEmailDomain } from '@/lib/validation';

import { Institute } from '@/types';

interface Approval {
    email: string;
    instituteIds: string[];
}

export default function AdminApprovalsPage() {
    const [email, setEmail] = useState('');
    const [selectedInstitutes, setSelectedInstitutes] = useState<string[]>([]);
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFetchLoading(true);
        let instLoaded = false;
        let appLoaded = false;

        const checkLoading = () => {
            if (instLoaded && appLoaded) setFetchLoading(false);
        };

        const unsubscribeInsts = onSnapshot(collection(db, 'institutes'), (snapshot) => {
            setInstitutes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Institute)));
            instLoaded = true;
            checkLoading();
        }, (err) => {
            console.error("error:", err);
            setError("Failed to load institutes.");
            instLoaded = true;
            checkLoading();
        });

        const unsubscribeApps = onSnapshot(collection(db, 'approvals'), (snapshot) => {
            setApprovals(snapshot.docs.map(d => ({ email: d.id, ...d.data() } as Approval)));
            appLoaded = true;
            checkLoading();
        }, (err) => {
            console.error("error:", err);
            setError("Failed to load approvals.");
            appLoaded = true;
            checkLoading();
        });

        const connectionTimeout = setTimeout(() => {
            if (!instLoaded || !appLoaded) {
                setError("Connection timeout. Please check your config.");
                setFetchLoading(false);
            }
        }, 8000);

        return () => {
            unsubscribeInsts();
            unsubscribeApps();
            clearTimeout(connectionTimeout);
        };
    }, []);

    const handleToggleInstitute = (id: string) => {
        setSelectedInstitutes(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedInstitutes.length === 0) {
            setError("Please select at least one institute.");
            return;
        }

        const emailClean = email.trim().toLowerCase();
        
        if (!isAuthenticEmailDomain(emailClean)) {
            setError("Invalid email domain. Please use an authentic provider.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await setDoc(doc(db, 'approvals', emailClean), {
                email: emailClean,
                instituteIds: selectedInstitutes,
                updatedAt: serverTimestamp(),
            });

            setSuccess(`Access granted to ${emailClean}`);
            setEmail('');
            setSelectedInstitutes([]);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (emailToDelete: string) => {
        if (!confirm(`Remove approval for ${emailToDelete}?`)) return;
        try {
            await deleteDoc(doc(db, 'approvals', emailToDelete));
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full animate-fade-up">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-indigo rounded-2xl flex items-center justify-center shadow-xl shadow-brand-burgundy/20">
                         <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-brand-ebony tracking-tight">
                                Access Control
                            </h1>
                            <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
                        </div>
                        <p className="text-brand-ebony/40 font-medium text-sm mt-1 uppercase tracking-widest text-[11px]">Identity Management • Enrollment Validation</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/institutes" className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/10 hover:bg-brand-parchment dark:hover:bg-white/15 border border-brand-ebony/10 dark:border-white/10 rounded-xl transition-all font-bold text-xs tracking-widest uppercase text-brand-ebony/70 dark:text-white/70 hover:text-brand-burgundy dark:hover:text-brand-burgundy">
                        <ChevronLeft className="w-4 h-4" /> Institutes
                    </Link>
                    <Link href="/" className="px-6 py-3 bg-brand-ebony/5 dark:bg-white/5 hover:bg-brand-ebony/10 dark:hover:bg-white/10 rounded-xl transition-all font-bold text-xs tracking-widest uppercase text-brand-ebony/40 dark:text-white/40">
                        Exit
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Card */}
                <div className="lg:col-span-4">
                    <div className="card-premium p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-burgundy/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl z-0 pointer-events-none"></div>
                        
                        <h2 className="text-xl font-serif font-extrabold text-brand-ebony mb-6 relative z-10 flex items-center gap-2">
                             Whitelist Email
                        </h2>
                        
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-[11px] font-bold uppercase tracking-wider animate-in fade-in relative z-10">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-[11px] font-bold uppercase tracking-wider animate-in fade-in relative z-10">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-ebony/40 dark:text-white/40 mb-2 uppercase tracking-[0.2em]">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30 dark:text-white/30" />
                                    <input
                                        type="email"
                                        placeholder="alumni@uni.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-5 py-4 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-burgundy/10 hover:border-brand-burgundy/30 transition-all outline-none text-brand-ebony dark:text-white font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-ebony/40 dark:text-white/40 mb-2 uppercase tracking-[0.2em]">Select Authorized Institutes</label>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto p-3 border border-brand-ebony/5 dark:border-white/5 rounded-2xl bg-brand-ebony/5 dark:bg-white/5 scrollbar-hide">
                                    {institutes.length === 0 ? (
                                        <p className="text-[10px] text-brand-ebony/30 dark:text-white/30 text-center py-4 font-bold uppercase italic tracking-widest">No institutes found</p>
                                    ) : (
                                        institutes.map(inst => (
                                            <div 
                                                key={inst.id} 
                                                onClick={() => handleToggleInstitute(inst.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                                    selectedInstitutes.includes(inst.id) 
                                                        ? 'bg-gradient-indigo text-white border-transparent shadow-sm' 
                                                        : 'bg-white dark:bg-brand-parchment/10 hover:bg-brand-parchment dark:hover:bg-white/10 border-brand-ebony/10 dark:border-white/10 text-brand-ebony dark:text-white'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedInstitutes.includes(inst.id) ? 'bg-white/20 border-white/40' : 'bg-brand-ebony/5 dark:bg-white/5 border-brand-ebony/10 dark:border-white/10'}`}>
                                                    {selectedInstitutes.includes(inst.id) && <Plus className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs font-bold truncate leading-none">{inst.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-indigo text-white rounded-2xl font-bold hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] shimmer overflow-hidden relative"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Grant Access</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Card */}
                <div className="lg:col-span-8">
                    <div className="card-premium overflow-hidden border-brand-ebony/5">
                        <div className="px-8 py-6 border-b border-brand-ebony/5 flex items-center justify-between bg-white/50 dark:bg-brand-parchment/5">
                            <div className="flex items-center gap-3">
                                 <h2 className="text-xl font-serif font-extrabold text-brand-ebony">Whitelisted Accounts</h2>
                                 <span className="bg-brand-ebony/5 text-brand-ebony/50 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border border-brand-ebony/10">{approvals.length} Verified</span>
                            </div>
                        </div>
                        
                        <div className="divide-y divide-brand-ebony/5">
                            {fetchLoading ? (
                                <div className="p-20 text-center text-brand-ebony/20">
                                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 opacity-10" />
                                    <p className="font-serif italic text-lg">Acquiring enrollment logs...</p>
                                </div>
                            ) : approvals.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="w-20 h-20 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-ebony/5">
                                        <Mail className="w-10 h-10 text-brand-ebony/10" />
                                    </div>
                                    <p className="text-brand-ebony/40 text-sm font-bold uppercase tracking-widest">No active approvals</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-px bg-brand-ebony/5">
                                    {approvals.map((app) => (
                                        <div key={app.email} className="bg-white dark:bg-brand-parchment/5 p-6 hover:bg-brand-burgundy/5 transition-all group relative">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                                    <div className="w-12 h-12 rounded-2xl bg-brand-burgundy/5 flex items-center justify-center text-brand-burgundy border border-brand-burgundy/10 group-hover:bg-gradient-indigo group-hover:text-white transition-all shadow-sm shrink-0">
                                                        <Mail className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0 shrink-1">
                                                        <p className="font-extrabold text-brand-ebony dark:text-white truncate leading-tight mb-2 group-hover:text-brand-burgundy transition-colors">{app.email}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {app.instituteIds.map(id => {
                                                                const inst = institutes.find(i => i.id === id);
                                                                return (
                                                                    <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-gold/10 text-brand-gold font-bold text-[9px] uppercase tracking-wider rounded-lg border border-brand-gold/20">
                                                                        <Building2 className="w-3 h-3" />
                                                                        {inst?.name || 'Unknown organization'}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDelete(app.email)}
                                                    className="p-3 text-brand-ebony/20 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100 self-end sm:self-center"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-16 text-center">
                 <p className="text-[10px] font-bold text-brand-ebony/20 uppercase tracking-[0.4em]">Alumnest Identity Core • Whitelist Managed</p>
            </div>
        </div>
    );
}
