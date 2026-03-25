'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { uploadMedia } from '@/lib/media';
import { Eye, EyeOff, Loader2, Camera, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';

import { BrandLogo } from '@/components/brand/BrandLogo';

export default function SignUpPage() {
    const { signUp, error, clearError } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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
        <div className="min-h-screen bg-brand-cream border-brand-ebony/5 flex items-center justify-center p-4 relative overflow-hidden">
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

            <div className="max-w-md w-full relative z-10">
                {/* Back Button */}
                <Link href="/login" className="inline-flex items-center gap-2 text-brand-ebony/60 hover:text-brand-burgundy mb-6 font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>

                {/* Card */}
                <div className="bg-brand-parchment/80 rounded-2xl shadow-xl p-8 border border-brand-ebony/10 backdrop-blur-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <BrandLogo size="lg" className="mx-auto mb-4" />
                        <h1 className="text-3xl font-serif font-bold text-brand-ebony mb-2">Join Alumni Network</h1>
                        <p className="text-brand-ebony/60">Create your account to connect with fellow alumni</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Profile Picture */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-gray-100 shadow-md">
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
                                {/* Camera overlay */}
                                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                    <Camera className="w-8 h-8 text-white" />
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                            <label className="mt-3 cursor-pointer text-brand-burgundy hover:text-[#5a2427] text-sm font-bold uppercase tracking-widest">
                                Upload Photo (Optional)
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                            <p className="text-[10px] text-brand-ebony/40 mt-1 uppercase tracking-widest font-bold">Max size: 5MB</p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                placeholder="your.email@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-white/50 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition outline-none text-brand-ebony"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Minimum 6 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-12"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Batch Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Batch Year <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 2020"
                                value={formData.batch}
                                onChange={(e) => setFormData({ ...formData, batch: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                required
                                min={1950}
                                max={new Date().getFullYear()}
                            />
                        </div>

                        {/* Profession */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Profession <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Software Engineer"
                                value={formData.profession}
                                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                required
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <LocationAutocomplete
                                value={formData.location}
                                onChange={(location) => setFormData({ ...formData, location })}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-brand-burgundy text-white rounded-xl font-bold hover:bg-[#5a2427] transition-all shadow-md shadow-brand-burgundy/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6 uppercase tracking-widest text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                'Create Account'
                            )}
                        </button>
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
