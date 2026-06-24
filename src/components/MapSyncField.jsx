/**
 * MapSyncField.jsx
 *
 * Encapsulated component that wires together:
 *   - A GPS text input
 *   - An embedded interactive GpsMap (Leaflet)
 *   - A Site Address input with Nominatim reverse-geocoding
 *
 * Props:
 *   gpsValue        {string}  current GPS field string value
 *   addressValue    {string}  current address field string value
 *   onGpsChange     {fn}      (str) => void — updates GPS field in parent form
 *   onAddressChange {fn}      (str) => void — updates address field in parent form
 *   gpsError        {object}  react-hook-form error for GPS field
 *   addressError    {object}  react-hook-form error for address field
 *   gpsLabel        {string}  label text
 *   addressLabel    {string}  label text
 *   gpsPlaceholder  {string}
 *   addressPlaceholder {string}
 *   gpsRequired     {boolean}
 *   addressRequired {boolean}
 *   gpsRegisterProps   {object} spread from register()
 *   addressRegisterProps {object} spread from register()
 */
import { useState, useEffect, useCallback } from 'react';
import GpsMap, { parseGps, isValidCoord } from './GpsMap.jsx';

const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: `1.5px solid ${hasError ? '#FCA5A5' : 'var(--border)'}`,
  background: hasError ? '#FFF5F5' : '#fff',
  color: 'var(--tx)',
  fontSize: 13.5,
  fontFamily: 'Nunito,sans-serif',
  fontWeight: 600,
  outline: 'none',
  transition: 'all 0.18s',
  boxShadow: hasError ? '0 0 0 3px rgba(239,68,68,0.08)' : 'var(--sh-xs)',
});

const labelStyle = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--tx-muted)',
  fontFamily: 'Montserrat,sans-serif',
  marginBottom: 6,
};

