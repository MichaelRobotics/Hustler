/**
 * Simple utility to detect URLs in text and make them clickable
 */

import React from 'react';

// URL regex pattern - matches http/https URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Converts text with URLs into React elements with clickable links
 * @param text - The text that may contain URLs
 * @returns Array of React elements (text and links)
 */
export function renderTextWithLinks(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  // Split text by URLs
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
        >
          {part}
        </a>
      );
    }
    
    // Regular text
    return part;
  });
}
