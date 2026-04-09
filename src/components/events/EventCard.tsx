import { Event } from '@/types';
import { Calendar, MapPin, Users, Ticket, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface EventCardProps {
    event: Event;
}

export function EventCard({ event }: EventCardProps) {
    const eventDate = new Date(event.date);
    const month = eventDate.toLocaleString('default', { month: 'short' });
    const day = eventDate.getDate();

    return (
        <div className="card-premium overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col h-full group">
            {/* Header / Image Section */}
            <div className="relative h-52 w-full overflow-hidden">
                <Image
                    src={event.imageUrl || "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&fit=crop"}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    unoptimized
                />
                
                {/* Date Badge */}
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-brand-parchment/90 backdrop-blur-md px-3 py-2 rounded-2xl text-center shadow-xl border border-white/20 z-10 animate-fade-up">
                    <span className="block text-[10px] font-bold text-brand-burgundy uppercase tracking-[0.2em] leading-none mb-1">{month}</span>
                    <span className="block text-2xl font-serif font-extrabold text-brand-ebony leading-none">{day}</span>
                </div>

                {/* Glassy overlay on bottom for title contrast if needed later */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content Section */}
            <div className="p-6 flex-1 flex flex-col relative">
                {/* Subtle top indicator */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-brand-burgundy/20 to-transparent" />

                <h3 className="text-2xl font-serif font-extrabold text-brand-ebony mb-3 group-hover:text-brand-burgundy transition-colors leading-tight">
                    {event.title}
                </h3>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-brand-ebony/60">
                        <div className="w-7 h-7 rounded-lg bg-brand-burgundy/5 flex items-center justify-center mr-3 border border-brand-burgundy/10 shrink-0">
                             <Calendar className="h-3.5 w-3.5 text-brand-burgundy" />
                        </div>
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    
                    <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-brand-ebony/50">
                        <div className="w-7 h-7 rounded-lg bg-brand-gold/5 flex items-center justify-center mr-3 border border-brand-gold/10 shrink-0">
                             <MapPin className="h-3.5 w-3.5 text-brand-gold" />
                        </div>
                        <span className="truncate">{event.location}</span>
                    </div>

                    <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-brand-ebony/40">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/5 flex items-center justify-center mr-3 border border-emerald-500/10 shrink-0">
                             <Users className="h-3.5 w-3.5 text-emerald-500/70" />
                        </div>
                        {event.attendeesCount || 0} Attending
                    </div>
                </div>

                <p className="text-sm text-brand-ebony/50 line-clamp-2 mb-8 font-sans leading-relaxed">
                    {event.description}
                </p>

                <button className="mt-auto w-full group/btn overflow-hidden relative py-3 bg-brand-burgundy/5 border border-brand-burgundy/20 text-brand-burgundy rounded-xl font-bold tracking-[0.15em] text-[10px] uppercase hover:bg-gradient-indigo hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2">
                    <Ticket className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 -translate-x-2 opacity-0 group-hover/btn:translate-x-0 group-hover/btn:opacity-100 transition-all" />
                </button>
            </div>
        </div>
    );
}
