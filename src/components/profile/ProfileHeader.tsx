import Image from 'next/image';
import { MapPin, Link as LinkIcon, Calendar, Mail, FileText } from 'lucide-react';
import { User } from '@/types';

interface ProfileHeaderProps {
    user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
    return (
        <div className="bg-white border rounded-xl overflow-hidden mb-6 shadow-sm">
            {/* Cover Photo */}
            <div className="h-32 md:h-48 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
            </div>

            <div className="px-4 pb-4 md:px-8">
                <div className="relative flex justify-between items-end -mt-12 mb-4">
                    <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white overflow-hidden bg-gray-100">
                        <Image
                            src={user.profilePic || `https://placehold.co/150x150/EFEFEFF/003366?text=${user.name.substring(0, 1)}`}
                            alt={user.name}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                    <div className="flex space-x-2 mb-2">
                        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors">
                            Connect
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors">
                            Message
                        </button>
                    </div>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                    <p className="text-gray-600 font-medium mb-2">{user.profession}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                        {user.location && (
                            <span className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {user.location}
                            </span>
                        )}
                        <span className="flex items-center text-blue-600 hover:underline cursor-pointer">
                            <LinkIcon className="h-4 w-4 mr-1" />
                            portfolio.com
                        </span>
                        <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Joined 2024
                        </span>
                        <span className="text-blue-600 font-medium">
                            {user.connections?.length || 0} connections
                        </span>
                    </div>

                    <div className="flex space-x-2 mb-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Open to work
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Mentoring
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        {['Posts', 'About', 'Experience', 'Education', 'Portfolio'].map((tab, idx) => (
                            <button
                                key={tab}
                                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${idx === 0
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
