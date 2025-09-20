"use client";
import React from 'react';
import { Sparkles, ArrowRight, Star } from 'lucide-react';

interface AnimatedGoldButtonProps {
  href: string;
  text: string;
  icon?: 'sparkles' | 'arrowRight' | 'star';
  onClick?: () => void;
  className?: string;
}

const AnimatedGoldButton: React.FC<AnimatedGoldButtonProps> = ({ 
  href,
  text, 
  icon = 'sparkles', 
  onClick,
  className = ''
}) => {
  
  const getIcon = () => {
    switch (icon) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'arrowRight':
        return <ArrowRight className="w-5 h-5" />;
      case 'star':
        return <Star className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center px-6 py-3 text-lg font-bold text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-full shadow-lg hover:shadow-xl active:scale-95 overflow-hidden group ${className}`}
    >
      {/* Animated background overlay */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
      
      {/* Shimmer effect */}
      <span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
      
      {/* Content */}
      <span className="relative flex items-center space-x-2 z-10">
        {getIcon()}
        <span>{text}</span>
      </span>
      
      {/* Glow effect */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
    </a>
  );
};

export default AnimatedGoldButton;
