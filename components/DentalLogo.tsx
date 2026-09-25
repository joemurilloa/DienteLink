import React from 'react';

interface DentalLogoProps {
  size?: number | string;
  className?: string;
  variant?: 'blue' | 'white' | 'dark';
}

export const DentalLogo: React.FC<DentalLogoProps> = ({
  size = 24,
  className = '',
  variant = 'blue'
}) => {
  const isWhite = variant === 'white';
  const isDark = variant === 'dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DienteLink Logo"
    >
      <defs>
        <linearGradient id="dl-gradient-blue" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="dl-gradient-sparkle" x1="28" y1="6" x2="42" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#93C5FD" />
        </linearGradient>
      </defs>

      {/* Main Tooth Silhouette */}
      <path
        d="M24 6C16.8 6 11 11.2 11 17.5C11 22.8 13.5 27.2 15.8 33.2C17.4 37.4 19.5 42 21.2 42C22.6 42 23.3 39.8 23.8 36.5C24 35.2 24 33.8 24 32.5C24 33.8 24 35.2 24.2 36.5C24.7 39.8 25.4 42 26.8 42C28.5 42 30.6 37.4 32.2 33.2C34.5 27.2 37 22.8 37 17.5C37 11.2 31.2 6 24 6Z"
        fill={isWhite ? 'currentColor' : isDark ? '#0F172A' : 'url(#dl-gradient-blue)'}
      />

      {/* Inner Anatomical Curve / Dental Shine */}
      <path
        d="M17.5 14C19.2 11.5 21.5 10.5 24 10.5C26.5 10.5 28.8 11.5 30.5 14"
        stroke={isWhite ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.45)'}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Health Sparkle Accent */}
      <path
        d="M36 4L37.2 8.8L42 10L37.2 11.2L36 16L34.8 11.2L30 10L34.8 8.8L36 4Z"
        fill={isWhite ? 'currentColor' : 'url(#dl-gradient-sparkle)'}
        opacity={isWhite ? 0.9 : 1}
      />
    </svg>
  );
};

export default DentalLogo;
