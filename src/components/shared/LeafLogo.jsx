export default function LeafLogo({ size = 40, animated = false }) {
  return (
    <svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg"
      width={size} height={size * 1.25} className={animated ? 'leaf-float' : ''}>
      <defs>
        <linearGradient id="lg3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34C961" />
          <stop offset="100%" stopColor="#0D3B1A" />
        </linearGradient>
      </defs>
      <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z" fill="rgba(13,59,26,0.12)" transform="translate(3,3)" />
      <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z" fill="url(#lg3)" />
      <path d="M40 8 C30 18 22 35 25 55 C30 40 36 25 40 8Z" fill="rgba(255,255,255,0.18)" />
      <line x1="40" y1="96" x2="40" y2="100" stroke="#0D3B1A" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 16 C40 42 40 66 40 90" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M40 32 C30 37 18 34 12 30" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M40 32 C50 37 62 34 68 30" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M40 52 C28 57 15 52 10 47" stroke="rgba(255,255,255,0.16)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M40 52 C52 57 65 52 70 47" stroke="rgba(255,255,255,0.16)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Darken a hex color by mixing with black
function darkenHex(hex, amount = 0.35) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

// Big colored leaf — accepts colorCode (hex) and optional imageUrl from eval rules
// If imageUrl is set, shows the image instead of the SVG
export function ColoredLeaf({ level, colorCode, imageUrl, size = 90 }) {
  const base = colorCode || '#94A3B8';
  const dark = darkenHex(base, 0.32);
  const shadow = colorCode ? `${base}55` : 'rgba(0,0,0,0.10)';
  const uid = base.replace('#', 'c');
  const h = size * 1.25;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={level || 'Leaf'}
          style={{
            width: size, height: h, objectFit: 'contain',
            filter: `drop-shadow(0 4px 14px ${shadow})`,
            transition: 'filter 0.5s ease',
          }}
        />
      ) : (
        <svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg"
          width={size} height={h}
          style={{ filter: `drop-shadow(0 4px 14px ${shadow})`, transition: 'filter 0.5s ease' }}>
          <defs>
            <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={base} />
              <stop offset="100%" stopColor={dark} />
            </linearGradient>
          </defs>
          <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z"
            fill="rgba(0,0,0,0.10)" transform="translate(3,3)" />
          <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z"
            fill={`url(#${uid})`} style={{ transition: 'fill 0.5s ease' }} />
          <path d="M40 8 C30 18 22 35 25 55 C30 40 36 25 40 8Z"
            fill="rgba(255,255,255,0.22)" />
          <line x1="40" y1="96" x2="40" y2="100"
            stroke={dark} strokeWidth="3" strokeLinecap="round" />
          <path d="M40 16 C40 42 40 66 40 90"
            stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M40 32 C30 37 18 34 12 30"
            stroke="rgba(255,255,255,0.20)" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M40 32 C50 37 62 34 68 30"
            stroke="rgba(255,255,255,0.20)" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M40 52 C28 57 15 52 10 47"
            stroke="rgba(255,255,255,0.14)" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M40 52 C52 57 65 52 70 47"
            stroke="rgba(255,255,255,0.14)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
      )}
      {/* <span style={{
        fontSize: 11, fontWeight: 800,
        color: colorCode ? dark : '#94A3B8',
        fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.04em',
        transition: 'color 0.5s ease', textAlign: 'center',
      }}>
        {level || 'No Level'}
      </span> */}
    </div>
  );
}

export function LeafBadge({ level, score, colorCode }) {
  const fallbackConfig = {
    'Brown Leaf': { bg: '#F5F0E8', color: '#78350F', border: '#E7D5BD', dot: '#92400E' },
    'Orange Leaf': { bg: '#FEF3C7', color: '#9A3412', border: '#FED7AA', dot: '#EA580C' },
    'Yellow Leaf': { bg: '#FEF9C3', color: '#92400E', border: '#FDE68A', dot: '#D97706' },
    'Green Leaf': { bg: '#D6F5E3', color: '#145C28', border: '#A8EFC0', dot: '#22A84B' },
  };
  let c;
  if (colorCode) {
    // Derive badge colors from the colorCode
    c = { bg: `${colorCode}18`, color: darkenHex(colorCode, 0.35), border: `${colorCode}44`, dot: colorCode };
  } else {
    c = fallbackConfig[level] || fallbackConfig['Brown Leaf'];
  }
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap', fontFamily: 'Montserrat,sans-serif'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {level}
      {score !== undefined && <span style={{ opacity: 0.6 }}>· {score}%</span>}
    </span>
  );
}
