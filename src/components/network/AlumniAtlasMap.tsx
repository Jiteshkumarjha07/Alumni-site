'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { User } from '@/types';
import { City } from 'country-state-city';
import { MapPin, Briefcase, Radio, Users, ZoomIn, ZoomOut, Globe2, ChevronRight, Search, X } from 'lucide-react';
import Link from 'next/link';

/* ── Geocode ── */
function geocodeUser(user: User, allCities: ReturnType<typeof City.getAllCities>) {
  if (user.liveLocation?.lat && user.liveLocation?.lng)
    return { lat: user.liveLocation.lat, lng: user.liveLocation.lng, isLive: true };
  if (!user.location) return null;
  const parts = user.location.split(',').map(s => s.trim());
  if (parts.length >= 3) {
    const city = (City.getCitiesOfState(parts[2], parts[1]) || []).find(c => c.name === parts[0]);
    if (city?.latitude && city?.longitude) return { lat: +city.latitude, lng: +city.longitude, isLive: false };
  }
  if (parts.length === 2) {
    const city = allCities.find(c => c.name === parts[0] && c.countryCode === parts[1]);
    if (city?.latitude && city?.longitude) return { lat: +city.latitude, lng: +city.longitude, isLive: false };
  }
  const city = allCities.find(c => c.name.toLowerCase() === parts[0].toLowerCase());
  if (city?.latitude && city?.longitude) return { lat: +city.latitude, lng: +city.longitude, isLive: false };
  return null;
}

