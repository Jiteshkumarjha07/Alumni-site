import Image from 'next/image';
import { MapPin, Calendar, Users } from 'lucide-react';
import { User } from '@/types';

interface ProfileHeaderProps {
    user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
    return (
        <div className="card-premium overflow-hidden mb-6">
            {/* Cover Photo */}
            <div className="h-32 md:h-48 bg-gradient-to-r from-brand-burgundy to-indigo-500 relative" />

            <div className="px-4 pb-4 md:px-8">
                <div className="relative flex justify-between items-end -mt-12 mb-4">
                    <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white dark:border-brand-parchment overflow-hidden bg-brand-parchment shadow-lg">
                        <Image
                            src={user.profilePic || `https://placehold.co/150x150/4f46e5/ffffff?text=${user.name.substring(0, 1)}`}
                            alt={user.name}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                    <div className="flex space-x-2 mb-2">
                        <button className="px-4 py-2 bg-brand-burgundy text-white text-sm font-semibold rounded-full hover:brightness-110 transition-all shadow-md">
                            Connect
                        </button>
                        <button className="px-4 py-2 border border-brand-ebony/20 text-brand-ebony/70 dark:text-brand-ebony/80 text-sm font-semibold rounded-full hover:bg-brand-parchment dark:hover:bg-white/10 transition-all">
                            Message
                        </button>
                    </div>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-brand-ebony">{user.name}</h1>
                    <p className="text-brand-ebony/60 font-medium mb-2">{user.profession}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-brand-ebony/50 mb-4">
                        {user.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {user.location}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Joined 2024
                        </span>
                        <span className="flex items-center gap-1 text-brand-burgundy font-medium">
                            <Users className="h-4 w-4" />
                            {user.connections?.length || 0} connections
                        </span>
                    </div>

                    <div className="flex space-x-2 mb-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-burgundy/10 text-brand-burgundy border border-brand-burgundy/20">
                            Open to work
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Mentoring
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-brand-ebony/10">
                        {['Posts', 'About', 'Experience', 'Education', 'Portfolio'].map((tab, idx) => (
                            <button
                                key={tab}
                                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                                    idx === 0
                                        ? 'border-brand-burgundy text-brand-burgundy'
                                        : 'border-transparent text-brand-ebony/50 hover:text-brand-ebony hover:border-brand-ebony/30'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
