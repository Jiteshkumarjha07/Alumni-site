'use client';

import { useState } from 'react';
import { Event, User } from '@/types';
import { Calendar, MapPin, Users, Ticket, ArrowRight, X, Trash2, Clock, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

interface EventCardProps {
    event: Event;
    currentUser?: User;
    onDelete?: (eventId: string) => void;
}

function EventDetailsModal({
    event,
    currentUser,
    onClose,
    onDelete,
}: {
    event: Event;
    currentUser?: User;
    onClose: () => void;
    onDelete?: (eventId: string) => void;
}) {
    const isCreator = currentUser?.uid === event.createdByUid;

    const handleDelete = () => {
        if (onDelete) {
            onDelete(event.id);
            onClose();
        }
    };

    const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-ebony/60 dark:bg-black/80 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
                {/* Banner Image */}
                <div className="relative h-52 w-full shrink-0 overflow-hidden">
                    <Image
                        src={event.imageUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&fit=crop'}
                        alt={event.title}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Date badge */}
                    <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-2 rounded-2xl text-center shadow-xl border border-white/20">
                        <span className="block text-[10px] font-bold text-brand-burgundy uppercase tracking-[0.2em] leading-none mb-1">
                            {new Date(event.date).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="block text-2xl font-serif font-extrabold text-brand-ebony leading-none">
                            {new Date(event.date).getDate()}
                        </span>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h2 className="text-2xl font-serif font-extrabold text-white leading-tight drop-shadow-lg">
                            {event.title}
                        </h2>
                    </div>
                </div>

                {/* Content — scrollable */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="p-6 space-y-6">
                        {/* Meta row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-4 bg-brand-ebony/5 dark:bg-white/5 rounded-2xl border border-brand-ebony/5 dark:border-white/10">
                                <div className="w-9 h-9 rounded-xl bg-brand-burgundy/10 dark:bg-brand-burgundy/20 flex items-center justify-center shrink-0 border border-brand-burgundy/10">
                                    <Calendar className="h-4 w-4 text-brand-burgundy" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-extrabold text-brand-ebony/40 dark:text-brand-ebony/60 uppercase tracking-[0.2em] mb-0.5">Date</p>
                                    <p className="text-sm font-bold text-brand-ebony">{formattedDate}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-brand-ebony/5 dark:bg-white/5 rounded-2xl border border-brand-ebony/5 dark:border-white/10">
                                <div className="w-9 h-9 rounded-xl bg-brand-gold/10 dark:bg-brand-gold/20 flex items-center justify-center shrink-0 border border-brand-gold/10">
                                    <MapPin className="h-4 w-4 text-brand-gold" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-extrabold text-brand-ebony/40 dark:text-brand-ebony/60 uppercase tracking-[0.2em] mb-0.5">Location</p>
                                    <p className="text-sm font-bold text-brand-ebony">{event.location}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-brand-ebony/5 dark:bg-white/5 rounded-2xl border border-brand-ebony/5 dark:border-white/10">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/10">
                                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-extrabold text-brand-ebony/40 dark:text-brand-ebony/60 uppercase tracking-[0.2em] mb-0.5">Attending</p>
                                    <p className="text-sm font-bold text-brand-ebony">{event.attendeesCount || 0} people</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-brand-ebony/5 dark:bg-white/5 rounded-2xl border border-brand-ebony/5 dark:border-white/10">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/10">
                                    <UserIcon className="h-4 w-4 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-extrabold text-brand-ebony/40 dark:text-brand-ebony/60 uppercase tracking-[0.2em] mb-0.5">Organised by</p>
                                    <p className="text-sm font-bold text-brand-ebony">{event.createdByName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-[10px] font-extrabold text-brand-ebony/40 dark:text-brand-ebony/60 uppercase tracking-[0.2em] mb-3">About this Event</h3>
                            <div className="p-5 bg-brand-ebony/5 dark:bg-white/5 rounded-2xl border border-brand-ebony/5 dark:border-white/10">
                                <p className="text-sm text-brand-ebony/80 dark:text-brand-ebony/90 leading-relaxed whitespace-pre-wrap font-sans">
                                    {event.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-brand-ebony/5 dark:border-white/10 flex items-center gap-3 bg-brand-ebony/[0.015] dark:bg-white/[0.03] flex-shrink-0">
                    {isCreator && onDelete ? (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Event
                        </button>
                    ) : null}
                    <button
                        onClick={onClose}
                        className="ml-auto px-6 py-2.5 bg-brand-burgundy text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-brand-burgundy/20"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function EventCard({ event, currentUser, onDelete }: EventCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const eventDate = new Date(event.date);
    const month = eventDate.toLocaleString('default', { month: 'short' });
    const day = eventDate.getDate();

    return (
        <>
            <div className="card-premium overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col h-full group">
                {/* Header / Image Section */}
                <div className="relative h-52 w-full overflow-hidden">
                    <Image
                        src={event.imageUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&fit=crop'}
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

                    {/* Creator delete badge */}
                    {currentUser?.uid === event.createdByUid && (
                        <div className="absolute top-4 right-4 z-10">
                            <span className="px-2 py-1 bg-brand-burgundy/90 text-white text-[9px] font-extrabold uppercase tracking-widest rounded-full">
                                Your event
                            </span>
                        </div>
                    )}

                    {/* Glassy overlay on bottom */}
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

                    <button
                        onClick={() => setShowDetails(true)}
                        className="mt-auto w-full group/btn overflow-hidden relative py-3 bg-brand-burgundy/5 border border-brand-burgundy/20 text-brand-burgundy rounded-xl font-bold tracking-[0.15em] text-[10px] uppercase hover:bg-gradient-indigo hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
                    >
                        <Ticket className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 -translate-x-2 opacity-0 group-hover/btn:translate-x-0 group-hover/btn:opacity-100 transition-all" />
                    </button>
                </div>
            </div>

            {showDetails && (
                <EventDetailsModal
                    event={event}
                    currentUser={currentUser}
                    onClose={() => setShowDetails(false)}
                    onDelete={onDelete}
                />
            )}
        </>
    );
}