export default function MapSyncField({
  gpsValue = '',
  addressValue = '',
  onGpsChange,
  onAddressChange,
  gpsError,
  addressError,
  gpsLabel = 'GPS Coordinates',
  addressLabel = 'Site Address',
  gpsPlaceholder = 'e.g. 23.8103° N, 90.4125° E',
  addressPlaceholder = 'Street number, Area, City',
  gpsRequired = true,
  addressRequired = true,
  gpsRegisterProps = {},
  addressRegisterProps = {},
}) {
  const [mapLat, setMapLat] = useState(DEFAULT_LAT);
  const [mapLng, setMapLng] = useState(DEFAULT_LNG);
  const [mapVisible, setMapVisible] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // When GPS value changes externally (e.g. on load), sync map pin
  useEffect(() => {
    const parsed = parseGps(gpsValue);
    if (parsed) {
      setMapLat(parsed.lat);
      setMapLng(parsed.lng);
      setMapVisible(true);
    }
  }, []); // only on mount — user typing handled by onGpsInputChange

  // ── Reverse-geocode via Nominatim (free, no key) ─────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=en`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data?.display_name) {
        // Build a clean short address
        const a = data.address || {};
        const parts = [
          a.house_number,
          a.road,
          a.suburb || a.neighbourhood,
          a.city || a.town || a.village || a.county,
          a.state,
        ].filter(Boolean);
        const shortAddr = parts.length > 0 ? parts.join(', ') : data.display_name;
        onAddressChange?.(shortAddr);
      }
    } catch (_) {
      // silently ignore — user can type manually
    } finally {
      setGeocoding(false);
    }
  }, [onAddressChange]);

  // ── Map pin moved (click or drag) ─────────────────────────────────────────
  const handleMapMove = useCallback((lat, lng) => {
    setMapLat(lat);
    setMapLng(lng);
    const gpsStr = `${lat}° N, ${lng}° E`;
    onGpsChange?.(gpsStr);
    reverseGeocode(lat, lng);
  }, [onGpsChange, reverseGeocode]);

  // ── GPS text field typed ───────────────────────────────────────────────────
  const handleGpsInput = (e) => {
    const val = e.target.value;
    onGpsChange?.(val);
    const parsed = parseGps(val);
    if (parsed) {
      setMapLat(parsed.lat);
      setMapLng(parsed.lng);
      setMapVisible(true);
    }
  };

  return (
    <div style={{ gridColumn: 'span 2' }}>
      {/* ── Row: GPS + Address inputs side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 14 }}>

        {/* GPS Coordinates */}
        <div>
          <label style={labelStyle}>
            {gpsLabel} {gpsRequired && <span style={{ color: '#EF4444' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              {...gpsRegisterProps}
              className="pif-input"
              placeholder={gpsPlaceholder}
              style={{ ...inputStyle(gpsError), paddingRight: 44 }}
              onChange={handleGpsInput}
              value={gpsValue}
            />
            {/* Pin icon button */}
            <button
              type="button"
              title="Show map"
              onClick={() => setMapVisible(v => !v)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: 7,
                background: mapVisible ? 'var(--g600)' : 'rgba(34,168,75,0.12)',
                border: `1.5px solid ${mapVisible ? 'var(--g500)' : 'rgba(34,168,75,0.3)'}`,
                color: mapVisible ? '#fff' : 'var(--g600)',
                cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'all 0.18s',
              }}
            >📍</button>
          </div>
          {gpsError && (
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>
              ⚠ {gpsError.message}
            </p>
          )}
        </div>

        {/* Site Address */}
        <div>
          <label style={labelStyle}>
            {addressLabel} {addressRequired && <span style={{ color: '#EF4444' }}>*</span>}
            {geocoding && (
              <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--g600)', fontWeight: 700, letterSpacing: '0.08em' }}>
                📡 Detecting…
              </span>
            )}
          </label>
          <input
            {...addressRegisterProps}
            className="pif-input"
            placeholder={addressPlaceholder}
            style={inputStyle(addressError)}
            value={addressValue}
            onChange={(e) => onAddressChange?.(e.target.value)}
          />
          {addressError && (
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>
              ⚠ {addressError.message}
            </p>
          )}
        </div>
      </div>

      {/* ── Interactive Map (animated open/close) ── */}
      <div style={{
        overflow: 'hidden',
        maxHeight: mapVisible ? 380 : 0,
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
        borderRadius: 12,
      }}>
        {/* Map card header */}
        <div style={{
          background: 'linear-gradient(135deg, #051A0A, #0A2D14)',
          borderRadius: '12px 12px 0 0',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid rgba(52,201,97,0.2)',
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(34,168,75,0.2)', border: '1.5px solid rgba(93,216,130,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}>📍</span>
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(93,216,130,0.7)',
              fontFamily: 'Montserrat,sans-serif', display: 'block',
            }}>Interactive Map</span>
            <span style={{
              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {isValidCoord(mapLat, mapLng) ? `${mapLat.toFixed(5)}, ${mapLng.toFixed(5)}` : 'Click the map to set location'}
            </span>
          </div>
          <span style={{
            fontFamily: 'Montserrat,sans-serif', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#5DD882', background: 'rgba(34,168,75,0.15)',
            border: '1px solid rgba(93,216,130,0.3)',
            padding: '3px 10px', borderRadius: 99,
          }}>
            📍 Click or drag pin
          </span>
        </div>

        {/* Map itself */}
        {mapVisible && (
          <GpsMap
            lat={mapLat}
            lng={mapLng}
            interactive={true}
            onMove={handleMapMove}
            height={280}
          />
        )}
      </div>

      {/* Hint when map is hidden */}
      {!mapVisible && (
        <button
          type="button"
          onClick={() => setMapVisible(true)}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 10,
            border: '1.5px dashed rgba(34,168,75,0.3)',
            background: 'rgba(34,168,75,0.04)',
            color: 'var(--g700)', fontSize: 12, fontWeight: 700,
            fontFamily: 'Montserrat,sans-serif', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,168,75,0.10)'; e.currentTarget.style.borderColor = 'var(--g400)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,168,75,0.04)'; e.currentTarget.style.borderColor = 'rgba(34,168,75,0.3)'; }}
        >
          🗺️ Click to open interactive map &amp; auto-fill location
        </button>
      )}
    </div>
  );
}
