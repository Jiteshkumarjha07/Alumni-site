'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { uploadMedia } from '@/lib/media';
import { Eye, EyeOff, Loader2, Camera, ArrowLeft, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
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
        // We no longer fetch all institutes on mount
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
                setLocalError("Please use an authentic email domain (e.g., @gmail.com, @yahoo.com or an institutional email). Disposable or unverified domains are not allowed.");
                setIsApproved(false);
                setCheckLoading(false);
                return;
            }

            const checkPromise = getDoc(doc(db, 'approvals', emailClean));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout: Could not reach the database after 15 seconds. Your connection may be blocked or slow.")), 15000));
            const approvalDoc = (await Promise.race([checkPromise, timeoutPromise])) as any;
            
            if (!approvalDoc.exists()) {
                setLocalError("This email is not approved for any institute. Please contact your administrator.");
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

            // Fetch approved institutes details in parallel for much faster response
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
            
            const errorCode = err.code || '';
            const errorMessage = err.message || '';
            
            if (errorCode === 'permission-denied' || errorMessage.includes('permission-denied')) {
                setLocalError("Permission Denied: The database is blocking approval checks. Please update your Firestore Rules as per Step 6 of FIREBASE_SETUP.md.");
            } else if (errorCode === 'unavailable') {
                setLocalError("Firebase Service Unavailable: Please check your internet connection.");
            } else if (errorMessage.includes('timeout')) {
                setLocalError("Network Timeout: The database did not respond in 15 seconds. This could be due to your network blocking Firestore or an uninitialized database.");
            } else {
                setLocalError(`Error (${errorCode || 'unknown'}): ${errorMessage || "Failed to verify email approval."}`);
            }
        } finally {
            setCheckLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            // Validate file type
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
                profilePic: profilePicUrl || `https://placehold.co/100x100/EFEFEFF/003366?text=${formData.name.substring(0, 2).toUpperCase()}`,
            });

            router.push('/');
        } catch (err) {
            console.error('Sign up failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-4 relative overflow-hidden">
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

            <div className="max-w-2xl w-full relative z-10 transition-all duration-500 py-12">
                {/* Back Button */}
                <Link href="/login" className="inline-flex items-center gap-2 text-brand-ebony/60 hover:text-brand-burgundy mb-6 font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>

                {/* Card */}
                <div className="bg-brand-parchment/80 rounded-2xl shadow-xl p-8 border border-brand-ebony/10 backdrop-blur-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="block transition-transform hover:scale-105 active:scale-95 mb-4">
                            <BrandLogo size="lg" className="mx-auto" />
                        </Link>
                        <h1 className="text-3xl font-serif font-bold text-brand-ebony mb-2">Join Alumni Network</h1>
                        <p className="text-brand-ebony/60">Create your account to connect with fellow alumni</p>
                    </div>

                    {/* Error Message */}
                    {(error || localError) && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error || localError}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Phase 1: Email Verification */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="email"
                                        placeholder="your.email@example.com"
                                        value={formData.email}
                                        onChange={(e) => {
                                            setFormData({ ...formData, email: e.target.value });
                                            setIsApproved(false); // Reset approval if email changes
                                        }}
                                        className="flex-1 px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony placeholder-brand-ebony/40 disabled:opacity-50"
                                        required
                                        disabled={isApproved || checkLoading}
                                    />
                                    {!isApproved && (
                                        <button
                                            type="button"
                                            onClick={checkApproval}
                                            disabled={checkLoading}
                                            className="px-6 py-3 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md disabled:opacity-50 whitespace-nowrap min-w-[140px]"
                                        >
                                            {checkLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Check Approval'}
                                        </button>
                                    )}
                                    {isApproved && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsApproved(false);
                                                setInstitutes([]);
                                            }}
                                            className="px-4 py-3 bg-brand-ebony/5 text-brand-ebony/60 rounded-xl font-bold hover:bg-brand-ebony/10 transition-all text-xs uppercase tracking-widest"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>
                                {isApproved && (
                                    <p className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Email verified. You are approved for {institutes.length} institute(s).
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Phase 2: Rest of the Form */}
                        {isApproved && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                {/* Institute Selection (Only if multiple) */}
                                {institutes.length > 1 && (
                                    <div className="p-4 bg-brand-burgundy/5 rounded-xl border border-brand-burgundy/10 mb-6">
                                        <label className="block text-xs font-bold text-brand-ebony/70 mb-3 uppercase tracking-widest">
                                            Select Your Primary Institute
                                        </label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {institutes.map(inst => (
                                                <button
                                                    key={inst.id}
                                                    type="button"
                                                    onClick={() => setSelectedInstituteId(inst.id)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                                                        selectedInstituteId === inst.id 
                                                            ? 'bg-brand-burgundy border-brand-burgundy text-white shadow-md' 
                                                            : 'bg-white/50 border-brand-ebony/10 text-brand-ebony hover:border-brand-burgundy/30'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedInstituteId === inst.id ? 'bg-white/20' : 'bg-brand-burgundy/5'}`}>
                                                            <Building2 className={`w-4 h-4 ${selectedInstituteId === inst.id ? 'text-white' : 'text-brand-burgundy'}`} />
                                                        </div>
                                                        <span className="font-bold text-sm">{inst.name}</span>
                                                    </div>
                                                    {selectedInstituteId === inst.id && <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {institutes.length === 1 && (
                                    <div className="flex items-center gap-3 p-4 bg-brand-ebony/5 rounded-xl border border-brand-ebony/5 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-brand-burgundy/5 flex items-center justify-center text-brand-burgundy">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-brand-ebony/40 uppercase tracking-widest font-bold">Joining Institute</p>
                                            <p className="font-bold text-brand-ebony">{institutes[0].name}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Profile Picture */}
                                <div className="flex flex-col items-center py-4 border-y border-brand-ebony/5 my-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-md">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                            <Camera className="w-8 h-8 text-white" />
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                    <label className="mt-3 cursor-pointer text-brand-burgundy hover:text-[#5a2427] text-sm font-bold uppercase tracking-widest">
                                        Upload Photo
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    </label>
                                    <p className="text-[10px] text-brand-ebony/40 mt-1 uppercase tracking-widest font-bold">Max size: 5MB</p>
                                </div>

                                {/* Personal Info */}

                                {/* Personal Info */}
                                <div>
                                    <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony placeholder-brand-ebony/40"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Minimum 6 characters"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none pr-12 text-brand-ebony placeholder-brand-ebony/40"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ebony/40 hover:text-brand-burgundy transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">
                                            Batch Year <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g., 2020"
                                            value={formData.batch}
                                            onChange={(e) => setFormData({ ...formData, batch: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony placeholder-brand-ebony/40"
                                            required
                                            min={1950}
                                            max={new Date().getFullYear()}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">
                                            Profession <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Software Engineer"
                                            value={formData.profession}
                                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony placeholder-brand-ebony/40"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-brand-ebony/70 mb-1 uppercase tracking-widest">
                                        Location <span className="text-red-500">*</span>
                                    </label>
                                    <LocationAutocomplete
                                        value={formData.location}
                                        onChange={(location) => setFormData({ ...formData, location })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 hover:shadow-lg disabled:opacity-50 mt-6 uppercase tracking-widest text-sm"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating Account...
                                        </span>
                                    ) : (
                                        'Complete Registration'
                                    )}
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Login Link */}
                    <div className="text-center mt-6">
                        <p className="text-brand-ebony/60">
                            Already have an account?{' '}
                            <Link href="/login" className="text-brand-burgundy hover:underline font-bold">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs font-bold text-brand-ebony/40 mt-6 uppercase tracking-[0.2em]">
                    © 2024 Alumnest • For the Tribe.
                </p>
            </div>
        </div>
    );
}
