/**
 * GpsMap.jsx
 * Shared map component using Leaflet + OpenStreetMap (free, no API key).
 *
 * Props:
 *   lat         {number}   latitude
 *   lng         {number}   longitude
 *   interactive {boolean}  if true, clicking the map moves the pin and calls onMove
 *   onMove      {fn}       (lat, lng) => void  — called when pin is dragged / map clicked
 *   height      {number}   map height in px (default 220)
 */
import { useEffect, useRef, useState, useCallback } from 'react';

// Dynamically import Leaflet CSS once
let cssInjected = false;
function injectLeafletCss() {
  if (cssInjected) return;

  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

function MapInstance({ lat, lng, interactive, onMove, height, scrollWheel }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    injectLeafletCss();
    let L;
    let destroyed = false;

    import('leaflet').then((mod) => {
      if (destroyed) return;
      L = mod.default || mod;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: scrollWheel ?? false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      const greenIcon = L.divIcon({
        html: `
          <div style="
            width: 30px; height: 30px;
            background: linear-gradient(135deg, #1A7A35, #22A84B);
            border: 3px solid #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 14px rgba(34,168,75,0.5), 0 2px 5px rgba(0,0,0,0.25);
          "></div>
        `,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([lat, lng], {
        icon: greenIcon,
        draggable: interactive,
      }).addTo(map);

      if (interactive) {
        marker.on('dragend', (e) => {
          const { lat: la, lng: lo } = e.target.getLatLng();
          onMove?.(parseFloat(la.toFixed(6)), parseFloat(lo.toFixed(6)));
        });
        map.on('click', (e) => {
          const { lat: la, lng: lo } = e.latlng;
          marker.setLatLng([la, lo]);
          onMove?.(parseFloat(la.toFixed(6)), parseFloat(lo.toFixed(6)));
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!isValidCoord(lat, lng)) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom());
  }, [lat, lng]);

  // Invalidate map size when height changes (fullscreen toggle)
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
    }
  }, [height]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}

export default function GpsMap({ lat, lng, interactive = false, onMove, height = 220 }) {
  const [fullscreen, setFullscreen] = useState(false);

  // Close fullscreen on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleMove = useCallback((la, lo) => {
    onMove?.(la, lo);
  }, [onMove]);

  // ── Fullscreen overlay ──
  const fullscreenOverlay = fullscreen && (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(3,14,6,0.88)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        animation: 'gpsMapFadeIn 0.2s ease',
      }}
      onClick={() => setFullscreen(false)}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px', flexShrink: 0,
          background: 'linear-gradient(135deg,#051A0A,#0A2D14)',
          borderBottom: '1px solid rgba(52,201,97,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'rgba(34,168,75,0.2)', border: '1.5px solid rgba(93,216,130,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>📍</div>

        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(93,216,130,0.7)',
            fontFamily: 'Montserrat,sans-serif', display: 'block',
          }}>Project Location</span>
          <span style={{
            fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700,
            color: '#fff',
          }}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        </div>

        {interactive && (
          <span style={{
            fontFamily: 'Montserrat,sans-serif', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#5DD882', background: 'rgba(34,168,75,0.15)',
            border: '1px solid rgba(93,216,130,0.3)',
            padding: '4px 12px', borderRadius: 99,
          }}>
            📍 Click or drag pin to move
          </span>
        )}

        {/* Open in OSM */}
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 9,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#cde', fontSize: 11, fontWeight: 700,
            textDecoration: 'none', fontFamily: 'Montserrat,sans-serif',
            transition: 'background 0.15s',
          }}
        >
          🌐 Open in OSM
        </a>

        {/* Close button */}
        <button
          onClick={() => setFullscreen(false)}
          style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, transition: 'all 0.15s',
          }}
        >
          ✕
        </button>
      </div>

      {/* Map fills the rest */}
      <div
        style={{ flex: 1, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <MapInstance
          lat={lat} lng={lng}
          interactive={interactive}
          onMove={handleMove}
          height="100%"
          scrollWheel={true}
        />
      </div>

      {/* Bottom hint */}
      <div style={{
        padding: '8px 16px', textAlign: 'center', flexShrink: 0,
        background: 'rgba(5,26,10,0.7)',
        fontFamily: 'Montserrat,sans-serif', fontSize: 10, fontWeight: 700,
        color: 'rgba(93,216,130,0.55)', letterSpacing: '0.06em',
      }}>
        Press <kbd style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 6px', color: '#adc' }}>Esc</kbd> or click outside to close
      </div>

      <style>{`@keyframes gpsMapFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
    </div>
  );

  // ── Normal (inline) map ──
  return (
    <>
      {fullscreenOverlay}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--g200)' }}>
        <MapInstance
          lat={lat} lng={lng}
          interactive={interactive}
          onMove={handleMove}
          height={height}
          scrollWheel={false}
        />

        {/* Expand button — top right */}
        <button
          onClick={() => setFullscreen(true)}
          title="Expand map"
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 500,
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(5,26,10,0.78)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(93,216,130,0.35)',
            color: '#5DD882', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, transition: 'all 0.15s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          }}
        >
          ⛶
        </button>

        {/* Interactive hint */}
        {interactive && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(5,26,10,0.75)', backdropFilter: 'blur(6px)',
            color: '#5DD882', fontSize: 10, fontWeight: 800,
            fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.08em',
            padding: '4px 12px', borderRadius: 99,
            pointerEvents: 'none', zIndex: 500, whiteSpace: 'nowrap',
          }}>
            📍 Click map or drag pin to update location
          </div>
        )}
      </div>
    </>
  );
}

export function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Parse a GPS string like "23.8103, 90.4125" → { lat: 23.8103, lng: 90.4125 }
 * Returns null if unparseable.
 */
export function parseGps(str) {
  if (!str) return null;
  const parts = String(str).split(/[,\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!isValidCoord(lat, lng)) return null;
  return { lat, lng };
}
