'use client';

const fontColorPattern = /<font\b([^>]*)>(.*?)<\/font>/gi;
const styleAttrPattern = /style\s*=\s*(['"])(.*?)\1/gi;

/**
 * Normalizes HTML strings by decoding repeatedly-encoded entities (e.g. &amp;amp;nbsp; -> &nbsp;).
 * This keeps legitimate HTML tags intact while preventing visible entity artifacts in editors.
 */
export const normalizeHtmlContent = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Quick check - if no double-encoded patterns, return as-is
  if (!value.includes('&amp;')) {
    return value;
  }

  let normalized = value;
  let prevLength = -1;
  
  // Keep decoding until no more changes (handles deeply nested encoding)
  // Pattern matches &amp; followed by a valid entity name
  const doubleEncodedPattern = /&amp;(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);/g;
  
  while (normalized.length !== prevLength && normalized.includes('&amp;')) {
    prevLength = normalized.length;
    normalized = normalized.replace(doubleEncodedPattern, '&$1;');
  }

  return normalized;
};

/**
 * Decodes HTML entities to plain text for display in textarea inputs.
 * Converts entities like &nbsp; to spaces, &amp; to &, etc.
 */
export const decodeHtmlEntitiesForTextarea = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  // Create a temporary element to decode HTML entities
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = value;
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Removes inline color tags (e.g. <font color="#fff">) and color styles so that
 * card styles can control text color consistently.
 */
export const stripInlineColorTags = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  let sanitized = value.replace(fontColorPattern, (match, attrs, inner) => {
    if (/color\s*=/.test(attrs)) {
      return inner;
    }
    return match;
  });

  sanitized = sanitized.replace(styleAttrPattern, (match, quote, styles) => {
    const filtered = styles
      .split(';')
      .map((part: string) => part.trim())
      .filter(Boolean)
      .filter((rule: string) => {
        const lower = rule.toLowerCase();
        return !(lower.startsWith('color:') || lower.startsWith('color '));
      });

    if (filtered.length === 0) {
      return '';
    }

    return `style=${quote}${filtered.join('; ')}${quote}`;
  });

  return sanitized;
};

/**
 * Truncates HTML content to approximately 2 lines (120 characters by default).
 * Strips HTML tags for length calculation and truncates at word/sentence boundaries.
 */
export const truncateHTMLToTwoLines = (html: string, maxLength: number = 120): string => {
  if (!html) return html;
  
  // Strip HTML tags to get plain text length
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  if (plainText.length <= maxLength) {
    return html;
  }
  
  // If content is too long, truncate at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  // Prefer sentence boundary, then word boundary
  const sentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  const truncateAt = sentenceEnd > maxLength - 30 && sentenceEnd > 0 
    ? sentenceEnd + 1 
    : (lastSpace > maxLength - 20 && lastSpace > 0 ? lastSpace : maxLength);
  
  const truncatedText = plainText.substring(0, truncateAt).trim();
  
  // If original had HTML, preserve the first opening tag structure
  if (html.includes('<')) {
    // Extract first tag if it exists
    const firstTagMatch = html.match(/^<[^>]+>/);
    if (firstTagMatch) {
      const tagName = firstTagMatch[0].match(/<(\w+)/)?.[1];
      if (tagName) {
        return `${firstTagMatch[0]}${truncatedText}</${tagName}>`;
      }
    }
  }
  
  return truncatedText;
};


