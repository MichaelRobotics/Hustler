"use client";

import React, { useState } from 'react';

export const SeasonalStoreSimple: React.FC = () => {
  const [testImage, setTestImage] = useState<string | null>(null);

  const handleTestImage = () => {
    const testImageUrl = 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#grad)"/>
        <text x="960" y="540" font-family="Arial" font-size="48" fill="white" text-anchor="middle">AI Generated Background</text>
      </svg>
    `);
    setTestImage(testImageUrl);
    console.log('🧪 Test image set:', testImageUrl);
  };

  return (
    <div 
      className="min-h-screen font-inter antialiased relative overflow-hidden"
      style={testImage ? {
        backgroundImage: `url(${testImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Test Controls */}
      <div className="absolute top-4 left-4 z-50 p-4 bg-black/80 text-white rounded-lg">
        <h2 className="text-lg font-bold mb-4">🎨 AI Image Test</h2>
        <button
          onClick={handleTestImage}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Generate Test Background
        </button>
        {testImage && (
          <div className="mt-4">
            <p className="text-sm text-green-400 mb-2">✓ Background loaded successfully!</p>
            <img 
              src={testImage} 
              alt="Test" 
              className="w-32 h-20 object-cover rounded border"
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen text-white text-center p-8">
        <h1 className="text-6xl font-bold mb-8 drop-shadow-lg">
          AI Seasonal Store
        </h1>
        <p className="text-2xl mb-8 drop-shadow-md">
          Test Background Display
        </p>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md">
          <p className="text-lg">
            This is a test of the AI-generated background system. 
            Click the button above to generate a test background image.
          </p>
        </div>
      </div>
    </div>
  );
};

