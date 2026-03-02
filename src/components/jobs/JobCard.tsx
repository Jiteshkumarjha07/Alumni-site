'use client';

import { Job, User } from '@/types';
import { MapPin, Briefcase, Calendar, Trash2 } from 'lucide-react';

interface JobCardProps {
    job: Job;
    currentUser: User;
    onDelete?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, currentUser, onDelete }) => {
    const isOwnJob = job.postedByUid === currentUser.uid;

    const formatDate = (timestamp: unknown) => {
        if (!timestamp) return '';
        const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string | number | Date);
        return date.toLocaleDateString();
    };

    const typeColors: Record<string, string> = {
        'Full-time': 'bg-green-100 text-green-800',
        'Part-time': 'bg-blue-100 text-blue-800',
        'Freelance/Contract': 'bg-purple-100 text-purple-800',
        'Internship': 'bg-yellow-100 text-yellow-800',
    };

    return (
        <div className="bg-brand-parchment/80 rounded-xl shadow-sm border border-brand-ebony/10 p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-serif font-bold text-brand-ebony mb-2">{job.title}</h3>
                    <p className="text-lg text-brand-ebony/80 mb-2">{job.company}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${typeColors[job.type] || 'bg-brand-ebony/5 text-brand-ebony/80'}`}>
                            {job.type}
                        </span>
                        {job.location && (
                            <span className="flex items-center gap-1 text-sm text-brand-ebony/70 font-medium ml-2">
                                <MapPin className="w-4 h-4 text-brand-burgundy/60" />
                                {job.location}
                            </span>
                        )}
                    </div>
                </div>

                {isOwnJob && onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete job posting"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            <p className="text-brand-ebony/80 mb-4 whitespace-pre-wrap font-sans">{job.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-brand-ebony/10">
                <div className="text-sm text-brand-ebony/60">
                    <p>Posted by {job.postedByName} (Batch {job.postedByBatch})</p>
                    <p className="flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(job.createdAt)}
                        {job.expiresAt && ` • Expires ${formatDate(job.expiresAt)}`}
                    </p>
                </div>

                {job.contact && (
                    <a
                        href={job.contact.includes('@') ? `mailto:${job.contact}` : job.contact}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-brand-burgundy text-white hover:bg-[#5a2427] shadow-sm rounded-lg transition font-medium tracking-wide text-sm"
                    >
                        Apply Now
                    </a>
                )}
            </div>
        </div>
    );
};
