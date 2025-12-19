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
 * Preserves all HTML tags, attributes (including styles), and nested structures.
 * Only truncates text content while maintaining the full HTML structure.
 */
export const truncateHTMLToTwoLines = (html: string, maxLength: number = 120): string => {
  if (!html) return html;
  
  // Use DOM manipulation for accurate HTML parsing and preservation
  if (typeof document === 'undefined') {
    // SSR fallback: simple regex-based truncation (less accurate but works)
  // Strip HTML tags to get plain text length
    const plainText = html.replace(/<[^>]+>/g, '');
    if (plainText.length <= maxLength) {
      return html;
    }
    // Calculate truncation point
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    const sentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    const truncateAt = sentenceEnd > maxLength - 30 && sentenceEnd > 0 
      ? sentenceEnd + 1 
      : (lastSpace > maxLength - 20 && lastSpace > 0 ? lastSpace : maxLength);
    // For SSR, try to preserve first tag structure (basic preservation)
    const firstTagMatch = html.match(/^<[^>]+>/);
    if (firstTagMatch) {
      const tagName = firstTagMatch[0].match(/<(\w+)/)?.[1];
      if (tagName) {
        return `${firstTagMatch[0]}${plainText.substring(0, truncateAt)}</${tagName}>`;
      }
    }
    return plainText.substring(0, truncateAt) + '...';
  }

  // Browser environment: use DOM manipulation to preserve structure
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  if (plainText.length <= maxLength) {
    return html;
  }
  
  // Calculate truncation point at word/sentence boundary
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
  
  const targetLength = truncateAt;
  
  // Function to truncate text nodes while preserving HTML structure
  const truncateNode = (node: Node, remainingLength: { value: number }): boolean => {
    if (remainingLength.value <= 0) {
      return false; // Stop processing
    }
    
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      
      if (text.length <= remainingLength.value) {
        remainingLength.value -= text.length;
        return true; // Continue processing
      } else {
        // Truncate this text node
        const truncatedText = text.substring(0, remainingLength.value);
        textNode.textContent = truncatedText;
        remainingLength.value = 0;
        return false; // Stop processing
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const children = Array.from(element.childNodes);
      
      // Process children in order
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const shouldContinue = truncateNode(child, remainingLength);
        
        if (!shouldContinue) {
          // Remove remaining children after truncation point (in reverse to avoid index issues)
          for (let j = children.length - 1; j > i; j--) {
            const childToRemove = element.childNodes[j];
            if (childToRemove) {
              element.removeChild(childToRemove);
            }
          }
          return false; // Stop processing
        }
      }
      
      return true; // All children processed, continue
    }
    
    return true; // Other node types, continue
  };
  
  // Clone the DOM to avoid modifying the original
  const clonedDiv = tempDiv.cloneNode(true) as HTMLElement;
  const remainingLength = { value: targetLength };
  
  // Truncate the cloned DOM
  const children = Array.from(clonedDiv.childNodes);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const shouldContinue = truncateNode(child, remainingLength);
    if (!shouldContinue) {
      // Remove remaining children after truncation point (in reverse to avoid index issues)
      for (let j = children.length - 1; j > i; j--) {
        const childToRemove = children[j];
        if (childToRemove && childToRemove.parentNode === clonedDiv) {
          clonedDiv.removeChild(childToRemove);
        }
      }
      break;
    }
  }
  
  return clonedDiv.innerHTML;
};

/**
 * Normalizes HTML tags created by document.execCommand to use consistent semantic tags.
 * Converts <b> to <strong>, <i> to <em>, and handles inline style-based formatting.
 * This ensures consistent rendering across different browsers and preview modes.
 */
