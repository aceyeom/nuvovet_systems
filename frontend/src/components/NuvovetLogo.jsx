import React from 'react';

export function NuvovetLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield / molecular structure hybrid */}
      <path
        d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Central hexagonal node */}
      <path
        d="M16 10l5.2 3v6L16 22l-5.2-3v-6L16 10z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner molecular nodes */}
      <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      <circle cx="21.2" cy="13" r="1.5" fill="currentColor" />
      <circle cx="21.2" cy="19" r="1.5" fill="currentColor" />
      <circle cx="16" cy="22" r="1.5" fill="currentColor" />
      <circle cx="10.8" cy="19" r="1.5" fill="currentColor" />
      <circle cx="10.8" cy="13" r="1.5" fill="currentColor" />
      {/* Center node */}
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      {/* Radial connections to center */}
      <line x1="16" y1="12" x2="16" y2="14" stroke="currentColor" strokeWidth="1" />
      <line x1="16" y1="18" x2="16" y2="20" stroke="currentColor" strokeWidth="1" />
      <line x1="19.4" y1="14" x2="17.7" y2="15" stroke="currentColor" strokeWidth="1" />
      <line x1="12.6" y1="18" x2="14.3" y2="17" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function NuvovetWordmark({ className = '' }) {
  return (
    <span className={`text-sm font-bold tracking-tight text-slate-900 ${className}`}>
      NUVOVET
    </span>
  );
}

export function NuvovetBrand({ size = 28, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <NuvovetLogo size={size} />
      <NuvovetWordmark />
    </div>
  );
}