/* ── Icon ── */
const createIcon = (user: User, isLive: boolean, isSelected: boolean) => {
  const bg = isLive ? '#10b981' : isSelected ? '#f59e0b' : '#881337';
  const anim = isLive ? 'pulseLive' : 'pulseStatic';
  
  // Basic escaping to prevent XSS in Leaflet's divIcon HTML string
  const escapeHtml = (str: string) => str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m] || m));

  const safeProfilePic = user.profilePic ? escapeHtml(user.profilePic) : null;
  const safeNameInitial = escapeHtml(user.name[0].toUpperCase());

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:46px;height:54px">
      <div style="width:46px;height:46px;border-radius:50%;border:3px solid white;background:${bg};
        display:flex;align-items:center;justify-content:center;overflow:hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation:${anim} 2.5s infinite;cursor:pointer;">
        ${safeProfilePic ? `<img src="${safeProfilePic}" style="width:100%;height:100%;object-fit:cover"/>` : `<span style="color:#fff;font-weight:700;font-size:17px;font-family:sans-serif">${safeNameInitial}</span>`}
        ${isLive ? `<div style="position:absolute;top:2px;right:2px;width:11px;height:11px;background:#10b981;border-radius:50%;border:2px solid #fff"></div>` : ''}
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid white"></div>
    </div>`,
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -56],
  });
};

/* ── Custom Zoom ── */
function ZoomButtons() {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', top: 72, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { icon: <ZoomIn className="w-4 h-4" />, fn: () => map.zoomIn(), title: 'Zoom In' },
        { icon: <ZoomOut className="w-4 h-4" />, fn: () => map.zoomOut(), title: 'Zoom Out' },
        { icon: <Globe2 className="w-4 h-4" />, fn: () => map.setView([20, 0], 2), title: 'Reset View' },
      ].map((b, i) => (
        <button key={i} onClick={b.fn} title={b.title}
          style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', cursor: 'pointer', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {b.icon}
        </button>
      ))}
    </div>
  );
}

/* ── Map Controller — captures map instance into a ref ── */
function MapController({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

interface AlumniAtlasMapProps { users: User[]; }

export default function AlumniAtlasMap({ users }: AlumniAtlasMapProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({}); // uid → Leaflet Marker

  const flyToUser = (uid: string, lat: number, lng: number) => {
    setSelectedUid(uid);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      setTimeout(() => {
        const marker = markerRefs.current[uid];
        if (marker) marker.openPopup();
      }, 1300);
    }
  };

  const allCities = useMemo(() => City.getAllCities(), []);

  const markers = useMemo(() => {
    const raw = users.map(u => {
      const geo = geocodeUser(u, allCities);
      return geo ? { user: u, ...geo } : null;
    }).filter(Boolean) as { user: User; lat: number; lng: number; isLive: boolean }[];

    return raw.map((m, i, arr) => {
      const dupes = arr.filter(x => x.lat === m.lat && x.lng === m.lng);
      return dupes.length > 1
        ? { ...m, lat: m.lat + (((i * 13) % 10) - 5) * 0.0005, lng: m.lng + (((i * 17) % 10) - 5) * 0.0005 }
        : m;
    });
  }, [users, allCities]);

  const liveCount = markers.filter(m => m.isLive).length;
  const countryCount = useMemo(() => new Set(markers.map(m => m.user.location?.split(',').pop()?.trim())).size, [markers]);
  const filtered = useMemo(() => markers.filter(m =>
    !query || m.user.name.toLowerCase().includes(query.toLowerCase()) || m.user.location?.toLowerCase().includes(query.toLowerCase())
  ), [markers, query]);

  if (typeof window === 'undefined') return null;

  return (
    <>
      <style>{`
        @keyframes pulseStatic{0%{box-shadow:0 0 0 0 rgba(136,19,55,.4)}70%{box-shadow:0 0 0 13px rgba(136,19,55,0)}100%{box-shadow:0 0 0 0 rgba(136,19,55,0)}}
        @keyframes pulseLive{0%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}70%{box-shadow:0 0 0 17px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
        .leaflet-container{background:#eef2f5!important;font-family:inherit}
        .leaflet-popup-content-wrapper{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;border-radius:18px!important}
        .leaflet-popup-content{margin:0!important;width:272px!important}
        .leaflet-popup-tip-container{display:none!important}
        .leaflet-control-attribution{background:rgba(255,255,255,.7)!important;color:rgba(0,0,0,.4)!important;font-size:9px!important;backdrop-filter:blur(4px)}
        .leaflet-control-attribution a{color:rgba(0,0,0,.5)!important}
        .marker-cluster-small,.marker-cluster-medium,.marker-cluster-large{background:rgba(136,19,55,.1)!important}
        .marker-cluster-small div,.marker-cluster-medium div,.marker-cluster-large div{background:rgba(136,19,55,.9)!important;color:#fff!important;font-weight:700!important;border:2px solid #fff}
      `}</style>

      <div style={{ position: 'relative', width: '100%', height: 640, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>

        {/* ── Stats Bar ── */}
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { icon: <Users className="w-3.5 h-3.5 text-amber-500" />, val: markers.length, label: 'on map', bg: 'rgba(255,255,255,.9)' },
            ...(liveCount > 0 ? [{ icon: <Radio className="w-3.5 h-3.5 text-emerald-500" style={{ animation: 'pulseIcon 1s infinite' } as any} />, val: liveCount, label: 'live now', bg: 'rgba(209,250,229,.9)' }] : []),
            { icon: <Globe2 className="w-3.5 h-3.5 text-blue-500" />, val: countryCount, label: 'countries', bg: 'rgba(255,255,255,.9)' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 12, background: s.bg, border: '1px solid rgba(0,0,0,0.05)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#1a1a2e' }}>
              {s.icon}
              <span style={{ fontWeight: 700, fontSize: 13 }}>{s.val}</span>
              <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11 }}>{s.label}</span>
            </div>
          ))}
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 13px', borderRadius: 12, background: 'rgba(255,255,255,.9)', border: '1px solid rgba(0,0,0,0.05)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(0,0,0,0.55)', fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#881337', display: 'inline-block' }} />City
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />Live GPS
            </span>
          </div>
        </div>

        {/* ── Panel Toggle ── */}
        <button onClick={() => setPanelOpen(p => !p)}
          style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1001, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, background: 'rgba(255,255,255,.95)', border: '1px solid rgba(0,0,0,0.1)', color: '#1a1a2e', fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Users style={{ width: 15, height: 15, color: '#f59e0b' }} />
          {panelOpen ? 'Hide List' : 'Alumni List'}
          <ChevronRight style={{ width: 14, height: 14, transform: panelOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s' }} />
        </button>

        {/* ── Map ── */}
        <MapContainer center={[20, 0]} zoom={2} zoomControl={false} scrollWheelZoom
          style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ZoomButtons />
          <MapController mapRef={mapRef} />
          <MarkerClusterGroup chunkedLoading maxClusterRadius={55} disableClusteringAtZoom={15} spiderfyOnMaxZoom={true}>
            {markers.map((m, i) => (
              <Marker key={`${m.user.uid}-${i}`} position={[m.lat, m.lng]}
                icon={createIcon(m.user, m.isLive, selectedUid === m.user.uid)}
                ref={(ref) => { if (ref) markerRefs.current[m.user.uid] = ref; }}
                eventHandlers={{ click: () => setSelectedUid(m.user.uid) }}>
                <Popup>
                  <div style={{ borderRadius: 18, overflow: 'hidden', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
                    {/* Header */}
                    <div style={{ height: 72, background: m.isLive ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#881337,#c2185b)', position: 'relative' }}>
                      {m.isLive && (
                        <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 900, color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase' }}>● LIVE</span>
                      )}
                      <div style={{ position: 'absolute', bottom: -26, left: 16, width: 52, height: 52, borderRadius: '50%', border: '3px solid #fff', overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.user.profilePic ? <img src={m.user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#1a1a2e', fontWeight: 900, fontSize: 20 }}>{m.user.name[0].toUpperCase()}</span>}
                      </div>
                    </div>
                    {/* Body */}
                    <div style={{ padding: '34px 16px 16px' }}>
                      <Link href={`/profile/view?id=${m.user.uid}`} style={{ display: 'block', color: '#1a1a2e', fontWeight: 900, fontSize: 15, marginBottom: 2, textDecoration: 'none' }}>{m.user.name}</Link>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(251,191,36,.12)', padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Batch {m.user.batch}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                        {m.user.profession && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4b5563', fontSize: 12 }}><Briefcase style={{ width: 13, height: 13, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user.profession}</span></div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4b5563', fontSize: 12 }}>
                          <MapPin style={{ width: 13, height: 13, flexShrink: 0, color: m.isLive ? '#10b981' : '#9ca3af' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user.location || 'Unknown'}</span>
                        </div>
                      </div>
                      <Link href={`/profile/view?id=${m.user.uid}`}
                        style={{ display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 900, color: '#fff', textDecoration: 'none', background: m.isLive ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#881337,#c2185b)', boxShadow: '0 4px 12px rgba(136,19,55,0.2)' }}>
                        View Profile →
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* ── Side Panel ── */}
        <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: panelOpen ? 272 : 0, zIndex: 999, transition: 'width .3s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,.9)', borderLeft: '1px solid rgba(0,0,0,0.05)', backdropFilter: 'blur(16px)' }}>
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#1a1a2e', fontWeight: 900, fontSize: 13 }}>Alumni on Map</span>
              <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2 }}><X style={{ width: 14, height: 14 }} /></button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#9ca3af' }} />
              <input type="text" placeholder="Name or city…" value={query} onChange={e => setQuery(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 10, background: '#f3f4f6', border: '1px solid transparent', color: '#1a1a2e', fontSize: 12, outline: 'none' }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', scrollbarWidth: 'none' }}>
            {filtered.length === 0
              ? <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, paddingTop: 32 }}>No alumni match</p>
              : filtered.map((m, i) => (
                <button key={`panel-${m.user.uid}-${i}`}
                  onClick={() => flyToUser(m.user.uid, m.lat, m.lng)}
                  title="Fly to location"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, marginBottom: 4, cursor: 'pointer', textAlign: 'left', border: selectedUid === m.user.uid ? '1px solid #881337' : '1px solid transparent', background: selectedUid === m.user.uid ? 'rgba(136,19,55,0.05)' : 'transparent', transition: 'all .2s' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${m.isLive ? '#10b981' : '#881337'}`, background: m.isLive ? '#10b981' : '#881337', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.user.profilePic ? <img src={m.user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>{m.user.name[0]}</span>}
                    </div>
                    {m.isLive && <span style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, background: '#10b981', borderRadius: '50%', border: '2px solid #fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#1a1a2e', fontSize: 12, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user.name}</p>
                    <p style={{ color: '#6b7280', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user.location || 'Unknown'}</p>
                  </div>
                  {m.isLive && <span style={{ fontSize: 9, color: '#059669', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Live</span>}
                </button>
              ))}
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center', color: '#9ca3af', fontSize: 10 }}>
            {filtered.length} of {markers.length} alumni plotted
          </div>
        </div>
      </div>
    </>
  );
}

