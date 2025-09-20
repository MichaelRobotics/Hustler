"use client";
import React from 'react';

interface GeneratingLinkProps {
  className?: string;
}

const GeneratingLink: React.FC<GeneratingLinkProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center space-x-1 text-amber-600 font-medium ${className}`}>
      <span>Generating Link</span>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default GeneratingLink;
