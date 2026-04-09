'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { uploadMedia } from '@/lib/media';
import { Eye, EyeOff, Loader2, Camera, ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { isAuthenticEmailDomain } from '@/lib/validation';

export default function SignUpPage() {
    const { signUp, error, clearError } = useAuth();
    const router = useRouter();
    const [institutes, setInstitutes] = useState<any[]>([]);
    const [selectedInstituteId, setSelectedInstituteId] = useState<string>('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [checkLoading, setCheckLoading] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        batch: new Date().getFullYear(),
        profession: '',
        location: '',
    });
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        console.log("Signup page loaded. Firebase context ready.");
    }, []);

    const checkApproval = async () => {
        if (!formData.email) {
            setLocalError("Please enter your email address first.");
            return;
        }

        setCheckLoading(true);
        setLocalError(null);
        clearError();

        try {
            const emailClean = formData.email.trim().toLowerCase();
            
            if (!isAuthenticEmailDomain(emailClean)) {
                setLocalError("Please use an authentic email domain. Disposable or unverified domains are not allowed.");
                setIsApproved(false);
                setCheckLoading(false);
                return;
            }

            const checkPromise = getDoc(doc(db, 'approvals', emailClean));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), 15000));
            const approvalDoc = (await Promise.race([checkPromise, timeoutPromise])) as any;
            
            if (!approvalDoc.exists()) {
                setLocalError("This email is not approved. Please contact your administrator.");
                setIsApproved(false);
                return;
            }

            const data = approvalDoc.data();
            const instituteIds = data.instituteIds || [];

            if (instituteIds.length === 0) {
                setLocalError("No institutes associated with this email.");
                setIsApproved(false);
                return;
            }

            const instPromises = instituteIds.map((id: string) => getDoc(doc(db, 'institutes', id)));
            const instPromiseAll = Promise.all(instPromises);
            const instDocs = (await Promise.race([instPromiseAll, timeoutPromise])) as any[];
            const approvedInsts = instDocs
                .filter(instDoc => instDoc.exists())
                .map(instDoc => ({ id: instDoc.id, ...instDoc.data() }));

            if (approvedInsts.length === 0) {
                setLocalError("Associated institutes no longer exist.");
                setIsApproved(false);
                return;
            }

            setInstitutes(approvedInsts);
            setSelectedInstituteId(approvedInsts[0].id);
            setIsApproved(true);
        } catch (err: any) {
            console.error("DEBUG: Approval check error raw:", err);
            setLocalError("Failed to verify email approval.");
        } finally {
            setCheckLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            setProfilePicFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearError();

        const selectedInst = institutes.find(i => i.id === selectedInstituteId);
        if (!selectedInst) {
            setLocalError("Please select an institute.");
            setLoading(false);
            return;
        }

        try {
            let profilePicUrl = '';
            if (profilePicFile) {
                profilePicUrl = await uploadMedia(profilePicFile) || '';
            }

            await signUp(formData.email, formData.password, {
                name: formData.name,
                batch: formData.batch,
                profession: formData.profession,
                location: formData.location,
                instituteId: selectedInst.id,
                instituteName: selectedInst.name,
                instituteIds: institutes.map(i => i.id),
                profilePic: profilePicUrl || `https://placehold.co/100x100/4f46e5/ffffff?text=${formData.name.substring(0, 2).toUpperCase()}`,
            });

            router.push('/');
        } catch (err) {
            console.error('Sign up failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
            {/* Dark premium background gradient specific to auth */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cream to-brand-parchment z-[-1]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-burgundy rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-40 animate-pulse-subtle" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold rounded-full mix-blend-multiply filter blur-[128px] opacity-10 dark:opacity-20 animate-pulse-subtle" style={{ animationDelay: '1s' }} />

            <div className="max-w-2xl w-full relative z-10 animate-fade-up py-8">
                {/* Back Button */}
                <Link href="/login" className="inline-flex items-center gap-2 text-brand-ebony/50 hover:text-brand-ebony mb-8 font-semibold transition-colors text-sm uppercase tracking-wider backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-brand-ebony/10">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>

                {/* Card */}
                <div className="card-premium p-8 sm:p-10">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <Link href="/" className="inline-block transition-transform duration-300 hover:scale-[1.03] active:scale-95 mb-6">
                            <div className="p-3 bg-gradient-indigo rounded-2xl shadow-xl flex items-center justify-center glow-indigo mx-auto w-16 h-16">
                                <BrandLogo size="md" showText={false} variant="white" />
                            </div>
                        </Link>
                        <h1 className="text-3xl font-serif font-bold text-brand-ebony mb-2">Join The Network</h1>
                        <p className="text-brand-ebony/60 text-sm font-medium">Create your premium alumni account</p>
                    </div>

                    {/* Error Message */}
                    {(error || localError) && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error || localError}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Phase 1: Email Verification */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-brand-ebony/60 uppercase tracking-[0.15em]">
                                Email Address <span className="text-brand-burgundy">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        setIsApproved(false);
                                    }}
                                    className="flex-1 px-4 py-3.5 input-premium rounded-xl font-medium text-sm disabled:opacity-50"
                                    required
                                    disabled={isApproved || checkLoading}
                                />
                                {!isApproved ? (
                                    <button
                                        type="button"
                                        onClick={checkApproval}
                                        disabled={checkLoading}
                                        className="px-6 py-3.5 bg-gradient-indigo text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 whitespace-nowrap min-w-[140px] text-xs uppercase tracking-widest"
                                    >
                                        {checkLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsApproved(false); setInstitutes([]); }}
                                        className="px-6 py-3.5 bg-white/5 border border-brand-ebony/10 text-brand-ebony/60 rounded-xl font-bold hover:bg-white/10 transition-all text-xs uppercase tracking-widest whitespace-nowrap min-w-[140px]"
                                    >
                                        Change
                                    </button>
                                )}
                            </div>
                            {isApproved && (
                                <p className="mt-2 text-xs text-brand-burgundy font-bold flex items-center gap-1.5 px-1 animate-fade-up">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Email verified. Approved for {institutes.length} institute(s).
                                </p>
                            )}
                        </div>

                        {/* Phase 2: Rest of the Form */}
                        {isApproved && (
                            <div className="space-y-6 pt-4 border-t border-brand-ebony/10 animate-fade-up">
                                {/* Institute Selection */}
                                {institutes.length > 1 && (
                                    <div className="p-5 bg-brand-burgundy/5 rounded-xl border border-brand-burgundy/20">
                                        <label className="block text-[11px] font-bold text-brand-ebony/70 mb-4 uppercase tracking-[0.15em]">
                                            Select Your Primary Institute
                                        </label>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {institutes.map(inst => (
                                                <button
                                                    key={inst.id}
                                                    type="button"
                                                    onClick={() => setSelectedInstituteId(inst.id)}
                                                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                                                        selectedInstituteId === inst.id 
                                                            ? 'bg-gradient-indigo border-transparent text-white shadow-lg shadow-brand-burgundy/20' 
                                                            : 'bg-white/5 border-brand-ebony/10 text-brand-ebony/80 hover:border-brand-burgundy/40 hover:bg-brand-burgundy/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${selectedInstituteId === inst.id ? 'bg-white/20' : 'bg-brand-ebony/5'}`}>
                                                            <Building2 className={`w-4 h-4 ${selectedInstituteId === inst.id ? 'text-white' : 'text-brand-ebony/50'}`} />
                                                        </div>
                                                        <span className="font-semibold text-sm tracking-wide">{inst.name}</span>
                                                    </div>
                                                    {selectedInstituteId === inst.id && <CheckCircle2 className="w-5 h-5 text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {institutes.length === 1 && (
                                    <div className="flex items-center gap-4 p-5 bg-white/5 rounded-xl border border-brand-ebony/10">
                                        <div className="w-11 h-11 rounded-full bg-brand-burgundy/10 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-brand-burgundy" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-brand-ebony/40 uppercase tracking-[0.15em] font-bold mb-0.5">Joining Institute</p>
                                            <p className="font-semibold text-brand-ebony tracking-wide">{institutes[0].name}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Profile Picture */}
                                <div className="flex flex-col items-center py-6 border-y border-brand-ebony/5 my-6 backdrop-blur-sm bg-white/5 rounded-xl border">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-parchment border-4 border-white dark:border-brand-ebony/20 shadow-xl relative z-10 transition-transform duration-300 group-hover:scale-105">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Camera className="w-8 h-8 text-brand-ebony/20" />
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer z-20">
                                            <Camera className="w-8 h-8 text-white" />
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                    <label className="mt-4 cursor-pointer text-brand-burgundy hover:text-indigo-500 text-xs font-bold uppercase tracking-[0.15em] transition-colors">
                                        Upload Avatar
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    </label>
                                    <p className="text-[10px] text-brand-ebony/40 mt-1.5 uppercase tracking-widest font-bold">Max size: 5MB</p>
                                </div>

                                {/* Personal Info */}
                                <div>
                                    <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                        Full Name <span className="text-brand-burgundy">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3.5 input-premium rounded-xl font-medium text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                        Password <span className="text-brand-burgundy">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Minimum 6 characters"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3.5 input-premium rounded-xl font-medium text-sm pr-12"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ebony/40 hover:text-brand-burgundy transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 z-20 relative">
                                    <div>
                                        <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                            Batch Year <span className="text-brand-burgundy">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g., 2020"
                                            value={formData.batch}
                                            onChange={(e) => setFormData({ ...formData, batch: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3.5 input-premium rounded-xl font-medium text-sm"
                                            required
                                            min={1950}
                                            max={new Date().getFullYear()}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                            Profession <span className="text-brand-burgundy">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Software Engineer"
                                            value={formData.profession}
                                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                            className="w-full px-4 py-3.5 input-premium rounded-xl font-medium text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="z-10 relative">
                                    <label className="block text-[11px] font-bold text-brand-ebony/60 mb-2 uppercase tracking-[0.15em]">
                                        Location <span className="text-brand-burgundy">*</span>
                                    </label>
                                    <LocationAutocomplete
                                        value={formData.location}
                                        onChange={(location) => setFormData({ ...formData, location })}
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-indigo text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 tracking-[0.15em] text-xs uppercase shimmer overflow-hidden relative"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Creating Account...
                                                </>
                                            ) : (
                                                'Create Account'
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-ebony/10 to-brand-ebony/10" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-brand-ebony/30">or</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-brand-ebony/10 to-brand-ebony/10" />
                    </div>

                    {/* Login Link */}
                    <div className="text-center">
                        <p className="text-sm text-brand-ebony/60 font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-brand-burgundy hover:text-indigo-500 font-bold ml-1 transition-colors relative group">
                                Log In
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-burgundy scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] font-bold text-brand-ebony/30 mt-8 uppercase tracking-[0.25em]">
                    © {new Date().getFullYear()} Alumnest • For the Tribe.
                </p>
            </div>
        </div>
    );
}
