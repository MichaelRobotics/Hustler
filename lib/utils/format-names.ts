/**
 * Utility functions for formatting stage and block names to be more user-friendly
 */

/**
 * Format stage name to be more user-friendly
 * Removes underscores and capitalizes words
 */
export function formatStageName(stageName: string): string {
  // Special case mappings for better user experience
  const specialMappings: Record<string, string> = {
    'VALUE_DELIVERY': 'Gift Delivery',
    'TRANSITION': 'DM Notif',
    'SEND_DM': 'Send DM'
  };
  
  if (specialMappings[stageName]) {
    return specialMappings[stageName];
  }
  
  return stageName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format block ID to be more user-friendly
 * Removes underscores and capitalizes words
 */
export function formatBlockName(blockId: string): string {
  return blockId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format any name to be more user-friendly
 * Removes underscores and capitalizes words
 */
export function formatName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
