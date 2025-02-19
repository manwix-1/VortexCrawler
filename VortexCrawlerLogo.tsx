import React from 'react';

const VortexCrawlerLogo = () => {
  return (
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Vortex Spiral Base */}
      <path
        d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm0 36c-8.837 0-16-7.163-16-16S15.163 8 24 8s16 7.163 16 16-7.163 16-16 16z"
        fill="url(#vortex-gradient)"
      />
      
      {/* Spider/Crawler Element */}
      <path
        d="M24 16c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 12c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
        fill="#2563EB"
      />
      
      {/* Shield Element for Anti-Detection */}
      <path
        d="M24 14l-8 4v6c0 5.523 3.582 10 8 10s8-4.477 8-10v-6l-8-4z"
        fill="url(#shield-gradient)"
        opacity="0.6"
      />
      
      {/* Gradients Definition */}
      <defs>
        <linearGradient id="vortex-gradient" x1="4" y1="4" x2="44" y2="44">
          <stop offset="0%" stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#1E40AF"/>
        </linearGradient>
        
        <linearGradient id="shield-gradient" x1="16" y1="14" x2="32" y2="34">
          <stop offset="0%" stopColor="#60A5FA"/>
          <stop offset="100%" stopColor="#2563EB"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default VortexCrawlerLogo;
