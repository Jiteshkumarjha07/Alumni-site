'use client';

import React, { useState } from 'react';
import { X, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (newPassword: string) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(newPassword);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            console.error('Change password error:', err);
            if (err.code === 'auth/requires-recent-login') {
                setError('For security reasons, please log out and log back in before changing your password.');
            } else {
                setError(err.message || 'Failed to change password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-brand-parchment rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-brand-ebony/10">
                <div className="px-6 py-4 border-b border-brand-ebony/10 flex justify-between items-center bg-brand-ebony/5">
                    <h3 className="text-xl font-serif font-bold text-brand-ebony flex items-center gap-2 leading-none">
                        <Lock className="w-5 h-5 text-brand-burgundy" />
                        Change Password
                    </h3>
                    <button onClick={onClose} className="text-brand-ebony/40 hover:text-brand-burgundy transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {success ? (
                        <div className="py-8 text-center animate-in zoom-in duration-300">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <p className="text-lg font-serif font-bold text-brand-ebony">Password Updated!</p>
                            <p className="text-xs font-bold text-brand-ebony/40 uppercase tracking-widest mt-1">Closing window...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-brand-ebony/5 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition-all outline-none text-brand-ebony"
                                    placeholder="At least 6 characters"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-brand-ebony/5 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition-all outline-none text-brand-ebony"
                                    placeholder="Repeat new password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-burgundy/20 flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
