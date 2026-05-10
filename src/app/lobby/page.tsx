'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { InstituteLobby } from '@/components/lobby/InstituteLobby';

export default function LobbyPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userData) router.push('/login');
  }, [userData, loading, router]);

  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-violet-200" />
          <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-12 w-full">
      <InstituteLobby />
    </div>
  );
}
