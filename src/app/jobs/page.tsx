'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, Timestamp, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Job } from '@/types';
import { JobCard } from '@/components/jobs/JobCard';
import { CreateOpportunityModal, OpportunityFormData } from '@/components/modals/CreateOpportunityModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { Briefcase, Plus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { JobSkeleton } from '@/components/jobs/JobSkeleton';

export default function JobsPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !userData) {
            router.push('/login');
        }
    }, [userData, authLoading, router]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        if (!userData || !userData.instituteId) {
            setLoading(false);
            return;
        }

        const jobsQuery = query(
            collection(db, 'opportunities'),
            where('instituteId', '==', userData.instituteId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
            const fetchedJobs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Job[];
            setJobs(fetchedJobs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    const handleCreateOpportunity = async (formData: OpportunityFormData) => {
        if (!userData) return;

        let expiresAt = null;
        if (!formData.isPermanent && formData.expiryDate) {
            const [year, month, day] = formData.expiryDate.split('-');
            const expiryDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59));
            expiresAt = Timestamp.fromDate(expiryDate);
        }

        await addDoc(collection(db, 'opportunities'), {
            title: formData.title,
            company: formData.company,
            type: formData.type,
            location: formData.location,
            description: formData.description,
            contact: formData.contact,
            postedByUid: userData.uid,
            postedByName: userData.name,
            postedByBatch: userData.batch,
            instituteId: userData.instituteId || '',
            createdAt: serverTimestamp(),
            expiresAt: expiresAt
        });
    };

    const handleDeleteJob = async () => {
        if (!deletingJobId) return;
        await deleteDoc(doc(db, 'opportunities', deletingJobId));
        setDeletingJobId(null);
    };

    const activeJobs = useMemo(() => {
        const filtered = jobs.filter(job => {
            if (filterType === 'all') return true;
            return job.type === filterType;
        });

        return filtered.filter(job => {
            if (!job.expiresAt) return true;
            const now = new Date();
            const expiryDate = job.expiresAt.toDate();
            return expiryDate > now;
        });
    }, [jobs, filterType]);

    if (authLoading || (!userData && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-16 h-16">
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy/20"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-brand-burgundy border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    const currentUser = userData!;

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-12 w-full animate-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-indigo p-2.5 sm:p-3 rounded-xl shadow-lg shadow-brand-burgundy/20 hidden sm:block">
                        <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="page-header-accent glow-indigo sm:hidden"></div>
                            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                Job Board
                                <Sparkles className="w-5 h-5 text-brand-gold animate-pulse sm:hidden" />
                            </h1>
                        </div>
                        <p className="text-sm text-brand-ebony/50 mt-1 hidden sm:block font-medium">Discover career opportunities from your network</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-indigo text-white text-sm rounded-xl hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all font-semibold tracking-wide active:scale-[0.98] shimmer relative overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Post a Job</span>
                    </span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2.5 mb-8 overflow-x-auto pb-3 scrollbar-hide">
                {['all', 'Full-time', 'Part-time', 'Freelance/Contract', 'Internship'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs tracking-wider uppercase ${filterType === type
                            ? 'bg-brand-burgundy text-white shadow-md shadow-brand-burgundy/20'
                            : 'bg-brand-cream/50 dark:bg-white/10 text-brand-ebony/70 dark:text-brand-ebony/80 hover:text-brand-ebony dark:hover:text-brand-ebony border border-brand-ebony/10 dark:border-white/10 hover:border-brand-burgundy/30 hover:bg-brand-burgundy/5'
                            }`}
                    >
                        {type === 'all' ? 'All Jobs' : type}
                    </button>
                ))}
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <JobSkeleton key={i} />
                    ))
                ) : activeJobs.length > 0 ? (
                    activeJobs.map(job => (
                        <JobCard
                            key={job.id}
                            job={job}
                            currentUser={currentUser}
                            onDelete={() => setDeletingJobId(job.id)}
                        />
                    ))
                ) : (
                    <div className="card-premium p-16 text-center border-dashed border-2 border-brand-ebony/10">
                        <div className="w-16 h-16 bg-brand-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-brand-burgundy/60" />
                        </div>
                        <p className="text-brand-ebony/60 font-medium font-serif italic text-lg mb-1">No job opportunities available</p>
                        <p className="text-brand-ebony/40 text-sm mb-6">Be the first to post an opportunity for the network.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="text-brand-burgundy hover:text-indigo-500 font-bold tracking-wide text-sm bg-brand-burgundy/10 hover:bg-brand-burgundy/20 px-6 py-2.5 rounded-lg transition-colors inline-block"
                        >
                            Post an opportunity
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateOpportunityModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateOpportunity}
            />

            <ConfirmDialog
                isOpen={!!deletingJobId}
                onClose={() => setDeletingJobId(null)}
                onConfirm={handleDeleteJob}
                title="Delete Job Posting"
                message="Are you sure you want to delete this job posting?"
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
