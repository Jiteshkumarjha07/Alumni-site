import { EventCard } from '@/components/events/EventCard';
import { mockEvents } from '@/lib/data';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function EventsPage() {
    const events = [...mockEvents, ...mockEvents]; // Demo data

    return (
        <div className="max-w-6xl mx-auto pt-8 px-4 pb-20 md:pb-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-brand-gold/20 p-3 rounded-xl border border-brand-gold/30">
                        <CalendarIcon className="h-7 w-7 text-brand-burgundy" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-brand-ebony">Alumni Events</h1>
                </div>
                <button className="bg-brand-burgundy text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5a2427] shadow-sm tracking-wide transition-colors">
                    Create Event
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, idx) => (
                    <EventCard key={`${event.id}-${idx}`} event={event} />
                ))}
            </div>
        </div>
    );
}
