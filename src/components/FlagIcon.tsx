import React from 'react';
import { Language } from '../utils/i18n';

interface FlagIconProps {
  code: Language;
  className?: string;
}

/**
 * Pixel-perfect SVG Flags for Egyptian Arabic, UK English, and German.
 * Using SVG guarantees genuine flags are rendered on all devices and OSs
 * without relying on system emoji fonts that may fallback to two-letter codes (EG/GB/DE).
 */
export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = 'w-5 h-3.5' }) => {
  if (code === 'ar') {
    // Flag of Egypt: Red, White (with Golden Eagle), Black
    return (
      <svg
        className={`inline-block shrink-0 rounded-xs shadow-2xs border border-slate-300/80 dark:border-slate-600/80 ${className}`}
        viewBox="0 0 600 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="600" height="133.33" fill="#CE1126" />
        <rect y="133.33" width="600" height="133.34" fill="#FFFFFF" />
        <rect y="266.67" width="600" height="133.33" fill="#000000" />
        {/* Eagle of Saladin representation */}
        <g transform="translate(250, 145) scale(1)">
          <path
            d="M50 8 C42 16 34 30 22 40 C14 47 10 60 12 74 C16 84 26 94 40 98 C46 100 54 100 60 98 C74 94 84 84 88 74 C90 60 86 47 78 40 C66 30 58 16 50 8 Z"
            fill="#C09300"
          />
          <path
            d="M40 45 L60 45 L56 78 L44 78 Z"
            fill="#FFFFFF"
            stroke="#A37800"
            strokeWidth="2"
          />
          <path
            d="M47 50 L53 50 L51 72 L49 72 Z"
            fill="#C09300"
          />
        </g>
      </svg>
    );
  }

  if (code === 'en') {
    // Flag of the United Kingdom (Union Jack)
    return (
      <svg
        className={`inline-block shrink-0 rounded-xs shadow-2xs border border-slate-300/80 dark:border-slate-600/80 ${className}`}
        viewBox="0 0 60 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <clipPath id="uk-flag-clip">
          <rect width="60" height="30" rx="1" />
        </clipPath>
        <g clipPath="url(#uk-flag-clip)">
          {/* Blue background */}
          <rect width="60" height="30" fill="#012169" />
          {/* White diagonals (St Andrew's & St Patrick's base) */}
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#FFFFFF" strokeWidth="6" />
          {/* Red diagonals (St Patrick's cross) */}
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="2" />
          {/* White cross (St George base) */}
          <path d="M30 0 V30 M0 15 H60" stroke="#FFFFFF" strokeWidth="10" />
          {/* Red cross (St George's cross) */}
          <path d="M30 0 V30 M0 15 H60" stroke="#C8102E" strokeWidth="6" />
        </g>
      </svg>
    );
  }

  // Flag of Germany: Black, Red, Gold
  return (
    <svg
      className={`inline-block shrink-0 rounded-xs shadow-2xs border border-slate-300/80 dark:border-slate-600/80 ${className}`}
      viewBox="0 0 5 3"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="5" height="1" fill="#000000" />
      <rect y="1" width="5" height="1" fill="#DD0000" />
      <rect y="2" width="5" height="1" fill="#FFCE00" />
    </svg>
  );
};
