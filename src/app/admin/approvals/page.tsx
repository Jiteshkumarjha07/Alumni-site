'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShieldCheck, Plus, Loader2, Trash2, Mail, Building2, Sparkles, ChevronLeft, Phone } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { isAuthenticEmailDomain, isValidPhoneNumber, normalizePhone } from '@/lib/validation';

import { Institute } from '@/types';

interface Approval {
    email: string; // document ID (email or phone)
    phone?: string;
    instituteIds: string[];
}

export default function AdminApprovalsPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && userData && !userData.isAdmin && !userData.isinsadmin) {
            router.replace('/');
        }
    }, [userData, authLoading, router]);

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [bulkInput, setBulkInput] = useState('');
    const [selectedInstitutes, setSelectedInstitutes] = useState<string[]>([]);
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Helper to parse and validate bulk input
    const parseBulkInput = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const validEntries: { email?: string; phone?: string; docId: string }[] = [];
        const invalidLines: string[] = [];

        lines.forEach(line => {
            const tokens = line.split(/[,;\s\t]+/).map(t => t.trim()).filter(Boolean);
            let lineEmail: string | undefined;
            let linePhone: string | undefined;
            let hasInvalidToken = false;

            tokens.forEach(token => {
                if (token.includes('@')) {
                    const cleanedEmail = token.toLowerCase();
                    if (isAuthenticEmailDomain(cleanedEmail)) {
                        lineEmail = cleanedEmail;
                    } else {
                        hasInvalidToken = true;
                    }
                } else {
                    const cleanedPhone = normalizePhone(token);
                    if (isValidPhoneNumber(cleanedPhone)) {
                        linePhone = cleanedPhone;
                    } else {
                        hasInvalidToken = true;
                    }
                }
            });

            if ((lineEmail || linePhone) && !hasInvalidToken) {
                validEntries.push({
                    email: lineEmail,
                    phone: linePhone,
                    docId: lineEmail || linePhone || ''
                });
            } else {
                invalidLines.push(line);
            }
        });

        return { validEntries, invalidLines };
    };

    const { validEntries, invalidLines } = parseBulkInput(bulkInput);

    useEffect(() => {
        if (userData?.isinsadmin && !userData.isAdmin && userData.instituteId) {
            setSelectedInstitutes([userData.instituteId]);
        }
    }, [userData]);

    useEffect(() => {
        if (!userData || (!userData.isAdmin && !userData.instituteId)) {
            setFetchLoading(false);
            return;
        }
        setFetchLoading(true);
        let instLoaded = false;
        let appLoaded = false;

        const checkLoading = () => {
            if (instLoaded && appLoaded) setFetchLoading(false);
        };

        const unsubscribeInsts = onSnapshot(collection(db, 'institutes'), (snapshot) => {
            const allInsts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Institute));
            if (userData?.isAdmin) {
                setInstitutes(allInsts);
            } else if (userData?.isinsadmin && userData?.instituteId) {
                setInstitutes(allInsts.filter(i => i.id === userData.instituteId));
            }
            instLoaded = true;
            checkLoading();
        }, (err) => {
            console.error("error:", err);
            setError("Failed to load institutes.");
            instLoaded = true;
            checkLoading();
        });

        const approvalsRef = collection(db, 'approvals');
        const appQuery = userData?.isAdmin 
            ? approvalsRef 
            : query(approvalsRef, where('instituteIds', 'array-contains', userData?.instituteId));

        const unsubscribeApps = onSnapshot(appQuery, (snapshot) => {
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

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (activeTab === 'single') {
                const emailClean = email.trim().toLowerCase();
                const phoneClean = phone.trim() ? normalizePhone(phone.trim()) : '';

                // At least one identifier is required
                if (!emailClean && !phoneClean) {
                    setError("Please enter at least an email address or a mobile number.");
                    setLoading(false);
                    return;
                }

                // Validate email if provided
                if (emailClean && !isAuthenticEmailDomain(emailClean)) {
                    setError("Invalid email domain. Please use an authentic provider.");
                    setLoading(false);
                    return;
                }

                // Validate phone if provided
                if (phoneClean && !isValidPhoneNumber(phoneClean)) {
                    setError("Invalid mobile number. Please use international format (e.g. +919876543210).");
                    setLoading(false);
                    return;
                }

                const docId = emailClean || phoneClean;

                const approvalData: any = {
                    instituteIds: arrayUnion(...selectedInstitutes),
                    updatedAt: serverTimestamp(),
                };
                if (emailClean) approvalData.email = emailClean;
                if (phoneClean) approvalData.phone = phoneClean;

                // 1. Write the approval entry using merge to preserve other institutes
                await setDoc(doc(db, 'approvals', docId), approvalData, { merge: true });

                // 2. Update existing user doc if it exists (add institute IDs and restore if suspended)
                const usersRef = collection(db, 'users');
                const queries: Promise<any>[] = [];
                if (emailClean) {
                    queries.push(getDocs(query(usersRef, where('email', '==', emailClean))));
                }
                if (phoneClean) {
                    queries.push(getDocs(query(usersRef, where('phone', '==', phoneClean))));
                }

                const snapshots = await Promise.all(queries);
                const allUserDocs = new Map<string, any>();
                snapshots.forEach(snap => {
                    snap.docs.forEach((userDoc: any) => {
                        allUserDocs.set(userDoc.id, userDoc);
                    });
                });

                let restoredCount = 0;
                const updatePromises = Array.from(allUserDocs.values()).map(userDoc => {
                    const data = userDoc.data();
                    const updates: any = {
                        instituteIds: arrayUnion(...selectedInstitutes)
                    };
                    if (phoneClean && !data.phone) {
                        updates.phone = phoneClean;
                    }
                    if (data.isSuspended) {
                        updates.isSuspended = false;
                        restoredCount++;
                    }
                    return updateDoc(doc(db, 'users', userDoc.id), updates);
                });
                await Promise.all(updatePromises);

                const identifier = emailClean || phoneClean;
                setSuccess(`Access granted to ${identifier}${restoredCount > 0 ? ' — account restored.' : '.'}`);
                setEmail('');
                setPhone('');
                setSelectedInstitutes([]);
            } else {
                // BULK MODE
                const { validEntries } = parseBulkInput(bulkInput);

                if (validEntries.length === 0) {
                    setError("No valid entries found to whitelist.");
                    setLoading(false);
                    return;
                }

                // Split into batches of 400 for safety
                const BATCH_LIMIT = 400;
                let processedCount = 0;
                let restoredCount = 0;

                // 1. Process approvals in batches
                for (let i = 0; i < validEntries.length; i += BATCH_LIMIT) {
                    const chunk = validEntries.slice(i, i + BATCH_LIMIT);
                    const batch = writeBatch(db);

                    chunk.forEach(entry => {
                        const approvalData: any = {
                            instituteIds: arrayUnion(...selectedInstitutes),
                            updatedAt: serverTimestamp(),
                        };
                        if (entry.email) approvalData.email = entry.email;
                        if (entry.phone) approvalData.phone = entry.phone;

                        batch.set(doc(db, 'approvals', entry.docId), approvalData, { merge: true });
                        processedCount++;
                    });

                    await batch.commit();
                }

                // 2. Query and restore matching user documents in chunks of 30
                const usersRef = collection(db, 'users');
                const CHUNK_SIZE = 30;

                // Gather list of valid emails and valid phones for querying
                const emailsToQuery = validEntries.map(e => e.email).filter(Boolean) as string[];
                const phonesToQuery = validEntries.map(e => e.phone).filter(Boolean) as string[];

                // Query for emails in chunks
                const emailChunks: string[][] = [];
                for (let i = 0; i < emailsToQuery.length; i += CHUNK_SIZE) {
                    emailChunks.push(emailsToQuery.slice(i, i + CHUNK_SIZE));
                }

                // Query for phones in chunks
                const phoneChunks: string[][] = [];
                for (let i = 0; i < phonesToQuery.length; i += CHUNK_SIZE) {
                    phoneChunks.push(phonesToQuery.slice(i, i + CHUNK_SIZE));
                }

                const userSnapshotsPromises: Promise<any>[] = [];

                emailChunks.forEach(chunk => {
                    userSnapshotsPromises.push(getDocs(query(usersRef, where('email', 'in', chunk))));
                });

                phoneChunks.forEach(chunk => {
                    userSnapshotsPromises.push(getDocs(query(usersRef, where('phone', 'in', chunk))));
                });

                const snapshots = await Promise.all(userSnapshotsPromises);
                const allUserDocs = new Map<string, any>();
                snapshots.forEach(snap => {
                    snap.docs.forEach((userDoc: any) => {
                        allUserDocs.set(userDoc.id, userDoc);
                    });
                });

                // Update users in batches
                const userDocsArray = Array.from(allUserDocs.values());
                for (let i = 0; i < userDocsArray.length; i += BATCH_LIMIT) {
                    const chunk = userDocsArray.slice(i, i + BATCH_LIMIT);
                    const batch = writeBatch(db);

                    chunk.forEach(userDoc => {
                        const data = userDoc.data();
                        const updates: any = {
                            instituteIds: arrayUnion(...selectedInstitutes)
                        };
                        const matchingEntry = validEntries.find(e => e.email === data.email || e.phone === data.phone);
                        if (matchingEntry?.phone && !data.phone) {
                            updates.phone = matchingEntry.phone;
                        }
                        if (data.isSuspended) {
                            updates.isSuspended = false;
                            restoredCount++;
                        }
                        batch.update(doc(db, 'users', userDoc.id), updates);
                    });

                    await batch.commit();
                }

                setSuccess(`Successfully whitelisted ${processedCount} account(s)${restoredCount > 0 ? ` — ${restoredCount} account(s) restored.` : '.'}`);
                setBulkInput('');
                setSelectedInstitutes([]);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (emailToDelete: string) => {
        if (!confirm(`Remove approval for ${emailToDelete}? This will immediately suspend their account.`)) return;
        try {
            // 1. Remove from approvals list (scoped if institute admin)
            if (userData?.isAdmin) {
                await deleteDoc(doc(db, 'approvals', emailToDelete));
            } else if (userData?.instituteId) {
                await updateDoc(doc(db, 'approvals', emailToDelete), {
                    instituteIds: arrayRemove(userData.instituteId)
                });
            }

            // 2. Find the matching user and suspend them (scoped if institute admin)
            const usersRef = collection(db, 'users');
            // Search by email or phone since the key could be either
            const isPhone = emailToDelete.startsWith('+');
            const field = isPhone ? 'phone' : 'email';

            const q = userData?.isAdmin 
                ? query(usersRef, where(field, '==', emailToDelete))
                : query(usersRef, where(field, '==', emailToDelete), where('instituteId', '==', userData?.instituteId));
            
            const userSnap = await getDocs(q);
            const updatePromises = userSnap.docs.map(userDoc =>
                updateDoc(doc(db, 'users', userDoc.id), { isSuspended: true })
            );
            await Promise.all(updatePromises);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        }
    };

    // Guard: only global admins or institute admins may use this page
    if (userData && !userData.isAdmin && !userData.isinsadmin) {
        router.replace('/');
        return null;
    }

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
                <div className="lg:col-span-4 lg:sticky lg:top-8 z-20 max-h-[calc(100vh-4rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="card-premium p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-burgundy/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl z-0 pointer-events-none"></div>
                        
                        <h2 className="text-xl font-serif font-extrabold text-brand-ebony mb-4 relative z-10 flex items-center gap-2">
                             Whitelist Member
                        </h2>

                        {/* Tabs Switch */}
                        <div className="flex bg-brand-ebony/5 dark:bg-white/5 p-1 rounded-xl mb-6 relative z-10">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('single'); setError(null); setSuccess(null); }}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'single'
                                        ? 'bg-white dark:bg-brand-parchment/10 text-brand-burgundy shadow-sm'
                                        : 'text-brand-ebony/40 dark:text-white/40 hover:text-brand-ebony dark:hover:text-white'
                                }`}
                            >
                                Single Entry
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('bulk'); setError(null); setSuccess(null); }}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'bulk'
                                        ? 'bg-white dark:bg-brand-parchment/10 text-brand-burgundy shadow-sm'
                                        : 'text-brand-ebony/40 dark:text-white/40 hover:text-brand-ebony dark:hover:text-white'
                                }`}
                            >
                                Bulk Upload
                            </button>
                        </div>
                        
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

                        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                            {activeTab === 'single' ? (
                                <>
                                    {/* Email */}
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
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-brand-ebony/40 dark:text-white/40 mb-2 uppercase tracking-[0.2em]">Mobile Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/30 dark:text-white/30" />
                                            <input
                                                type="tel"
                                                placeholder="+919876543210"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-burgundy/10 hover:border-brand-burgundy/30 transition-all outline-none text-brand-ebony dark:text-white font-medium"
                                            />
                                        </div>
                                        <p className="text-[9px] text-brand-ebony/30 dark:text-white/30 mt-1.5 px-1 font-bold uppercase tracking-wider">Include country code (e.g. +91)</p>
                                    </div>

                                    <div className="flex items-center gap-2 px-1">
                                        <div className="flex-1 h-px bg-brand-ebony/5"></div>
                                        <span className="text-[9px] font-bold text-brand-ebony/20 uppercase tracking-[0.3em]">At least one required</span>
                                        <div className="flex-1 h-px bg-brand-ebony/5"></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Bulk Textarea */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-brand-ebony/40 dark:text-white/40 mb-2 uppercase tracking-[0.2em]">Paste Emails & Mobile Numbers</label>
                                        <textarea
                                            placeholder="Enter multiple entries separated by commas, newlines or spaces. E.g.&#10;alumni1@uni.edu&#10;+919876543210&#10;alumni2@uni.edu, +1234567890"
                                            value={bulkInput}
                                            onChange={(e) => setBulkInput(e.target.value)}
                                            rows={5}
                                            className="w-full px-5 py-4 bg-brand-ebony/5 dark:bg-white/5 border border-brand-ebony/10 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-burgundy/10 hover:border-brand-burgundy/30 transition-all outline-none text-brand-ebony dark:text-white font-medium text-xs resize-none"
                                        />
                                    </div>

                                    {/* Live Validation Badges */}
                                    {bulkInput.trim().length > 0 && (
                                        <div className="p-3 bg-brand-ebony/5 dark:bg-white/5 rounded-xl space-y-1.5 animate-in fade-in">
                                            <p className="text-[9px] font-bold text-brand-ebony/40 dark:text-white/40 uppercase tracking-wider">Live Parser Results (Newline Separated):</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {validEntries.filter(e => e.email && e.phone).length > 0 && (
                                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-emerald-500/20">
                                                        {validEntries.filter(e => e.email && e.phone).length} Email & Phone
                                                    </span>
                                                )}
                                                {validEntries.filter(e => e.email && !e.phone).length > 0 && (
                                                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-indigo-500/20">
                                                        {validEntries.filter(e => e.email && !e.phone).length} Email Only
                                                    </span>
                                                )}
                                                {validEntries.filter(e => !e.email && e.phone).length > 0 && (
                                                    <span className="px-2.5 py-1 bg-sky-500/10 text-sky-600 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-sky-500/20">
                                                        {validEntries.filter(e => !e.email && e.phone).length} Phone Only
                                                    </span>
                                                )}
                                                {invalidLines.length > 0 && (
                                                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-amber-500/20">
                                                        {invalidLines.length} Invalid Line(s) (ignored)
                                                    </span>
                                                )}
                                                {validEntries.length === 0 && (
                                                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">No valid entries parsed yet</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Institutes */}
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
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : activeTab === 'single' ? <><Plus className="w-5 h-5" /> Grant Access</> : <><Plus className="w-5 h-5" /> Grant Bulk Access</>}
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
                                                        {app.email.startsWith('+') ? <Phone className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                                                    </div>
                                                    <div className="min-w-0 shrink-1">
                                                        <p className="font-extrabold text-brand-ebony dark:text-white truncate leading-tight mb-1 group-hover:text-brand-burgundy transition-colors">{app.email}</p>
                                                        {/* Show secondary identifier if both exist */}
                                                        {app.phone && !app.email.startsWith('+') && (
                                                            <p className="text-[10px] text-brand-ebony/40 font-bold flex items-center gap-1.5 mb-1.5">
                                                                <Phone className="w-3 h-3" /> {app.phone}
                                                            </p>
                                                        )}
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
