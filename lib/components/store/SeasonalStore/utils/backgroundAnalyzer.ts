import { useState, useEffect } from 'react';

// Background Image Brightness Analyzer
// Analyzes background images to determine if text should be black or white

export interface BackgroundAnalysis {
  isDark: boolean;
  brightness: number;
  saturation: number;
  recommendedTextColor: 'black' | 'white';
}

export const analyzeBackgroundBrightness = async (imageUrl: string): Promise<BackgroundAnalysis> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({
            isDark: true,
            brightness: 0,
            saturation: 0,
            recommendedTextColor: 'white'
          });
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalBrightness = 0;
        let totalSaturation = 0;
        let pixelCount = 0;
        
        // Sample every 10th pixel for performance
        for (let i = 0; i < data.length; i += 40) { // 4 bytes per pixel, sample every 10th
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness (0-255)
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          totalBrightness += brightness;
          
          // Calculate saturation
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          totalSaturation += saturation;
          
          pixelCount++;
        }
        
        const avgBrightness = totalBrightness / pixelCount;
        const avgSaturation = totalSaturation / pixelCount;
        
        // Determine if background is dark
        // Consider both brightness and saturation
        const isDark = avgBrightness < 128 || (avgBrightness < 150 && avgSaturation > 0.3);
        
        resolve({
          isDark,
          brightness: avgBrightness,
          saturation: avgSaturation,
          recommendedTextColor: isDark ? 'white' : 'black'
        });
        
      } catch (error) {
        console.warn('Background analysis failed:', error);
        resolve({
          isDark: true,
          brightness: 0,
          saturation: 0,
          recommendedTextColor: 'white'
        });
      }
    };
    
    img.onerror = () => {
      resolve({
        isDark: true,
        brightness: 0,
        saturation: 0,
        recommendedTextColor: 'white'
      });
    };
    
    img.src = imageUrl;
  });
};

export const useBackgroundAnalysis = (backgroundUrl: string | null) => {
  const [analysis, setAnalysis] = useState<BackgroundAnalysis>({
    isDark: true,
    brightness: 0,
    saturation: 0,
    recommendedTextColor: 'white'
  });
  
  useEffect(() => {
    if (!backgroundUrl) {
      setAnalysis({
        isDark: true,
        brightness: 0,
        saturation: 0,
        recommendedTextColor: 'white'
      });
      return;
    }
    
    analyzeBackgroundBrightness(backgroundUrl).then(setAnalysis);
  }, [backgroundUrl]);
  
  return analysis;
};
