'use client';

import { User } from '@/types';
import { UserPlus, UserCheck, UserX, MessageCircle, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AlumniCardProps {
    user: User;
    currentUser: User;
    connectionStatus: 'connected' | 'pending' | 'received' | 'none';
    onConnect: (userId: string) => void;
    onCancelRequest: (userId: string) => void;
    onAcceptRequest: (userId: string) => void;
    onRejectRequest: (userId: string) => void;
}

export const AlumniCard: React.FC<AlumniCardProps> = ({
    user,
    currentUser,
    connectionStatus,
    onConnect,
    onCancelRequest,
    onAcceptRequest,
    onRejectRequest,
}) => {
    const router = useRouter();

    return (
        <div className="bg-brand-parchment/80 rounded-xl shadow-sm border border-brand-ebony/10 p-6 hover:shadow-md transition">
            <div className="flex flex-col items-center text-center">
                <img
                    src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/5a2427?text=${user.name.substring(0, 1)}`}
                    alt={user.name}
                    className="w-20 h-20 rounded-full mb-3 border-2 border-brand-cream shadow-sm"
                />
                <h3 className="font-serif font-bold text-xl text-brand-ebony">{user.name}</h3>
                <p className="text-sm font-medium text-brand-ebony/80 mb-1">{user.profession || 'Alumni'}</p>
                <p className="text-xs text-brand-ebony/60 mb-1 tracking-wide uppercase font-bold mt-1">Class of {user.batch}</p>
                {user.location && (
                    <p className="text-sm text-brand-ebony/70 mb-3">{user.location}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-brand-ebony/60 mb-4 font-medium">
                    <span>{user.connections?.length || 0} connections</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full mt-auto">
                    {connectionStatus === 'connected' && (
                        <button
                            onClick={() => router.push(`/messages?userId=${user.uid}&name=${encodeURIComponent(user.name)}&pic=${encodeURIComponent(user.profilePic || '')}`)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-burgundy/10 text-brand-burgundy rounded-lg hover:bg-brand-burgundy hover:text-white transition shadow-sm font-semibold tracking-wide text-sm"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Message
                        </button>
                    )}

                    {connectionStatus === 'none' && (
                        <button
                            onClick={() => onConnect(user.uid)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-burgundy text-white rounded-lg hover:bg-[#5a2427] transition shadow-sm font-semibold tracking-wide text-sm"
                        >
                            <UserPlus className="w-4 h-4" />
                            Connect
                        </button>
                    )}

                    {connectionStatus === 'pending' && (
                        <button
                            onClick={() => onCancelRequest(user.uid)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-ebony/10 text-brand-ebony/70 rounded-lg hover:bg-brand-ebony/20 transition font-medium text-sm"
                        >
                            <UserX className="w-4 h-4" />
                            Cancel
                        </button>
                    )}

                    {connectionStatus === 'received' && (
                        <>
                            <button
                                onClick={() => onAcceptRequest(user.uid)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2d5a27]/10 text-[#2d5a27] rounded-lg hover:bg-[#2d5a27] hover:text-white transition font-medium text-sm"
                            >
                                <Check className="w-4 h-4" />
                                Accept
                            </button>
                            <button
                                onClick={() => onRejectRequest(user.uid)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-burgundy/10 text-brand-burgundy rounded-lg hover:bg-brand-burgundy hover:text-white transition font-medium text-sm"
                            >
                                <X className="w-4 h-4" />
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
