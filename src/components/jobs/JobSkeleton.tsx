'use client';

export function JobSkeleton() {
    return (
        <div className="bg-brand-parchment/30 rounded-2xl border border-brand-ebony/5 p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-start w-full">
                    <div className="w-12 h-12 bg-brand-ebony/5 rounded-xl border border-brand-ebony/5" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 bg-brand-ebony/10 rounded w-1/3" />
                        <div className="h-4 bg-brand-ebony/5 rounded w-1/4" />
                    </div>
                </div>
                <div className="h-6 bg-brand-ebony/5 rounded-full w-20" />
            </div>
            
            <div className="space-y-2 mb-6">
                <div className="h-3 bg-brand-ebony/5 rounded w-full" />
                <div className="h-3 bg-brand-ebony/5 rounded w-5/6" />
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-brand-ebony/5">
                <div className="flex gap-4">
                    <div className="h-4 bg-brand-ebony/5 rounded w-24" />
                    <div className="h-4 bg-brand-ebony/5 rounded w-20" />
                </div>
                <div className="h-9 bg-brand-ebony/10 rounded-xl w-28" />
            </div>
        </div>
    );
}
