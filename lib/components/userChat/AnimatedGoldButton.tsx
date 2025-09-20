"use client";

import React from "react";
import { ExternalLink, ArrowRight, Sparkles } from "lucide-react";

interface AnimatedGoldButtonProps {
  href: string;
  text: string;
  icon?: "external" | "arrow" | "sparkles";
  onClick?: () => void;
}

/**
 * Animated Gold Button Component for [LINK] placeholders
 * 
 * Features:
 * - Animated gold gradient background
 * - Pulsing animation to draw attention
 * - Icon + two-word lead magnet text
 * - Smooth hover effects
 * - Mobile-optimized touch interactions
 */
const AnimatedGoldButton: React.FC<AnimatedGoldButtonProps> = ({
  href,
  text,
  icon = "external",
  onClick
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Call custom onClick if provided
    if (onClick) {
      onClick();
    } else {
      // Only open href if no custom onClick handler is provided
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const getIcon = () => {
    switch (icon) {
      case "arrow":
        return <ArrowRight size={16} className="text-white" />;
      case "sparkles":
        return <Sparkles size={16} className="text-white" />;
      case "external":
      default:
        return <ExternalLink size={16} className="text-white" />;
    }
  };

  return (
    <button
      onClick={handleClick}
      className="group relative inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation shadow-lg hover:shadow-xl"
      style={{
        background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
        backgroundSize: "200% 200%",
        animation: "goldenPulse 2s ease-in-out infinite",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Animated background overlay */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
        style={{
          background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
          backgroundSize: "200% 200%",
          animation: "goldenPulse 1.5s ease-in-out infinite",
        }}
      />
      
      {/* Content */}
      <div className="relative flex items-center gap-2">
        {getIcon()}
        <span className="whitespace-nowrap">{text}</span>
      </div>
      
      {/* CSS Animation */}
      <style jsx>{`
        @keyframes goldenPulse {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </button>
  );
};

export default AnimatedGoldButton;
