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


