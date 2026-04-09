'use client';

import { User } from '@/types';
import { UserPlus, UserX, MessageCircle, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface AlumniCardProps {
    user: User;
    connectionStatus: 'connected' | 'pending' | 'received' | 'none';
    onConnect: (userId: string) => void;
    onCancelRequest: (userId: string) => void;
    onAcceptRequest: (userId: string) => void;
    onRejectRequest: (userId: string) => void;
}

export const AlumniCard: React.FC<AlumniCardProps> = ({
    user,
    connectionStatus,
    onConnect,
    onCancelRequest,
    onAcceptRequest,
    onRejectRequest,
}) => {
    const router = useRouter();

    return (
        <div className="card-premium p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out group">
            <div className="flex flex-col items-center text-center">
                <Link href={`/profile/${user.uid}`} className="flex flex-col items-center group/avatar cursor-pointer">
                    <div className="relative w-20 h-20 mb-4 rounded-full overflow-hidden border-4 border-white dark:border-brand-parchment shadow-lg group-hover/avatar:scale-105 transition-transform duration-300">
                        <Image
                            src={user.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${user.name.substring(0, 1)}`}
                            alt={user.name}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                    <h3 className="font-serif font-bold text-xl text-brand-ebony group-hover/avatar:text-brand-burgundy transition-colors leading-tight">{user.name}</h3>
                </Link>
                
                <p className="text-sm font-bold text-brand-burgundy/80 mt-2 uppercase tracking-widest text-[10px]">Class of {user.batch}</p>
                <p className="text-sm font-medium text-brand-ebony/70 mt-1 line-clamp-1">{user.profession || 'Alumni'}</p>
                
                {user.location && (
                    <p className="text-xs text-brand-ebony/50 mt-1 line-clamp-1 italic">{user.location}</p>
                )}

                <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-brand-ebony/30 uppercase tracking-[0.15em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold/40"></span>
                    {user.connections?.length || 0} Network connections
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 w-full mt-6">
                    {connectionStatus === 'connected' && (
                        <button
                            onClick={() => router.push(`/messages?userId=${user.uid}&name=${encodeURIComponent(user.name)}&pic=${encodeURIComponent(user.profilePic || '')}`)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-burgundy/5 text-brand-burgundy border border-brand-burgundy/20 rounded-xl hover:bg-gradient-indigo hover:text-white hover:border-transparent transition-all shadow-sm font-bold tracking-tight text-xs uppercase"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Message
                        </button>
                    )}

                    {connectionStatus === 'none' && (
                        <button
                            onClick={() => onConnect(user.uid)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-indigo text-white rounded-xl hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all font-bold tracking-tight text-xs uppercase"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Connect
                        </button>
                    )}

                    {connectionStatus === 'pending' && (
                        <button
                            onClick={() => onCancelRequest(user.uid)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-ebony/5 text-brand-ebony/50 border border-brand-ebony/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all font-bold tracking-tight text-xs uppercase"
                        >
                            <UserX className="w-3.5 h-3.5" />
                            Cancel
                        </button>
                    )}

                    {connectionStatus === 'received' && (
                        <>
                            <button
                                onClick={() => onAcceptRequest(user.uid)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-burgundy/10 text-brand-burgundy border border-brand-burgundy/20 rounded-xl hover:bg-brand-burgundy hover:text-white transition-all font-bold tracking-tight text-[10px] uppercase"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Accept
                            </button>
                            <button
                                onClick={() => onRejectRequest(user.uid)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/5 text-red-500/70 border border-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold tracking-tight text-[10px] uppercase"
                            >
                                <X className="w-3.5 h-3.5" />
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
