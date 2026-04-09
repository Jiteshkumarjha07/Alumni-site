'use client';

import { Job, User } from '@/types';
import { MapPin, Briefcase, Calendar, Trash2, ChevronRight } from 'lucide-react';

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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const typeColors: Record<string, string> = {
        'Full-time': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        'Part-time': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        'Freelance/Contract': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        'Internship': 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    };

    return (
        <div className="card-premium p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out group">
            <div className="flex items-start justify-between mb-5">
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                         <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${typeColors[job.type] || 'bg-brand-ebony/5 text-brand-ebony/80 border-brand-ebony/10'}`}>
                            {job.type}
                        </span>
                        {job.location && (
                            <span className="flex items-center gap-1 text-[11px] text-brand-ebony/40 font-bold uppercase tracking-wider">
                                <MapPin className="w-3.5 h-3.5 text-brand-burgundy/40" />
                                {job.location}
                            </span>
                        )}
                    </div>
                    <h3 className="text-2xl font-serif font-extrabold text-brand-ebony mb-1 leading-tight group-hover:text-brand-burgundy transition-colors">{job.title}</h3>
                    <p className="text-md font-bold text-brand-ebony/70 italic">{job.company}</p>
                </div>

                {isOwnJob && onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-2.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete job posting"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="bg-brand-ebony/5 dark:bg-white/5 rounded-2xl p-5 mb-6 border border-brand-ebony/5">
                <p className="text-brand-ebony/80 text-sm leading-relaxed whitespace-pre-wrap font-sans line-clamp-4">{job.description}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-burgundy/10 flex items-center justify-center shrink-0 border border-brand-burgundy/20">
                         <Briefcase className="w-4 h-4 text-brand-burgundy" />
                    </div>
                    <div className="text-[11px]">
                        <p className="text-brand-ebony/40 font-bold uppercase tracking-wider leading-none">Posted by <span className="text-brand-ebony/70">{job.postedByName}</span></p>
                        <p className="flex items-center gap-1.5 mt-1 text-brand-ebony/30 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(job.createdAt)}
                            {job.expiresAt && <span className="text-brand-gold/60 ml-1">· Expires {formatDate(job.expiresAt)}</span>}
                        </p>
                    </div>
                </div>

                {job.contact && (
                    <a
                        href={job.contact.includes('@') ? `mailto:${job.contact}` : job.contact}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-indigo text-white hover:shadow-[0_4px_15px_rgba(99,102,241,0.4)] shadow-md rounded-xl transition-all font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 group/btn"
                    >
                        <span>Apply Now</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                )}
            </div>
        </div>
    );
};
