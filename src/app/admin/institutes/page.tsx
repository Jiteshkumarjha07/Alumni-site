'use client';

import { useState, useEffect } from 'react';
import { collection, doc, serverTimestamp, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shield, Plus, Loader2, Trash2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

import { Institute } from '@/types';

export default function AdminInstitutesPage() {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
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
                setError("CRITICAL ERROR: Unable to connect to Firebase. Please ensure you have clicked 'Create database' under Firestore Database in the Firebase Console and that your config in firebase-config.ts is correct.");
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
        
        if (!trimmedName) {
            setError("No institute added. Please enter a valid institute name.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Generate document reference
            const newDocRef = doc(collection(db, 'institutes'));
            const writePromise = setDoc(newDocRef, {
                name: trimmedName,
                createdAt: serverTimestamp(),
            });

            // Enforce a 15-second timeout to prevent infinite "buffering" if network drops or is blocked
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout: Could not reach the database after 15 seconds.")), 15000));
            await Promise.race([writePromise, timeoutPromise]);

            setSuccess(`Successfully created institute "${trimmedName}".`);
            setName('');
        } catch (err: any) {
            console.error("DEBUG: Create institute error raw:", err);
            
            const errorCode = err.code || '';
            const errorMessage = err.message || '';
            
            if (errorCode === 'permission-denied' || errorMessage.includes('permission-denied')) {
                setError("Permission Denied: Your Firestore rules are blocking this action. Please check Step 6 of FIREBASE_SETUP.md.");
            } else if (errorCode === 'unavailable') {
                setError("Firebase Service Unavailable: Please check your internet connection or Firebase project status.");
            } else if (errorMessage.includes('timeout')) {
                setError("Network Timeout: The database did not respond in 15 seconds. This usually means a connection blockage (ISP, Firewall) or that the database hasn't been created yet.");
            } else {
                setError(`Error (${errorCode || 'unknown'}): ${errorMessage || 'Failed to create institute.'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, instName: string) => {
        if (!confirm(`Are you sure you want to delete "${instName}"? This will not delete users but may cause issues for them.`)) return;
        
        try {
            // onSnapshot automatically removes it from the UI instantly
            await deleteDoc(doc(db, 'institutes', id));
        } catch (err) {
            setError("Failed to delete institute.");
        }
    };

    return (
        <div className="p-4 md:p-8 relative overflow-hidden">
            {/* Decorative Background Leaves */}
            <div className="absolute top-0 left-0 w-64 h-64 opacity-5 pointer-events-none -translate-x-1/4 -translate-y-1/4 rotate-45">
                <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-ebony">
                    <path d="M40,100 C40,100 80,40 160,40 C160,40 100,100 40,100 Z" />
                </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 opacity-5 pointer-events-none translate-x-1/4 translate-y-1/4 -rotate-12">
                <svg viewBox="0 0 200 200" className="w-full h-full fill-brand-ebony">
                    <path d="M40,100 C40,100 80,40 160,40 C160,40 100,100 40,100 Z" />
                </svg>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-brand-ebony flex items-center gap-2">
                            <Shield className="w-8 h-8 text-brand-burgundy" />
                            Institute Setup
                        </h1>
                        <p className="text-brand-ebony/60">Add and manage multi-tenant organizations.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/admin/approvals" className="text-brand-burgundy hover:underline font-bold text-sm uppercase tracking-widest">
                            Manage Approvals
                        </Link>
                        <Link href="/signup" className="text-brand-ebony/60 hover:text-brand-ebony font-bold text-sm uppercase tracking-widest">
                            Sign Up
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-brand-parchment/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-brand-ebony/10 sticky top-8 transition-colors duration-300">
                            <h2 className="text-xl font-serif font-bold text-brand-ebony mb-4">Add New</h2>
                            
                            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-brand-ebony/70 mb-2 uppercase tracking-widest">Institute Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Stanford University"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-3 bg-brand-ebony/5 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 outline-none text-brand-ebony"
                                                required
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Add Institute</>}
                                        </button>
                                    </form>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2">
                        <div className="bg-brand-parchment/60 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-brand-ebony/10 transition-colors duration-300">
                            <div className="p-6 border-b border-brand-ebony/10 bg-brand-ebony/5">
                                <h2 className="text-xl font-serif font-bold text-brand-ebony">Existing Institutes</h2>
                            </div>
                            
                            <div className="divide-y divide-brand-ebony/5">
                                {fetchLoading ? (
                                    <div className="p-12 text-center text-brand-ebony/40 font-serif italic">Loading institutes...</div>
                                ) : institutes.length === 0 ? (
                                    <div className="p-12 text-center text-brand-ebony/40 font-serif italic">No institutes found.</div>
                                ) : (
                                    institutes.map((inst) => (
                                        <div key={inst.id} className="p-4 hover:bg-brand-parchment/10 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-brand-burgundy/5 flex items-center justify-center text-brand-burgundy">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-ebony">{inst.name}</p>
                                                    <p className="text-[10px] text-brand-ebony/40 uppercase tracking-widest font-bold">
                                                        ID: {inst.id}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(inst.id, inst.name)}
                                                className="p-2 text-brand-ebony/20 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
