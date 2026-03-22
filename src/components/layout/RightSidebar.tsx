import { UserPlus, TrendingUp } from 'lucide-react';
import { mockUsers } from '@/lib/data';
import Image from 'next/image';

export function RightSidebar() {
    const suggestions = mockUsers.slice(0, 3);

    return (
        <div className="hidden lg:block w-80 fixed right-0 top-0 h-full p-6 overflow-y-auto border-l bg-white">
            {/* Suggestions */}
            <div className="mb-8">
                <h2 className="text-gray-900 font-semibold mb-4 flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    More Alumni to Follow
                </h2>
                <div className="space-y-4">
                    {suggestions.map((user) => (
                        <div key={user.uid} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={user.profilePic || `https://placehold.co/40x40/EFEFEFF/003366?text=${user.name.substring(0, 1)}`}
                                        alt={user.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate w-32">
                                        {user.profession}
                                    </p>
                                </div>
                            </div>
                            <button className="text-blue-600 text-xs font-semibold hover:bg-blue-50 px-2 py-1 rounded">
                                Connect
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trending Topics */}
            <div>
                <h2 className="text-gray-900 font-semibold mb-4 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Trending in Alumni
                </h2>
                <div className="space-y-3">
                    {['#TechReunion2026', '#Startups', '#CareerAdvice', '#RemoteWork'].map((tag) => (
                        <div key={tag} className="flex items-center justify-between group cursor-pointer">
                            <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                                {tag}
                            </span>
                            <span className="text-xs text-gray-400">2.4k posts</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
