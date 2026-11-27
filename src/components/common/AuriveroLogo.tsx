import React from 'react';

interface AuriveroLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-10 h-10 rounded-xl',
};

/**
 * Aurivero emblem blending Latin heritage (Aurum "gold" + Verus "true apex")
 * with Indian market breakout geometry (rising trendline & dual-bar horizon).
 */
export const AuriveroLogo: React.FC<AuriveroLogoProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`${SIZE_MAP[size]} ${className} overflow-hidden shadow-sm shrink-0 flex items-center justify-center`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aurivero-crest-bg" x1="0" y1="36" x2="36" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* Institutional Cobalt Crest */}
        <rect width="36" height="36" rx="10" fill="url(#aurivero-crest-bg)" />

        {/* Subtle Dawn Halo Arc (Aurum / Morning Bell) */}
        <path
          d="M8.5 17.5C10.8 11.2 16.2 7.5 22.8 8.4"
          stroke="#FCD34D"
          strokeOpacity="0.28"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Classical Roman "A" Apex (Verus — Truth & Structural Precision) */}
        <path
          d="M9.5 26.5L17.5 9.5L25.5 26.5"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Rupee-inspired Bullish Base Horizon */}
        <path
          d="M13.8 24.4H21.2"
          stroke="#34D399"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Aurum Gold Breakout Crossbar & Trendline */}
        <path
          d="M13 20.8L16.8 17.4L19.6 19.6L26.4 11.8"
          stroke="#FBBF24"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Aurum Sun-Orb at Breakout Peak */}
        <circle cx="26.4" cy="11.8" r="2.2" fill="#FBBF24" />
      </svg>
    </div>
  );
};
