'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Job } from '@/types';
import { JobCard } from '@/components/jobs/JobCard';
import { CreateOpportunityModal, OpportunityFormData } from '@/components/modals/CreateOpportunityModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { Briefcase, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
        if (!userData) {
            setTimeout(() => setLoading(false), 0);
            return;
        }

        const jobsQuery = query(
            collection(db, 'opportunities'),
            orderBy('createdAt', 'desc')
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
            createdAt: serverTimestamp(),
            expiresAt: expiresAt
        });
    };

    const handleDeleteJob = async () => {
        if (!deletingJobId) return;
        await deleteDoc(doc(db, 'opportunities', deletingJobId));
        setDeletingJobId(null);
    };

    const filteredJobs = jobs.filter(job => {
        if (filterType === 'all') return true;
        return job.type === filterType;
    });

    const activeJobs = filteredJobs.filter(job => {
        if (!job.expiresAt) return true;
        const now = new Date();
        const expiryDate = job.expiresAt.toDate();
        return expiryDate > now;
    });

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!userData) return null; // Wait for redirect



    return (
        <div className="max-w-6xl mx-auto p-4 pt-8 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-burgundy/10 p-2 sm:p-3 rounded-xl border border-brand-burgundy/20 hidden sm:block">
                        <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-brand-burgundy" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-ebony">
                        Jobs
                        <span className="hidden sm:inline"> Opportunities</span>
                    </h1>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-2.5 bg-brand-burgundy text-white text-sm sm:text-sm rounded-xl hover:bg-[#5a2427] shadow-sm transition-all font-semibold tracking-wide active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    <span>Post a Job</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'Full-time', 'Part-time', 'Freelance/Contract', 'Internship'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition text-sm ${filterType === type
                            ? 'bg-brand-burgundy text-white shadow-sm'
                            : 'bg-brand-parchment/50 text-brand-ebony/70 hover:bg-brand-parchment border border-brand-ebony/10'
                            }`}
                    >
                        {type === 'all' ? 'All Jobs' : type}
                    </button>
                ))}
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {activeJobs.length > 0 ? (
                    activeJobs.map(job => (
                        <JobCard
                            key={job.id}
                            job={job}
                            currentUser={userData}
                            onDelete={() => setDeletingJobId(job.id)}
                        />
                    ))
                ) : (
                    <div className="bg-brand-parchment/50 border border-brand-ebony/10 rounded-xl shadow-sm p-12 text-center">
                        <Briefcase className="w-16 h-16 text-brand-ebony/20 mx-auto mb-4" />
                        <p className="text-brand-ebony/60 font-medium">No job opportunities available</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 text-brand-burgundy hover:text-[#5a2427] font-semibold tracking-wide"
                        >
                            Post the first opportunity
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
