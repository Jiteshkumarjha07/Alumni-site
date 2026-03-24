'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventModal, EventFormData } from '@/components/modals/CreateEventModal';
import { Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { uploadMedia } from '@/lib/media';

export default function EventsPage() {
    const { userData, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const eventsQuery = query(
            collection(db, 'events'),
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
    }, []);

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

    return (
        <div className="max-w-6xl mx-auto pt-8 px-4 pb-20 md:pb-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-brand-gold/20 p-3 rounded-xl border border-brand-gold/30">
                        <CalendarIcon className="h-7 w-7 text-brand-burgundy" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-brand-ebony">Alumni Events</h1>
                </div>
                {userData && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-brand-burgundy text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5a2427] shadow-sm tracking-wide transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Event
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

