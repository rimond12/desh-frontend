// src/components/shared/LeafLogo.js
export default function LeafLogo({ size = 40, animated = false }) {
  return (
    <svg
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * 1.25}
      className={animated ? 'leaf-float' : ''}
    >
      <defs>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#16520A" />
        </linearGradient>
        <filter id="leafGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Outer glow */}
      <path
        d="M40 5 C10 20 5 55 40 95 C75 55 70 20 40 5Z"
        fill="rgba(34,197,94,0.15)"
        filter="url(#leafGlow)"
      />
      {/* Main leaf */}
      <path
        d="M40 5 C10 20 5 55 40 95 C75 55 70 20 40 5Z"
        fill="url(#leafGrad)"
      />
      {/* Stem */}
      <line x1="40" y1="95" x2="40" y2="100" stroke="#16520A" strokeWidth="3" strokeLinecap="round" />
      {/* Vein */}
      <path
        d="M40 15 C40 40 40 65 40 88"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Side veins */}
      <path d="M40 30 C30 35 18 32 12 28" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M40 30 C50 35 62 32 68 28" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M40 50 C28 55 15 50 10 45" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M40 50 C52 55 65 50 70 45" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Leaf badge for scores
export function LeafBadge({ level, score }) {
  const config = {
    'Brown Leaf':  { from: '#97542A', to: '#6B3A1F', range: '20–39%' },
    'Orange Leaf': { from: '#E2670C', to: '#B5520A', range: '40–59%' },
    'Yellow Leaf': { from: '#F8A514', to: '#C57D0A', range: '60–79%' },
    'Green Leaf':  { from: '#16520A', to: '#22C55E', range: '80–100%' },
  };
  const c = config[level] || config['Brown Leaf'];
  return (
    <span
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-semibold"
    >
      <svg viewBox="0 0 20 25" width="10" height="12">
        <path d="M10 1 C3 5 2 14 10 23 C18 14 17 5 10 1Z" fill="rgba(255,255,255,0.7)" />
      </svg>
      {level}
      {score !== undefined && <span className="opacity-70">· {score}%</span>}
    </span>
  );
}
