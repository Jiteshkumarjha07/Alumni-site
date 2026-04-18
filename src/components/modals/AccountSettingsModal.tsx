'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
    X, Lock, Trash2, PauseCircle, Eye, EyeOff, ChevronLeft,
    AlertTriangle, CheckCircle2, LogOut, ShieldCheck, Sparkles,
    User as UserIcon, ChevronRight, ChevronDown
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    userId: string;
    onAccountDeleted: () => void;
}

type Section = 'menu' | 'change-password' | 'deactivate' | 'delete';

// ── Shared input style ───────────────────────────────────────────────────────
const inputCls = [
    'w-full px-5 py-3.5',
    'bg-brand-ebony/[0.04] border border-brand-ebony/[0.08]',
    'rounded-2xl outline-none',
    'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500',
    'font-semibold text-sm text-brand-ebony placeholder:text-brand-ebony/25',
    'transition-all',
].join(' ');

// ── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-ebony/40 px-1">{label}</p>
            {children}
        </div>
    );
}

// ── Alert banner ─────────────────────────────────────────────────────────────
function AlertBanner({ type, message }: { type: 'error' | 'success'; message: string }) {
    const s = type === 'error'
        ? 'bg-red-500/6 border-red-500/15 text-red-500'
        : 'bg-emerald-500/6 border-emerald-500/15 text-emerald-600';
    const Icon = type === 'error' ? AlertTriangle : CheckCircle2;
    return (
        <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border text-[11px] font-bold leading-relaxed ${s} animate-in slide-in-from-top-2 duration-200`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
        </div>
    );
}

// ── Password input with toggle ───────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = '••••••••' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={inputCls}
                required
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ebony/25 hover:text-indigo-500 transition-colors"
            >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export function AccountSettingsModal({ isOpen, onClose, userEmail, userId, onAccountDeleted }: AccountSettingsModalProps) {
    const [section,           setSection]           = useState<Section>('menu');
    const [loading,           setLoading]           = useState(false);
    const [error,             setError]             = useState('');
    const [success,           setSuccess]           = useState('');

    // Change-password state
    const [currentPw,  setCurrentPw]  = useState('');
    const [newPw,      setNewPw]      = useState('');
    const [confirmPw,  setConfirmPw]  = useState('');

    // Deactivate state
    const [deactDuration, setDeactDuration] = useState('7');
    const [deactPw,       setDeactPw]       = useState('');

    // Delete state
    const [deletePw,         setDeletePw]         = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const reset = () => {
        setSection('menu'); setError(''); setSuccess('');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setDeactPw(''); setDeletePw(''); setDeleteConfirmText('');
    };

    const handleClose = () => { reset(); onClose(); };

    const reauthenticate = async (password: string) => {
        const u = auth.currentUser;
        if (!u || !u.email) throw new Error('Not authenticated');
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setSuccess('');
        if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
        if (newPw.length < 8)   { setError('Password must be at least 8 characters.'); return; }
        setLoading(true);
        try {
            await reauthenticate(currentPw);
            const u = auth.currentUser; if (!u) throw new Error();
            await updatePassword(u, newPw);
            setSuccess('Password updated successfully!');
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err: any) {
            setError(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to update password. Try again.');
        } finally { setLoading(false); }
    };

    const handleDeactivate = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setSuccess('');
        setLoading(true);
        try {
            await reauthenticate(deactPw);
            const reactivateAt = new Date();
            reactivateAt.setDate(reactivateAt.getDate() + parseInt(deactDuration));
            await updateDoc(doc(db, 'users', userId), { isDeactivated: true, deactivatedAt: new Date(), reactivateAt });
            setSuccess(`Account paused for ${deactDuration} days. Signing out…`);
            setTimeout(() => auth.signOut(), 2000);
        } catch { setError('Failed to deactivate. Check your password.'); }
        finally { setLoading(false); }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault(); setError('');
        if (deleteConfirmText !== 'DELETE') { setError('Type DELETE to confirm.'); return; }
        setLoading(true);
        try {
            await reauthenticate(deletePw);
            const u = auth.currentUser; if (!u) throw new Error();
            await deleteDoc(doc(db, 'users', userId));
            await deleteUser(u);
            onAccountDeleted();
        } catch { setError('Failed to delete account. Please try again.'); }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;

    const sectionTitle: Record<Section, string> = {
        'menu': 'Account Settings',
        'change-password': 'Change Password',
        'deactivate': 'Pause Account',
        'delete': 'Delete Account',
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Portal>
            <div
                className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
            >
                <div className="bg-white dark:bg-[#12111a] w-full max-w-md rounded-[2rem] shadow-2xl border border-brand-ebony/8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-6 border-b border-brand-ebony/6 shrink-0">
                        <div className="flex items-center gap-3.5">
                            {section !== 'menu' ? (
                                <button
                                    onClick={() => { setSection('menu'); setError(''); setSuccess(''); }}
                                    className="w-10 h-10 rounded-xl bg-brand-ebony/5 hover:bg-brand-ebony/10 flex items-center justify-center text-brand-ebony/50 hover:text-brand-ebony transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            ) : (
                                <div className="w-10 h-10 bg-gradient-indigo rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-serif font-extrabold text-brand-ebony leading-tight flex items-center gap-2">
                                    {sectionTitle[section]}
                                    <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                                </h2>
                                <p className="text-[10px] font-black text-brand-ebony/30 uppercase tracking-[0.15em] mt-0.5">
                                    {section === 'menu' ? userEmail : 'Manage your digital presence'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-9 h-9 rounded-full hover:bg-brand-ebony/6 text-brand-ebony/30 hover:text-brand-ebony flex items-center justify-center transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ── Scrollable body ─────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">

                        {/* Alerts */}
                        {error   && <AlertBanner type="error"   message={error} />}
                        {success && <AlertBanner type="success" message={success} />}

                        {/* ── MENU ── */}
                        {section === 'menu' && (
                            <div className="space-y-1.5">
                                {[
                                    {
                                        id: 'change-password' as Section,
                                        Icon: Lock,
                                        title: 'Change Password',
                                        sub: 'Update your account password',
                                        iconColor: 'text-indigo-500',
                                        iconBg: 'bg-indigo-500/10',
                                    },
                                    {
                                        id: 'deactivate' as Section,
                                        Icon: PauseCircle,
                                        title: 'Pause Account',
                                        sub: 'Temporarily hide your profile',
                                        iconColor: 'text-amber-500',
                                        iconBg: 'bg-amber-500/10',
                                    },
                                    {
                                        id: 'delete' as Section,
                                        Icon: Trash2,
                                        title: 'Delete Account',
                                        sub: 'Permanently remove your account',
                                        iconColor: 'text-red-500',
                                        iconBg: 'bg-red-500/10',
                                    },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => { setSection(item.id); setError(''); setSuccess(''); }}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-brand-ebony/5 hover:bg-brand-ebony/[0.03] hover:border-brand-ebony/10 transition-all group active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center ${item.iconColor} group-hover:scale-105 transition-transform shrink-0`}>
                                                <item.Icon className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-brand-ebony leading-tight">{item.title}</p>
                                                <p className="text-[11px] text-brand-ebony/40 font-medium mt-0.5">{item.sub}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-brand-ebony/20 group-hover:text-brand-ebony/40 group-hover:translate-x-0.5 transition-all" />
                                    </button>
                                ))}

                                {/* Sign out — separated */}
                                <div className="pt-4 mt-2 border-t border-brand-ebony/6">
                                    <button
                                        onClick={() => auth.signOut()}
                                        className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-red-500/70 hover:text-red-500 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all group active:scale-[0.99]"
                                    >
                                        <div className="w-10 h-10 bg-red-500/8 rounded-xl flex items-center justify-center group-hover:bg-red-500/15 transition-colors shrink-0">
                                            <LogOut className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold leading-tight">Sign Out</p>
                                            <p className="text-[11px] text-red-500/50 font-medium mt-0.5">End your current session</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── CHANGE PASSWORD ── */}
                        {section === 'change-password' && (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <Field label="Current Password">
                                    <PasswordInput value={currentPw} onChange={setCurrentPw} />
                                </Field>
                                <Field label="New Password">
                                    <PasswordInput value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" />
                                </Field>
                                <Field label="Confirm New Password">
                                    <PasswordInput value={confirmPw} onChange={setConfirmPw} />
                                </Field>

                                {/* Strength hint */}
                                {newPw && (
                                    <div className="flex gap-1.5 px-1">
                                        {[4, 6, 8, 10].map((min, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 h-1 rounded-full transition-all ${
                                                    newPw.length >= min
                                                        ? i < 2 ? 'bg-red-400' : i < 3 ? 'bg-amber-400' : 'bg-emerald-400'
                                                        : 'bg-brand-ebony/10'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-indigo text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 transition-all disabled:opacity-40 mt-2"
                                >
                                    {loading ? 'Updating…' : 'Update Password'}
                                </button>
                            </form>
                        )}

                        {/* ── DEACTIVATE ── */}
                        {section === 'deactivate' && (
                            <form onSubmit={handleDeactivate} className="space-y-4">
                                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-2.5">
                                    <div className="flex items-center gap-2 text-[11px] font-black text-amber-600 uppercase tracking-widest">
                                        <AlertTriangle className="w-4 h-4" /> What happens when paused
                                    </div>
                                    <ul className="space-y-1.5 text-[11px] text-amber-700/70 font-medium leading-relaxed">
                                        <li>• Your profile will be hidden from the alumni network</li>
                                        <li>• Posts &amp; messages remain securely stored</li>
                                        <li>• Account auto-reactivates after the chosen period</li>
                                    </ul>
                                </div>

                                <Field label="Pause Duration">
                                    <div className="relative">
                                        <select
                                            value={deactDuration}
                                            onChange={e => setDeactDuration(e.target.value)}
                                            className={`${inputCls} appearance-none cursor-pointer pr-12`}
                                        >
                                            <option value="7">7 days</option>
                                            <option value="14">14 days</option>
                                            <option value="30">30 days</option>
                                            <option value="90">90 days</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ebony/25 pointer-events-none" />
                                    </div>
                                </Field>

                                <Field label="Confirm with Password">
                                    <PasswordInput value={deactPw} onChange={setDeactPw} />
                                </Field>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/20 hover:brightness-110 transition-all disabled:opacity-40"
                                >
                                    {loading ? 'Processing…' : `Pause for ${deactDuration} Days`}
                                </button>
                            </form>
                        )}

                        {/* ── DELETE ── */}
                        {section === 'delete' && (
                            <form onSubmit={handleDeleteAccount} className="space-y-4">
                                <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-2xl space-y-2.5">
                                    <div className="flex items-center gap-2 text-[11px] font-black text-red-500 uppercase tracking-widest">
                                        <Trash2 className="w-4 h-4" /> This cannot be undone
                                    </div>
                                    <ul className="space-y-1.5 text-[11px] text-red-600/65 font-medium leading-relaxed">
                                        <li>• All your posts and comments will be deleted</li>
                                        <li>• Your profile will be removed from all alumni logs</li>
                                        <li>• This action is permanent and irreversible</li>
                                    </ul>
                                </div>

                                <Field label="Confirm with Password">
                                    <PasswordInput value={deletePw} onChange={setDeletePw} />
                                </Field>

                                <Field label={`Type DELETE to confirm`}>
                                    <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={e => setDeleteConfirmText(e.target.value)}
                                        placeholder="DELETE"
                                        className={`${inputCls} border-red-500/20 focus:border-red-500 focus:ring-red-500/10 text-red-600 placeholder:text-red-300 font-black`}
                                        required
                                    />
                                </Field>

                                <button
                                    type="submit"
                                    disabled={loading || deleteConfirmText !== 'DELETE'}
                                    className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 hover:brightness-110 transition-all disabled:opacity-40"
                                >
                                    {loading ? 'Deleting…' : 'Permanently Delete Account'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    );
}
