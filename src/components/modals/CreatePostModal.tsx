'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadMedia } from '@/lib/media';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string, imageUrl?: string) => Promise<void>;
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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
    };

    const handleSubmit = async () => {
        if (!content.trim() && !imageFile) {
            alert('Please add some content or an image');
            return;
        }

        setLoading(true);
        try {
            let imageUrl: string | undefined = undefined;
            if (imageFile) {
                const uploadedUrl = await uploadMedia(imageFile, 'posts');
                imageUrl = uploadedUrl || undefined;
            }

            await onSubmit(content.trim(), imageUrl);

            // Reset form
            setContent('');
            setImageFile(null);
            setImagePreview('');
            onClose();
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold">Create Post</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Info */}
                <div className="p-4 flex items-center gap-3">
                    <img
                        src={currentUser.profilePic || `https://placehold.co/48x48/EFEFEFF/3B82F6?text=${currentUser.name.substring(0, 1)}`}
                        alt={currentUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                        <p className="font-semibold text-gray-900">{currentUser.name}</p>
                        <p className="text-sm text-gray-500">Posting to alumni network</p>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
                        disabled={loading}
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="mt-3 relative">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full rounded-lg max-h-96 object-cover"
                            />
                            <button
                                onClick={handleRemoveImage}
                                disabled={loading}
                                className="absolute top-2 right-2 p-2 bg-gray-900 bg-opacity-75 hover:bg-opacity-90 text-white rounded-full transition disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Image Upload Button */}
                    {!imagePreview && (
                        <label className="mt-3 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Add an image</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={loading}
                            />
                        </label>
                    )}

                    <p className="text-xs text-gray-500 mt-2">Max image size: 5MB</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 sticky bottom-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg font-semibold hover:bg-white transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!content.trim() && !imageFile)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Posting...
                            </span>
                        ) : (
                            'Post'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
