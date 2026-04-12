'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventModal, EventFormData } from '@/components/modals/CreateEventModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { Calendar as CalendarIcon, Plus, Loader2, Sparkles } from 'lucide-react';
import { uploadMedia } from '@/lib/media';
import { useRouter } from 'next/navigation';

export default function EventsPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
        }
    }, [userData, authLoading, router]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

    useEffect(() => {
        if (!userData || !userData.instituteId) {
            setLoading(false);
            return;
        }

        const eventsQuery = query(
            collection(db, 'events'),
            where('instituteId', '==', userData.instituteId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Event[];
            setEvents(fetchedEvents);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching events:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    const handleCreateEvent = async (formData: EventFormData) => {
        if (!userData) return;

        let imageUrl = '';
        if (formData.imageFile) {
            const uploadedUrl = await uploadMedia(formData.imageFile);
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        await addDoc(collection(db, 'events'), {
            title: formData.title,
            date: formData.date,
            location: formData.location,
            description: formData.description,
            imageUrl: imageUrl,
            createdByUid: userData.uid,
            createdByName: userData.name,
            instituteId: userData.instituteId || '',
            createdAt: serverTimestamp(),
            attendeesCount: 0
        });
    };

    const handleDeleteEvent = async () => {
        if (!deletingEventId) return;
        await deleteDoc(doc(db, 'events', deletingEventId));
        setDeletingEventId(null);
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-16 h-16">
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy/20"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!userData) return null;

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-gold p-2.5 sm:p-3 rounded-xl shadow-lg shadow-brand-gold/20 hidden sm:block">
                        <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="page-header-accent glow-indigo sm:hidden"></div>
                            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Event Directory
                                <Sparkles className="w-5 h-5 text-brand-gold animate-pulse sm:hidden" />
                            </h1>
                        </div>
                        <p className="text-sm text-brand-ebony/50 mt-1 hidden sm:block font-medium">Discover and join exclusive alumni gatherings</p>
                    </div>
                </div>
                {userData && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-gold text-white text-sm rounded-xl hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all font-bold tracking-wide active:scale-[0.98] shimmer relative overflow-hidden text-brand-ebony/90"
                    >
                        <span className="relative z-10 flex items-center gap-2 text-white">
                            <Plus className="w-4 h-4" />
                            <span>Create Event</span>
                        </span>
                    </button>
                )}
            </div>

            {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            currentUser={userData}
                            onDelete={(id) => setDeletingEventId(id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="card-premium p-16 text-center border-dashed border-2 border-brand-ebony/10 mt-8">
                    <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-gold/20">
                        <CalendarIcon className="w-8 h-8 text-brand-gold/60" />
                    </div>
                    <p className="text-brand-ebony/60 font-medium font-serif italic text-lg mb-1">No upcoming events found</p>
                    <p className="text-brand-ebony/40 text-sm mb-6">Plan a meetup, reunion, or networking session!</p>
                    {userData && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="text-brand-gold hover:text-amber-500 font-bold tracking-wide text-sm bg-brand-gold/10 hover:bg-brand-gold/20 px-6 py-2.5 rounded-lg transition-colors inline-block"
                        >
                            Organize the first event
                        </button>
                    )}
                </div>
            )}

            <CreateEventModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateEvent}
            />

            <ConfirmDialog
                isOpen={!!deletingEventId}
                onClose={() => setDeletingEventId(null)}
                onConfirm={handleDeleteEvent}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
