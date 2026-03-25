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
import { X, Lock, Trash2, PauseCircle, Eye, EyeOff, ChevronRight, AlertTriangle, CheckCircle2, LogOut } from 'lucide-react';

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
        } catch (err: unknown) {
            const e = err as { code?: string };
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setError('Current password is incorrect.');
            } else {
                setError('Failed to update password. Please try again.');
            }
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
            setSuccess(`Account deactivated for ${deactivateDuration} days. You will be signed out.`);
            setTimeout(() => { auth.signOut(); }, 2000);
        } catch (err: unknown) {
            const e = err as { code?: string };
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setError('Password is incorrect.');
            } else {
                setError('Failed to deactivate account. Please try again.');
            }
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
        } catch (err: unknown) {
            const e = err as { code?: string };
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setError('Password is incorrect.');
            } else {
                setError('Failed to delete account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-2.5 bg-brand-parchment/40 border border-brand-ebony/15 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all text-sm placeholder:text-brand-ebony/30";
    const labelClass = "block text-xs font-bold uppercase tracking-widest text-brand-ebony/50 mb-1.5";

    return (
        <div className="fixed inset-0 bg-brand-ebony/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className="bg-brand-cream border border-brand-ebony/10 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-ebony/10 bg-brand-parchment/60">
                    <div className="flex items-center gap-2">
                        {section !== 'menu' && (
                            <button 
                                onClick={() => { setSection('menu'); setError(''); setSuccess(''); }}
                                className="text-brand-ebony/40 hover:text-brand-ebony transition-colors mr-1 text-lg font-light"
                            >
                                ←
                            </button>
                        )}
                        <h2 className="text-lg font-serif font-bold text-brand-ebony">
                            {section === 'menu' && 'Account Settings'}
                            {section === 'change-password' && 'Change Password'}
                            {section === 'deactivate' && 'Deactivate Account'}
                            {section === 'delete' && 'Delete Account'}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-brand-ebony/5 text-brand-ebony/40 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Error / Success */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Menu */}
                    {section === 'menu' && (
                        <div className="space-y-2">
                            <p className="text-xs text-brand-ebony/40 italic mb-4">Signed in as <span className="font-semibold not-italic">{userEmail}</span></p>
                            <button
                                onClick={() => { setSection('change-password'); setError(''); setSuccess(''); }}
                                className="w-full flex items-center justify-between p-4 bg-brand-parchment/50 hover:bg-brand-parchment rounded-xl border border-brand-ebony/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-brand-burgundy/10 rounded-full flex items-center justify-center group-hover:bg-brand-burgundy/20 transition-colors">
                                        <Lock className="w-4 h-4 text-brand-burgundy" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-brand-ebony">Change Password</p>
                                        <p className="text-xs text-brand-ebony/40">Update your account password</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-brand-ebony/30 group-hover:text-brand-burgundy transition-colors" />
                            </button>
                            <button
                                onClick={() => { setSection('deactivate'); setError(''); setSuccess(''); }}
                                className="w-full flex items-center justify-between p-4 bg-brand-parchment/50 hover:bg-brand-parchment rounded-xl border border-brand-ebony/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                        <PauseCircle className="w-4 h-4 text-amber-700" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-brand-ebony">Deactivate Account</p>
                                        <p className="text-xs text-brand-ebony/40">Temporarily hide your profile</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-brand-ebony/30 group-hover:text-amber-600 transition-colors" />
                            </button>
                            <button
                                onClick={() => { setSection('delete'); setError(''); setSuccess(''); }}
                                className="w-full flex items-center justify-between p-4 bg-red-50/80 hover:bg-red-50 rounded-xl border border-red-100 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-red-700">Delete Account</p>
                                        <p className="text-xs text-red-400">Permanently remove your account</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-500 transition-colors" />
                            </button>
                            <button
                                onClick={() => auth.signOut()}
                                className="w-full flex items-center justify-between p-4 bg-brand-parchment/50 hover:bg-brand-parchment rounded-xl border border-brand-ebony/10 transition-all group mt-6"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-brand-ebony/10 rounded-full flex items-center justify-center group-hover:bg-brand-ebony/20 transition-colors">
                                        <LogOut className="w-4 h-4 text-brand-ebony" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-brand-ebony">Log Out</p>
                                        <p className="text-xs text-brand-ebony/40">End your current session</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-brand-ebony/30 group-hover:text-brand-ebony transition-colors" />
                            </button>
                        </div>
                    )}

                    {/* Change Password */}
                    {section === 'change-password' && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className={labelClass}>Current Password</label>
                                <div className="relative">
                                    <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} placeholder="Enter current password" required />
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ebony/30">
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>New Password</label>
                                <div className="relative">
                                    <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Min. 8 characters" required />
                                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ebony/30">
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Confirm New Password</label>
                                <div className="relative">
                                    <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repeat new password" required />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ebony/30">
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-brand-burgundy text-white rounded-xl font-semibold hover:bg-[#5a2427] transition-colors disabled:opacity-50 text-sm">
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}

                    {/* Deactivate Account */}
                    {section === 'deactivate' && (
                        <form onSubmit={handleDeactivate} className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                                <p className="font-semibold mb-1">What happens when you deactivate?</p>
                                <ul className="list-disc list-inside space-y-1 text-amber-700 text-xs">
                                    <li>Your profile will be hidden from other users</li>
                                    <li>Your posts and messages will be preserved</li>
                                    <li>Your account will auto-reactivate after the selected period</li>
                                </ul>
                            </div>
                            <div>
                                <label className={labelClass}>Deactivate For</label>
                                <select value={deactivateDuration} onChange={e => setDeactivateDuration(e.target.value)} className={inputClass}>
                                    <option value="7">7 days</option>
                                    <option value="14">14 days</option>
                                    <option value="30">30 days</option>
                                    <option value="60">60 days</option>
                                    <option value="90">90 days</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Confirm Password</label>
                                <input type="password" value={deactivatePassword} onChange={e => setDeactivatePassword(e.target.value)} className={inputClass} placeholder="Enter your password" required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 text-sm">
                                {loading ? 'Deactivating...' : `Deactivate for ${deactivateDuration} days`}
                            </button>
                        </form>
                    )}

                    {/* Delete Account */}
                    {section === 'delete' && (
                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800">
                                <p className="font-semibold mb-1">⚠️ This action is permanent</p>
                                <ul className="list-disc list-inside space-y-1 text-red-700 text-xs">
                                    <li>All your posts, messages, and data will be removed</li>
                                    <li>Your connections will no longer see your profile</li>
                                    <li>This cannot be undone</li>
                                </ul>
                            </div>
                            <div>
                                <label className={labelClass}>Confirm Password</label>
                                <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className={inputClass} placeholder="Enter your password" required />
                            </div>
                            <div>
                                <label className={labelClass}>Type <span className="text-red-600 font-black">DELETE</span> to confirm</label>
                                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className={`${inputClass} border-red-200 focus:border-red-400 focus:ring-red-100`} placeholder="DELETE" required />
                            </div>
                            <button type="submit" disabled={loading || deleteConfirmText !== 'DELETE'} className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm">
                                {loading ? 'Deleting Account...' : 'Permanently Delete Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
