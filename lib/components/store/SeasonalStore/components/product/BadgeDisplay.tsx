'use client';

import React from 'react';
import type { Product } from './types';

interface BadgeDisplayProps {
  badge: 'new' | '5star' | 'bestseller' | null;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badge }) => {
  if (!badge) return null;

  return (
    <div 
      className="absolute top-0 left-0 z-30 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* Ribbon that extends beyond left and right borders */}
      <div 
        className={`absolute font-bold text-[10px] shadow-lg ${
          badge === 'new' 
            ? 'bg-green-500' 
            : badge === '5star'
            ? 'bg-yellow-600'
            : badge === 'bestseller'
            ? 'bg-orange-500'
            : ''
        }`}
        style={{
          width: '150%',
          height: '28px',
          left: '-65%',
          top: '15px',
          transform: 'rotate(-45deg)',
          transformOrigin: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}
      />
      {/* Text container - clipped to stay within card boundaries, centered at midpoint of shard intersections */}
      <div 
        className="absolute top-0 left-0 w-full h-full"
        style={{
          overflow: 'hidden',
        }}
      >
        {/* Shard center is at 10% of card width (midpoint between entry and exit) */}
        <div 
          className={`absolute flex items-center justify-center font-bold text-[10px] ${
            badge === 'new' 
              ? 'text-white' 
              : badge === '5star'
              ? 'text-white'
              : badge === 'bestseller'
              ? 'text-white'
              : ''
          }`}
          style={{
            top: '15px',
            left: '10%',
            transform: 'translateX(-50%) rotate(-45deg)',
            transformOrigin: 'center center',
            height: '28px',
            whiteSpace: 'nowrap',
          }}
        >
          {badge === 'new' ? 'New' : badge === '5star' ? '5 ⭐' : 'BestSeller'}
        </div>
      </div>
    </div>
  );
};



