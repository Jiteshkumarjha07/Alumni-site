'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Loader2, Send, Sparkles, Video, FileText, File as FileIcon } from 'lucide-react';
import { uploadMedia, uploadVideo, uploadFile } from '@/lib/media';
import { Portal } from '../ui/Portal';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (
        content: string, 
        mediaPayload?: { imageUrl?: string; mediaUrl?: string; mediaType?: 'image' | 'video' | 'file'; fileName?: string }
    ) => Promise<void>;
    currentUser: {
        name: string;
        profilePic?: string;
    };
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    currentUser,
}) => {
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [fileType, setFileType] = useState<'image' | 'video' | 'file' | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const type = file.type;
            const isVideo = type.startsWith('video/');

            // Storage threshold: 10MB max for videos, 5MB for everything else
            const limitMB = isVideo ? 10 : 5;
            if (file.size > limitMB * 1024 * 1024) {
                alert(`File size exceeds limit (${limitMB}MB max). Please choose a smaller file.`);
                return;
            }

            if (type.startsWith('image/')) {
                setFileType('image');
                setPreviewUrl(URL.createObjectURL(file));
            } else if (isVideo) {
                setFileType('video');
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setFileType('file');
                setPreviewUrl(''); // No true visual preview for raw files
            }
            setSelectedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setFileType(null);
    };

    const handleSubmit = async () => {
        if (!content.trim() && !selectedFile) return;

        setLoading(true);
        try {
            let payload: Parameters<typeof onSubmit>[1] = undefined;

            if (selectedFile) {
                let uploadedUrl: string | null = null;
                
                if (fileType === 'image') {
                    uploadedUrl = await uploadMedia(selectedFile);
                } else if (fileType === 'video') {
                    uploadedUrl = await uploadVideo(selectedFile, 'posts/videos');
                } else {
                    uploadedUrl = await uploadFile(selectedFile, 'posts/files');
                }

                if (uploadedUrl) {
                    if (fileType === 'image') {
                        payload = { imageUrl: uploadedUrl, mediaUrl: uploadedUrl, mediaType: 'image', fileName: selectedFile.name };
                    } else if (fileType === 'video') {
                        payload = { mediaUrl: uploadedUrl, mediaType: 'video', fileName: selectedFile.name };
                    } else {
                        payload = { mediaUrl: uploadedUrl, mediaType: 'file', fileName: selectedFile.name };
                    }
                }
            }

            await onSubmit(content.trim(), payload);
            setContent('');
            handleRemoveFile();
            onClose();
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 bg-brand-cream/60 dark:bg-black/80 backdrop-blur-xl flex items-start sm:items-center justify-center z-[100] sm:p-6 animate-in fade-in duration-500">
                <div className="card-premium sm:max-w-2xl w-full h-full sm:h-auto sm:max-h-[95vh] flex flex-col shadow-focus-premium overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border-brand-burgundy/10">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 sm:p-8 border-b border-brand-ebony/5 relative z-10 bg-white/60 dark:bg-brand-parchment/60 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-8 bg-brand-burgundy rounded-full glow-sm"></div>
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-brand-ebony tracking-tight flex items-center gap-2">
                                    Compose
                                    <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
                                </h2>
                                <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Share your legacy with the network</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="p-3 hover:bg-brand-burgundy/5 text-brand-ebony/30 hover:text-brand-burgundy rounded-2xl transition-all disabled:opacity-50 group/close"
                        >
                            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {/* User Info */}
                        <div className="p-6 sm:p-8 flex items-center gap-5">
                            <div className="relative shrink-0 group/avatar">
                                <img
                                    src={currentUser.profilePic || `https://placehold.co/48x48/4f46e5/ffffff?text=${currentUser.name.substring(0, 1)}`}
                                    alt={currentUser.name}
                                    className="w-12 h-12 rounded-full object-cover ring-4 ring-brand-burgundy/5 group-hover/avatar:ring-brand-burgundy/20 transition-all shadow-md"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div>
                                <p className="font-bold text-brand-ebony text-lg leading-tight tracking-tight">{currentUser.name}</p>
                                <p className="text-[10px] font-bold text-brand-ebony/30 uppercase tracking-widest mt-1">Public Post • Institute Network</p>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="px-6 sm:px-8 pb-8">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind? Share an update, a milestone, or start a discussion..."
                                className="w-full min-h-[160px] p-0 bg-transparent border-none focus:ring-0 outline-none resize-none text-brand-ebony placeholder-brand-ebony/20 transition-all font-sans text-xl leading-[1.6] tracking-tight"
                                disabled={loading}
                                autoFocus
                            />

                            {/* Media Preview Area */}
                            {selectedFile && (
                                <div className="mt-6 relative rounded-2xl overflow-hidden border border-brand-ebony/10 bg-brand-ebony/5 shadow-premium group/media">
                                    <button
                                        onClick={handleRemoveFile}
                                        disabled={loading}
                                        className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-all disabled:opacity-50 shadow-xl backdrop-blur-md active:scale-90"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    {fileType === 'image' && previewUrl && (
                                        <div className="flex items-center justify-center bg-black/5 w-full max-h-[300px]">
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-full max-h-[300px] object-contain transition-transform duration-700 ease-out"
                                            />
                                        </div>
                                    )}

                                    {fileType === 'video' && previewUrl && (
                                        <div className="flex items-center justify-center bg-black w-full max-h-[300px]">
                                            <video 
                                                src={previewUrl} 
                                                controls 
                                                className="w-full max-h-[300px] object-contain"
                                            />
                                        </div>
                                    )}

                                    {fileType === 'file' && (
                                        <div className="flex items-center gap-4 p-6 bg-white dark:bg-[#1c1a2c]">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                                <FileIcon className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-brand-ebony truncate">{selectedFile.name}</p>
                                                <p className="text-[11px] font-semibold text-brand-ebony/40 uppercase tracking-widest mt-0.5">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • File Payload
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Upload Buttons if no file selected */}
                            {!selectedFile && (
                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    {/* Upload trigger hidden input */}
                                    <label className="flex items-center gap-2 px-5 py-3 bg-brand-ebony/4 hover:bg-brand-burgundy/10 text-brand-ebony/60 hover:text-brand-burgundy rounded-xl cursor-pointer transition-all border border-transparent hover:border-brand-burgundy/10 active:scale-95">
                                        <ImageIcon className="w-4 h-4" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest">Image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                    </label>


                                    <label className="flex items-center gap-2 px-5 py-3 bg-brand-ebony/4 hover:bg-emerald-500/10 text-brand-ebony/60 hover:text-emerald-600 rounded-xl cursor-pointer transition-all border border-transparent hover:border-emerald-500/10 active:scale-95">
                                        <FileText className="w-4 h-4" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest">Doc</span>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="p-6 sm:p-8 border-t border-brand-ebony/5 bg-white/60 dark:bg-brand-parchment/60 backdrop-blur-md flex items-center justify-between mt-auto">
                         <div className="hidden sm:block">
                             <div className="flex items-center gap-3">
                                 <div className={`h-1.5 w-24 rounded-full overflow-hidden bg-brand-ebony/5`}>
                                     <div 
                                        className={`h-full transition-all duration-300 ${content.length > 2000 ? 'bg-red-500' : 'bg-brand-burgundy'}`}
                                        style={{ width: `${Math.min((content.length / 2000) * 100, 100)}%` }}
                                     ></div>
                                 </div>
                                 <p className={`text-[10px] font-bold uppercase tracking-widest ${content.length > 2000 ? 'text-red-500' : 'text-brand-ebony/30'}`}>
                                    {content.length} / 2000
                                 </p>
                             </div>
                         </div>
                         
                         <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-8 py-4 text-brand-ebony/40 hover:text-brand-ebony font-bold text-[11px] tracking-[0.15em] uppercase transition-all disabled:opacity-50"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (!content.trim() && !selectedFile)}
                                className="flex-1 sm:flex-none px-10 py-4 bg-brand-burgundy text-white rounded-2xl font-bold text-[11px] tracking-[0.25em] uppercase shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed group relative overflow-hidden active:scale-[0.97]"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    ) : (
                                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    )}
                                    <span>{loading ? 'Transmitting...' : 'Release Post'}</span>
                                </div>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
