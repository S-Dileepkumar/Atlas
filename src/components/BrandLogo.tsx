import React from 'react';

interface AtlasLogoMarkProps {
  className?: string;
  tone?: 'adaptive' | 'brand';
  framed?: boolean;
}

/**
 * Crisp vector reproduction of the VLSI Protocol Atlas geometric "A" mark
 * (off-white / theme-adaptive angled legs with teal/accent apex & crossbar nodes).
 */
export const AtlasLogoMark: React.FC<AtlasLogoMarkProps> = ({
  className = 'w-6 h-6',
  tone = 'adaptive',
  framed = false,
}) => {
  const legStroke = tone === 'brand' ? '#F1F0EA' : 'var(--text-primary)';
  const nodeFill = tone === 'brand' ? '#00A896' : 'var(--sem-control)';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {framed && <rect width="64" height="64" rx="14" fill="#1A1B1A" />}
      <path
        d="M17 50L32 14L47 50"
        stroke={legStroke}
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="22.4"
        y1="37"
        x2="41.6"
        y2="37"
        stroke={nodeFill}
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="14" r="4.6" fill={nodeFill} />
      <circle cx="22.4" cy="37" r="4" fill={nodeFill} />
      <circle cx="41.6" cy="37" r="4" fill={nodeFill} />
    </svg>
  );
};

interface BrandBannerLockupProps {
  className?: string;
}

/**
 * Official brand banner embedding the user-supplied raster brand asset cleanly
 * inside a framed matte #1A1B1A container so it remains crisp in both dark and light modes.
 */
export const BrandBannerLockup: React.FC<BrandBannerLockupProps> = ({
  className = '',
}) => {
  const src = `${import.meta.env.BASE_URL}assets/aistudio/image_79d2811e.png`;

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[#1A1B1A] px-3 py-2 shadow-sm overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt="VLSI Protocol Atlas — Open-source protocol and silicon IP hub"
        className="h-12 sm:h-14 w-auto object-contain select-none"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
