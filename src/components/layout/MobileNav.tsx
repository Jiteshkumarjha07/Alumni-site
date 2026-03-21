import Link from 'next/link';
import { Home, Users, Briefcase, User, Calendar, MessageSquare } from 'lucide-react';

const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Network', href: '/network', icon: Users },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Profile', href: '/profile', icon: User },
];

export function MobileNav() {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4 flex justify-around items-center md:hidden z-50">
            {navigation.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-blue-600"
                >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs mt-1 font-medium">{item.name}</span>
                </Link>
            ))}
        </div>
    );
}
