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
import { X, Lock, Trash2, PauseCircle, Eye, EyeOff, ChevronRight, AlertTriangle, CheckCircle2, LogOut, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    userId: string;
    onAccountDeleted: () => void;
}

type Section = 'menu' | 'change-password' | 'deactivate' | 'delete';

export function AccountSettingsModal({ isOpen, onClose, userEmail, userId, onAccountDeleted }: AccountSettingsModalProps) {
    const [section, setSection] = useState<Section>('menu');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Deactivate state
    const [deactivateDuration, setDeactivateDuration] = useState('7');
    const [deactivatePassword, setDeactivatePassword] = useState('');

    // Delete state
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handleClose = () => {
        setSection('menu');
        setError('');
        setSuccess('');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setDeactivatePassword(''); setDeletePassword(''); setDeleteConfirmText('');
        onClose();
    };

    const reauthenticate = async (password: string) => {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('Not authenticated');
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
        if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
        setLoading(true);
        try {
            await reauthenticate(currentPassword);
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');
            await updatePassword(user, newPassword);
            setSuccess('Password updated successfully!');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) {
            setError(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            await reauthenticate(deactivatePassword);
            const reactivateAt = new Date();
            reactivateAt.setDate(reactivateAt.getDate() + parseInt(deactivateDuration));
            await updateDoc(doc(db, 'users', userId), {
                isDeactivated: true,
                deactivatedAt: new Date(),
                reactivateAt: reactivateAt,
            });
            setSuccess(`Deactivated for ${deactivateDuration} days. Signing out...`);
            setTimeout(() => { auth.signOut(); }, 2000);
        } catch (err: any) {
            setError('Failed to deactivate account.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (deleteConfirmText !== 'DELETE') { setError('Please type DELETE to confirm.'); return; }
        setLoading(true);
        try {
            await reauthenticate(deletePassword);
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');
            await deleteDoc(doc(db, 'users', userId));
            await deleteUser(user);
            onAccountDeleted();
        } catch (err: any) {
            setError('Failed to delete account.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25 shadow-inner";
    const labelClass = "block text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-ebony/40 mb-2.5 px-1";

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="card-premium max-w-lg w-full max-h-[90vh] overflow-y-auto border-brand-burgundy/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-brand-ebony/5 sticky top-0 bg-white/50 dark:bg-brand-parchment/10 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            {section === 'menu' ? <ShieldCheck className="w-6 h-6" /> : (
                                <button onClick={() => { setSection('menu'); setError(''); setSuccess(''); }}>
                                    <ChevronRight className="w-6 h-6 rotate-180" />
                                </button>
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                {section === 'menu' && 'Governance'}
                                {section === 'change-password' && 'Key Access'}
                                {section === 'deactivate' && 'Pause Legacy'}
                                {section === 'delete' && 'Dissolve Legacy'}
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Manage your digital presence</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-3 hover:bg-brand-ebony/5 text-brand-ebony/30 rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    {/* Error / Success Notifications */}
                    {error && (
                        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[11px] font-extrabold text-red-500 uppercase tracking-widest animate-in slide-in-from-top-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-[11px] font-extrabold text-emerald-500 uppercase tracking-widest animate-in slide-in-from-top-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Menu */}
                    {section === 'menu' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 px-5 py-3 bg-brand-ebony/5 rounded-2xl border border-brand-ebony/5 mb-6">
                                <UserIcon className="w-4 h-4 text-brand-ebony/20" />
                                <p className="text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-widest leading-none">Registered as <span className="text-brand-ebony">{userEmail}</span></p>
                            </div>

                            {[
                                { id: 'change-password', icon: Lock, title: 'Key Access', sub: 'Update account password', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                                { id: 'deactivate', icon: PauseCircle, title: 'Pause Legacy', sub: 'Hide profile temporarily', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                { id: 'delete', icon: Trash2, title: 'Dissolve Legacy', sub: 'Permanent account removal', color: 'text-red-500', bg: 'bg-red-500/10' },
                                { id: 'logout', icon: LogOut, title: 'Sign Out', sub: 'End current session', color: 'text-brand-ebony', bg: 'bg-brand-ebony/10', action: () => auth.signOut() }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={item.action || (() => { setSection(item.id as Section); setError(''); setSuccess(''); })}
                                    className={`w-full flex items-center justify-between p-5 hover:bg-white dark:hover:bg-brand-ebony/20 rounded-[2rem] border border-transparent hover:border-brand-ebony/5 transition-all group active:scale-[0.98] ${item.id === 'logout' ? 'mt-8' : ''}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-extrabold text-brand-ebony">{item.title}</p>
                                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-widest mt-1">{item.sub}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${item.color} opacity-20`} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Change Password */}
                    {section === 'change-password' && (
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            {[
                                { label: 'Current Key', val: currentPassword, set: setCurrentPassword, show: showCurrent, setShow: setShowCurrent },
                                { label: 'New Key', val: newPassword, set: setNewPassword, show: showNew, setShow: setShowNew },
                                { label: 'Re-enter New Key', val: confirmPassword, set: setConfirmPassword, show: showConfirm, setShow: setShowConfirm }
                            ].map((field, idx) => (
                                <div key={idx}>
                                    <label className={labelClass}>{field.label}</label>
                                    <div className="relative">
                                        <input type={field.show ? 'text' : 'password'} value={field.val} onChange={e => field.set(e.target.value)} className={inputClass} placeholder="••••••••" required />
                                        <button type="button" onClick={() => field.setShow(!field.show)} className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-ebony/20 hover:text-indigo-500 transition-colors">
                                            {field.show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-indigo text-white rounded-[1.5rem] font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 transition-all disabled:opacity-30">
                                {loading ? 'Updating Secret...' : 'Rotate Security Keys'}
                            </button>
                        </form>
                    )}

                    {/* Deactivate Account */}
                    {section === 'deactivate' && (
                        <form onSubmit={handleDeactivate} className="space-y-6">
                            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] text-sm text-amber-700 space-y-4">
                                <p className="font-extrabold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Hibernation Logic
                                </p>
                                <ul className="space-y-2 text-[11px] font-medium leading-relaxed opacity-80">
                                    <li>• Your profile will be hidden from the alumni network</li>
                                    <li>• Contributions & messages remain archived and secure</li>
                                    <li>• Auto-reactivation occurs after the chosen cycle</li>
                                </ul>
                            </div>
                            <div>
                                <label className={labelClass}>Hibernation Period</label>
                                <select value={deactivateDuration} onChange={e => setDeactivateDuration(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                                    <option value="7">7 Days Cycle</option>
                                    <option value="14">14 Days Cycle</option>
                                    <option value="30">30 Days Cycle</option>
                                    <option value="90">90 Days Cycle</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Authorize Action</label>
                                <input type="password" value={deactivatePassword} onChange={e => setDeactivatePassword(e.target.value)} className={inputClass} placeholder="Enter password to confirm" required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-4 bg-amber-500 text-white rounded-[1.5rem] font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-amber-500/20 hover:brightness-110 transition-all disabled:opacity-30">
                                {loading ? 'Processing...' : `Confirm ${deactivateDuration} Day Pause`}
                            </button>
                        </form>
                    )}

                    {/* Delete Account */}
                    {section === 'delete' && (
                        <form onSubmit={handleDeleteAccount} className="space-y-6">
                            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-sm text-red-600 space-y-4">
                                <p className="font-extrabold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Terminal Exception
                                </p>
                                <ul className="space-y-2 text-[11px] font-medium leading-relaxed opacity-80">
                                    <li>• All legacy contributions and messages will be purged</li>
                                    <li>• Your identity will be removed from all alumni logs</li>
                                    <li>• This action is irreversible on the blockchain ledger</li>
                                </ul>
                            </div>
                            <div>
                                <label className={labelClass}>Authorize Dissolution</label>
                                <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className={inputClass} placeholder="Enter target password" required />
                            </div>
                            <div>
                                <label className={labelClass}>Final Consent (Type <span className="text-red-500 font-black italic">DELETE</span>)</label>
                                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className={`${inputClass} border-red-500/20 focus:border-red-500 focus:ring-red-500/10 text-red-500`} placeholder="Confirmation String" required />
                            </div>
                            <button type="submit" disabled={loading || deleteConfirmText !== 'DELETE'} className="w-full py-4 bg-red-500 text-white rounded-[1.5rem] font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-red-500/20 hover:brightness-110 transition-all disabled:opacity-30">
                                {loading ? 'Dissolving...' : 'Permanently Purge Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
