import { Event } from '@/types';
import { Calendar, MapPin, Users } from 'lucide-react';
import Image from 'next/image';

interface EventCardProps {
    event: Event;
}

export function EventCard({ event }: EventCardProps) {
    const eventDate = new Date(event.date);
    const month = eventDate.toLocaleString('default', { month: 'short' });
    const day = eventDate.getDate();

    return (
        <div className="bg-brand-parchment/80 border border-brand-ebony/10 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full group">
            <div className="relative h-48 w-full bg-brand-ebony/5">
                <Image
                    src={event.imageUrl || "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&fit=crop"}
                    alt={event.title}
                    fill
                    className="object-cover"
                    unoptimized
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-center shadow-sm border border-brand-ebony/10">
                    <span className="block text-xs font-semibold text-brand-burgundy uppercase tracking-widest">{month}</span>
                    <span className="block text-xl font-serif font-bold text-brand-ebony">{day}</span>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-serif font-bold text-brand-ebony mb-2 group-hover:text-brand-burgundy transition-colors">
                    {event.title}
                </h3>

                <div className="space-y-2 mb-4 text-sm font-medium text-brand-ebony/70">
                    <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-brand-burgundy/60" />
                        {new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'full' })}
                    </div>
                    <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-brand-burgundy/60" />
                        {event.location}
                    </div>
                    <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-brand-burgundy/60" />
                        {event.attendeesCount || 0} Attending
                    </div>
                </div>

                <p className="text-sm text-brand-ebony/60 line-clamp-2 mb-4 font-sans">
                    {event.description}
                </p>

                <button className="mt-auto w-full py-2.5 border border-brand-burgundy/30 text-brand-burgundy bg-brand-burgundy/5 rounded-lg font-bold hover:bg-brand-burgundy hover:text-white transition-colors tracking-wide text-sm">
                    View Details
                </button>
            </div>
        </div>
    );
}
