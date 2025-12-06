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

/**
 * Calculate relative luminance for contrast calculation (WCAG)
 */
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
const getContrastRatio = (color1: string, color2: string): number => {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Extract dominant colors from a background image with good contrast
 * Returns an array of hex color strings that have sufficient contrast with the background
 */
export const extractColorsFromImage = async (imageUrl: string, count: number = 8): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937', '#6366F1', '#EC4899', '#10B981', '#F59E0B']);
          return;
        }
        
        // Scale down for performance
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate average background color for contrast checking
        let totalR = 0, totalG = 0, totalB = 0, pixelCount = 0;
        for (let i = 0; i < data.length; i += 16) {
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
          pixelCount++;
        }
        const avgR = Math.round(totalR / pixelCount);
        const avgG = Math.round(totalG / pixelCount);
        const avgB = Math.round(totalB / pixelCount);
        const avgBackgroundHex = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`.toUpperCase();
        
        // Collect color frequencies
        const colorMap = new Map<string, number>();
        
        // Sample pixels (every 4th pixel for performance)
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Quantize colors to reduce noise (round to nearest 10)
          const qr = Math.round(r / 10) * 10;
          const qg = Math.round(g / 10) * 10;
          const qb = Math.round(b / 10) * 10;
          
          const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`.toUpperCase();
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
        
        // Sort by frequency and filter for contrast
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);
        
        // Filter colors with good contrast (WCAG AA minimum is 4.5:1, we'll use 3:1 for better variety)
        const minContrast = 3.0;
        const highContrastColors = sortedColors.filter(color => {
          const contrast = getContrastRatio(color, avgBackgroundHex);
          return contrast >= minContrast;
        });
        
        // If we don't have enough high-contrast colors, add complementary colors
        const colors: string[] = [];
        
        // Add high-contrast extracted colors
        colors.push(...highContrastColors.slice(0, Math.min(count - 2, highContrastColors.length)));
        
        // Always include white and black if they have good contrast
        const whiteContrast = getContrastRatio('#FFFFFF', avgBackgroundHex);
        const blackContrast = getContrastRatio('#000000', avgBackgroundHex);
        
        if (whiteContrast >= minContrast && !colors.includes('#FFFFFF')) {
          colors.push('#FFFFFF');
        }
        if (blackContrast >= minContrast && !colors.includes('#000000')) {
          colors.push('#000000');
        }
        
        // If background is dark, add light colors; if light, add dark colors
        const backgroundLum = getLuminance(avgR, avgG, avgB);
        const isDarkBackground = backgroundLum < 0.5;
        
        if (isDarkBackground) {
          // Add light, high-contrast colors
          const lightColors = ['#F3F4F6', '#E5E7EB', '#D1D5DB', '#FEF3C7', '#DBEAFE', '#D1FAE5'];
          for (const lightColor of lightColors) {
            if (colors.length >= count) break;
            if (getContrastRatio(lightColor, avgBackgroundHex) >= minContrast && !colors.includes(lightColor)) {
              colors.push(lightColor);
            }
          }
        } else {
          // Add dark, high-contrast colors
          const darkColors = ['#1F2937', '#111827', '#374151', '#4B5563', '#6B7280'];
          for (const darkColor of darkColors) {
            if (colors.length >= count) break;
            if (getContrastRatio(darkColor, avgBackgroundHex) >= minContrast && !colors.includes(darkColor)) {
              colors.push(darkColor);
            }
          }
        }
        
        // Fill remaining slots with vibrant colors that have contrast
        const vibrantColors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6'];
        for (const vibrantColor of vibrantColors) {
          if (colors.length >= count) break;
          if (getContrastRatio(vibrantColor, avgBackgroundHex) >= minContrast && !colors.includes(vibrantColor)) {
            colors.push(vibrantColor);
          }
        }
        
        // If still not enough, add any colors with at least 2:1 contrast
        if (colors.length < count) {
          for (const color of sortedColors) {
            if (colors.length >= count) break;
            if (getContrastRatio(color, avgBackgroundHex) >= 2.0 && !colors.includes(color)) {
              colors.push(color);
            }
          }
        }
        
        // Final fallback - ensure we have at least some colors
        if (colors.length === 0) {
          // If no colors have contrast, use white/black based on background
          if (isDarkBackground) {
            colors.push('#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB');
          } else {
            colors.push('#000000', '#1F2937', '#111827', '#374151');
          }
        }
        
        resolve(colors.slice(0, count));
        
      } catch (error) {
        console.warn('Color extraction failed:', error);
        resolve(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937', '#6366F1', '#EC4899', '#10B981', '#F59E0B']);
      }
    };
    
    img.onerror = () => {
      resolve(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937', '#6366F1', '#EC4899', '#10B981', '#F59E0B']);
    };
    
    img.src = imageUrl;
  });
};
