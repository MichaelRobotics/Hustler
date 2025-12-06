/**
 * Get button animation color based on theme accent class
 */
export function getButtonAnimColor(accentClass: string | undefined): string {
  if (!accentClass) return 'indigo';
  
  if (accentClass.includes('blue')) return 'blue';
  if (accentClass.includes('yellow')) return 'yellow';
  if (accentClass.includes('orange')) return 'orange';
  if (accentClass.includes('red')) return 'red';
  if (accentClass.includes('pink')) return 'pink';
  if (accentClass.includes('cyan')) return 'cyan';
  
  return 'indigo'; // Default fallback
}


