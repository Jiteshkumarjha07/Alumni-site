'use client';

import React, { useState } from 'react';
import { X, Lock, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, Key } from 'lucide-react';

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

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters for legacy-grade security.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('The security keys do not match.');
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
            setError(err.code === 'auth/requires-recent-login' ? 'Recent authentication required. Please re-sign.' : 'Failed to rotate security keys.');
        } finally {
            setLoading(false);
        }
    };

    const labelClass = "block text-[10px] font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] mb-2 px-1";
    const inputClass = "w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-brand-ebony placeholder:text-brand-ebony/25 shadow-inner";

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
            <div className="card-premium max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300 border-brand-burgundy/10 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-brand-ebony/5 flex items-center justify-between bg-white dark:bg-brand-parchment/10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Key className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Key Rotation
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Fortify your digital vault</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-brand-ebony/5 rounded-full transition-all text-brand-ebony/30">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {success ? (
                        <div className="py-12 text-center animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-xl border border-emerald-500/20">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-serif font-extrabold text-brand-ebony mb-2">Security Fortified</h3>
                            <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-[0.2em] animate-pulse">Synchronizing changes...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="px-5 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[11px] font-extrabold text-red-500 uppercase tracking-widest flex items-start gap-3 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className={labelClass}>New Security Key</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ebony/20" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={labelClass}>Verify New Key</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ebony/20" />
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-indigo text-white rounded-2xl font-extrabold uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Re-Encrypting...
                                        </>
                                    ) : (
                                        <>
                                            Authorize Change
                                            <Key className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-2 text-[10px] font-extrabold text-brand-ebony/20 uppercase tracking-widest hover:text-brand-ebony transition-all"
                                >
                                    Abort Rotation
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
