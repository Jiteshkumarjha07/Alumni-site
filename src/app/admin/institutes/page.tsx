'use client';

import { useState, useEffect } from 'react';
import { collection, doc, serverTimestamp, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shield, Plus, Loader2, Trash2, Building2, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

import { Institute } from '@/types';

export default function AdminInstitutesPage() {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFetchLoading(true);
        let hasLoaded = false;

        const unsubscribe = onSnapshot(collection(db, 'institutes'), (snapshot) => {
            hasLoaded = true;
            setInstitutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institute)));
            setFetchLoading(false);
        }, (err) => {
            hasLoaded = true;
            console.error("Fetch error:", err);
            setError("Failed to load institutes.");
            setFetchLoading(false);
        });

        const connectionTimeout = setTimeout(() => {
            if (!hasLoaded) {
                setError("Connection timeout. Please check your credentials.");
                setFetchLoading(false);
            }
        }, 8000);

        return () => {
            unsubscribe();
            clearTimeout(connectionTimeout);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const newDocRef = doc(collection(db, 'institutes'));
            await setDoc(newDocRef, {
                name: trimmedName,
                createdAt: serverTimestamp(),
            });

            setSuccess(`Successfully added ${trimmedName}.`);
            setName('');
        } catch (err: any) {
            setError(`Error: ${err.message || 'Failed to create institute.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string) => {
        const trimmedName = editName.trim();
        if (!trimmedName) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await updateDoc(doc(db, 'institutes', id), {
                name: trimmedName
            });
            setSuccess(`Successfully updated to ${trimmedName}.`);
            setEditingId(null);
        } catch (err: any) {
            setError(`Error: ${err.message || 'Failed to update institute.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, instName: string) => {
        if (!confirm(`Are you sure you want to delete "${instName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'institutes', id));
        } catch (err) {
            setError("Failed to delete institute.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full animate-fade-up">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-indigo rounded-2xl flex items-center justify-center shadow-xl shadow-brand-burgundy/20">
                         <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-brand-ebony tracking-tight">
                                Institute Control
                            </h1>
                            <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
                        </div>
                        <p className="text-brand-ebony/40 font-medium text-sm mt-1 uppercase tracking-widest text-[11px]">System Administration • Multi-Tenancy</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/approvals" className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/10 hover:bg-brand-parchment dark:hover:bg-white/15 border border-brand-ebony/10 dark:border-white/10 rounded-xl transition-all font-bold text-xs tracking-widest uppercase text-brand-ebony/70 dark:text-white/70 hover:text-brand-burgundy">
                        Approvals <ChevronRight className="w-4 h-4" />
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
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-burgundy/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-brand-burgundy/10 transition-colors"></div>
                        
                        <h2 className="text-xl font-serif font-extrabold text-brand-ebony mb-6 flex items-center gap-2">
                             New Organization
                        </h2>
                        
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-[11px] font-bold uppercase tracking-wider animate-in fade-in">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-[11px] font-bold uppercase tracking-wider animate-in fade-in">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-ebony/40 dark:text-white/40 mb-2 uppercase tracking-[0.2em]">Full Institute Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Stanford University"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-5 py-4 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-burgundy/10 hover:border-brand-burgundy/30 transition-all outline-none text-brand-ebony dark:text-white font-medium"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-indigo text-white rounded-2xl font-bold hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] shimmer overflow-hidden relative"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Register Now</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Card */}
                <div className="lg:col-span-8">
                    <div className="card-premium overflow-hidden border-brand-ebony/5">
                        <div className="px-8 py-6 border-b border-brand-ebony/5 flex items-center justify-between bg-white/50 dark:bg-brand-parchment/5">
                            <h2 className="text-xl font-serif font-extrabold text-brand-ebony">Existing Network</h2>
                            <span className="bg-brand-ebony/5 text-brand-ebony/50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{institutes.length} Institutes</span>
                        </div>
                        
                        <div className="divide-y divide-brand-ebony/5">
                            {fetchLoading ? (
                                <div className="p-20 text-center text-brand-ebony/20">
                                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 opacity-10" />
                                    <p className="font-serif italic text-lg">Acquiring directories...</p>
                                </div>
                            ) : institutes.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="w-20 h-20 bg-brand-ebony/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Building2 className="w-10 h-10 text-brand-ebony/10" />
                                    </div>
                                    <p className="text-brand-ebony/40 text-sm font-bold uppercase tracking-widest">Workspace is empty</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-brand-ebony/5">
                                    {institutes.map((inst) => (
                                        <div key={inst.id} className="bg-white dark:bg-brand-parchment/5 p-6 hover:bg-brand-burgundy/5 transition-all group relative">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                                    <div className="w-12 h-12 rounded-2xl bg-brand-burgundy/5 flex items-center justify-center text-brand-burgundy border border-brand-burgundy/10 group-hover:bg-gradient-indigo group-hover:text-white transition-all shadow-sm shrink-0">
                                                        <Building2 className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        {editingId === inst.id ? (
                                                            <div className="flex items-center gap-3">
                                                                <input 
                                                                    type="text" 
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                    className="flex-1 px-3 py-2 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-xl outline-none text-brand-ebony dark:text-white text-sm font-bold"
                                                                    autoFocus
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => handleUpdate(inst.id)}
                                                                        disabled={loading}
                                                                        className="px-3 py-2 bg-brand-burgundy text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all flex-shrink-0"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingId(null)}
                                                                        className="px-3 py-2 bg-brand-ebony/10 dark:bg-white/10 text-brand-ebony dark:text-white rounded-xl text-xs font-bold hover:bg-brand-ebony/20 dark:hover:bg-white/20 transition-all flex-shrink-0"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="font-extrabold text-brand-ebony dark:text-white truncate leading-tight group-hover:text-brand-burgundy transition-colors">{inst.name}</p>
                                                                <p className="text-[9px] text-brand-ebony/30 dark:text-white/30 uppercase tracking-[0.2em] font-bold mt-1">
                                                                    Ref: {inst.id.substring(0, 12)}...
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingId !== inst.id && (
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all self-end sm:self-center shrink-0">
                                                        <button 
                                                            onClick={() => { setEditingId(inst.id); setEditName(inst.name); }}
                                                            className="p-3 text-brand-ebony/40 dark:text-white/40 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(inst.id, inst.name)}
                                                            className="p-3 text-brand-ebony/40 dark:text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
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
                 <p className="text-[10px] font-bold text-brand-ebony/20 uppercase tracking-[0.4em]">Alumnest Security Core • Port 443 Locked</p>
            </div>
        </div>
    );
}
