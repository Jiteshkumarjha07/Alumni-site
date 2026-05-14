'use client';

import dynamic from 'next/dynamic';
import { User } from '@/types';
import { Globe2 } from 'lucide-react';

const AlumniAtlasMap = dynamic(() => import('./AlumniAtlasMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: 640, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: 'linear-gradient(160deg,#0f0f1a,#16213e)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(136,19,55,.2)', animation: 'spin 2s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#881337', animation: 'spin 1.2s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Globe2 style={{ width: 26, height: 26, color: 'rgba(136,19,55,.7)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: '0 0 4px' }}>Loading Alumni Atlas</p>
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, margin: 0 }}>Plotting alumni across the globe…</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(136,19,55,.7)', animation: `dotBounce 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dotBounce { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1.2);opacity:1} }
      ` }} />
    </div>
  ),
});

export function AlumniAtlas({ users }: { users: User[] }) {
  return <AlumniAtlasMap users={users} />;
}