export const normalizeExecCommandHtml = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // Use DOM parsing for accurate HTML manipulation
  if (typeof document === 'undefined') {
    // Fallback for SSR: use regex-based replacement (less accurate but works)
    let normalized = html;
    // Convert <font color="..."> to <span style="color: ...">
    normalized = normalized.replace(/<font\b([^>]*color\s*=\s*["']([^"']+)["'][^>]*)>(.*?)<\/font>/gi, (match, attrs, color, inner) => {
      return `<span style="color: ${color}">${inner}</span>`;
    });
    // Convert remaining <font> tags (without color) to <span>
    normalized = normalized.replace(/<font\b([^>]*)>(.*?)<\/font>/gi, '<span$1>$2</span>');
    // Convert <b> to <strong> (case insensitive)
    normalized = normalized.replace(/<b\b([^>]*)>(.*?)<\/b>/gi, '<strong$1>$2</strong>');
    // Convert <i> to <em> (case insensitive)
    normalized = normalized.replace(/<i\b([^>]*)>(.*?)<\/i>/gi, '<em$1>$2</em>');
    return normalized;
  }

  // Browser environment: use DOM manipulation for accurate parsing
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Function to recursively normalize nodes
  const normalizeNode = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      // Convert <font> tags to <span> with style attribute
      if (tagName === 'font') {
        const span = document.createElement('span');
        span.innerHTML = element.innerHTML;
        
        // Extract color from font tag
        const color = element.getAttribute('color');
        if (color) {
          span.setAttribute('style', `color: ${color}`);
        }
        
        // Copy other attributes
        Array.from(element.attributes).forEach(attr => {
          if (attr.name !== 'color') {
            if (attr.name === 'style') {
              // Merge with existing color style if present
              const existingStyle = span.getAttribute('style') || '';
              const mergedStyle = existingStyle 
                ? `${existingStyle}; ${attr.value}`
                : attr.value;
              span.setAttribute('style', mergedStyle);
            } else {
              span.setAttribute(attr.name, attr.value);
            }
          }
        });
        
        element.parentNode?.replaceChild(span, element);
        // Continue normalizing the replaced element's children
        normalizeNode(span);
        return;
      }
      
      // Convert <b> to <strong>
      if (tagName === 'b') {
        const strong = document.createElement('strong');
        strong.innerHTML = element.innerHTML;
        // Copy all attributes (including style with color)
        // The <b> tag itself doesn't need font-weight: bold since <strong> is already bold
        Array.from(element.attributes).forEach(attr => {
          if (attr.name === 'style') {
            const style = element.getAttribute('style') || '';
            // Parse style to check if it has color or other properties
            const styleObj: Record<string, string> = {};
            style.split(';').forEach(rule => {
              const [prop, value] = rule.split(':').map(s => s.trim());
              if (prop && value) {
                styleObj[prop.toLowerCase()] = value;
              }
            });
            // Keep style if it has color or other properties (not just font-weight)
            const hasColor = Boolean(styleObj['color']);
            const hasOtherStyles = Object.keys(styleObj).some(key => 
              key !== 'font-weight' && key !== 'color'
            );
            if (hasColor || hasOtherStyles) {
              // Rebuild style without font-weight: bold (since <strong> is already bold)
              const preservedStyles: string[] = [];
              if (hasColor) {
                preservedStyles.push(`color: ${styleObj['color']}`);
              }
              Object.keys(styleObj).forEach(key => {
                if (key !== 'font-weight' && key !== 'color') {
                  preservedStyles.push(`${key}: ${styleObj[key]}`);
                }
              });
              if (preservedStyles.length > 0) {
                strong.setAttribute('style', preservedStyles.join('; '));
              }
            }
          } else {
            strong.setAttribute(attr.name, attr.value);
          }
        });
        element.parentNode?.replaceChild(strong, element);
        return;
      }
      
      // Convert <i> to <em>
      if (tagName === 'i') {
        const em = document.createElement('em');
        em.innerHTML = element.innerHTML;
        // Copy all attributes (including style with color)
        // The <i> tag itself doesn't need font-style: italic since <em> is already italic
        Array.from(element.attributes).forEach(attr => {
          if (attr.name === 'style') {
            const style = element.getAttribute('style') || '';
            // Parse style to check if it has color or other properties
            const styleObj: Record<string, string> = {};
            style.split(';').forEach(rule => {
              const [prop, value] = rule.split(':').map(s => s.trim());
              if (prop && value) {
                styleObj[prop.toLowerCase()] = value;
              }
            });
            // Keep style if it has color or other properties (not just font-style)
            const hasColor = Boolean(styleObj['color']);
            const hasOtherStyles = Object.keys(styleObj).some(key => 
              key !== 'font-style' && key !== 'color'
            );
            if (hasColor || hasOtherStyles) {
              // Rebuild style without font-style: italic (since <em> is already italic)
              const preservedStyles: string[] = [];
              if (hasColor) {
                preservedStyles.push(`color: ${styleObj['color']}`);
              }
              Object.keys(styleObj).forEach(key => {
                if (key !== 'font-style' && key !== 'color') {
                  preservedStyles.push(`${key}: ${styleObj[key]}`);
                }
              });
              if (preservedStyles.length > 0) {
                em.setAttribute('style', preservedStyles.join('; '));
              }
            }
          } else {
            em.setAttribute(attr.name, attr.value);
          }
        });
        element.parentNode?.replaceChild(em, element);
        return;
      }
      
      // Handle inline styles for bold/italic
      const style = element.getAttribute('style');
      if (style) {
        const styleObj: Record<string, string> = {};
        style.split(';').forEach(rule => {
          const [prop, value] = rule.split(':').map(s => s.trim());
          if (prop && value) {
            styleObj[prop.toLowerCase()] = value;
          }
        });
        
        const hasFontWeightBold = styleObj['font-weight'] === 'bold';
        const hasFontStyleItalic = styleObj['font-style'] === 'italic';
        const hasColor = Boolean(styleObj['color']);
        const otherStyles = Object.keys(styleObj).filter(key => 
          key !== 'font-weight' && key !== 'font-style' && key !== 'color'
        );
        
        // If font-weight: bold (with or without color), convert to <strong>
        if (hasFontWeightBold) {
          const strong = document.createElement('strong');
          strong.innerHTML = element.innerHTML;
          
          // Preserve color and other styles in style attribute
          const preservedStyles: string[] = [];
          if (hasColor) {
            preservedStyles.push(`color: ${styleObj['color']}`);
          }
          otherStyles.forEach(key => {
            preservedStyles.push(`${key}: ${styleObj[key]}`);
          });
          
          if (preservedStyles.length > 0) {
            strong.setAttribute('style', preservedStyles.join('; '));
          }
          
          // Copy other attributes
          Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'style') {
              strong.setAttribute(attr.name, attr.value);
            }
          });
          element.parentNode?.replaceChild(strong, element);
          return;
        }
        
        // If font-style: italic (with or without color), convert to <em>
        if (hasFontStyleItalic) {
          const em = document.createElement('em');
          em.innerHTML = element.innerHTML;
          
          // Preserve color and other styles in style attribute
          const preservedStyles: string[] = [];
          if (hasColor) {
            preservedStyles.push(`color: ${styleObj['color']}`);
      }
          otherStyles.forEach(key => {
            preservedStyles.push(`${key}: ${styleObj[key]}`);
          });
          
          if (preservedStyles.length > 0) {
            em.setAttribute('style', preservedStyles.join('; '));
          }
          
          // Copy other attributes
          Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'style') {
              em.setAttribute(attr.name, attr.value);
            }
          });
          element.parentNode?.replaceChild(em, element);
          return;
        }
      }
      
      // Recursively normalize child nodes
      Array.from(element.childNodes).forEach(child => normalizeNode(child));
    }
  };

  // Normalize all nodes
  Array.from(tempDiv.childNodes).forEach(child => normalizeNode(child));

  return tempDiv.innerHTML;
};


