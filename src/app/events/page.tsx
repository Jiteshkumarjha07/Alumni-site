'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventModal, EventFormData } from '@/components/modals/CreateEventModal';
import { Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-react';
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

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-brand-burgundy" />
            </div>
        );
    }

    if (!userData) return null; // Wait for redirect

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-gold/20 p-2 sm:p-3 rounded-xl border border-brand-gold/30 hidden sm:block">
                        <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7 text-brand-burgundy" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-ebony">
                        Events
                        <span className="hidden sm:inline"> Directory</span>
                    </h1>
                </div>
                {userData && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-2.5 bg-brand-burgundy text-white text-sm sm:text-sm rounded-xl hover:bg-[#5a2427] shadow-sm transition-all font-semibold tracking-wide active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create Event</span>
                    </button>
                )}
            </div>

            {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="bg-brand-parchment/30 border border-brand-gold/10 rounded-2xl p-12 text-center">
                    <CalendarIcon className="w-16 h-16 text-brand-gold/20 mx-auto mb-4" />
                    <p className="text-brand-ebony/60 font-medium font-serif italic text-lg">No upcoming events found</p>
                    {userData && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 text-brand-burgundy hover:text-[#5a2427] font-bold tracking-wide"
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
        </div>
    );
}

