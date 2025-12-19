/**
 * Get theme-specific placeholder background URL
 * Returns the placeholder image URL for the given theme/season
 */
export function getThemePlaceholderUrl(themeName: string): string {
  const defaultPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
  
  // Map theme names to their placeholder URLs
  const themePlaceholders: Record<string, string> = {
    'Cyber Sale': 'https://img-v2-prod.whop.com/Hyt2HKOnK0RRv7Y3AKEKx4D6q2pgaS6zIJ0O4nXz9IE/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/9bc22c82-ac07-4aa8-8a80-3609b273a384.png',
    'Spring Renewal': 'https://img-v2-prod.whop.com/rSJXS5NKttt8u2117kcOOwxIS6i46EjvNolcNoHEr0U/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/27a182d3-b2fb-4b67-9675-3361e7dd6820.png',
    'Holiday Cheer': 'https://img-v2-prod.whop.com/NZ7GNGGID4Xa4x8v6MggFBmA1OvefQKzR51uNiE4ZF8/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/ac7a903a-f73f-4c15-a3b8-62dcf5337742.png',
    'Fall': 'https://img-v2-prod.whop.com/aqN_MUYyIWK1YPCflECQlExGsDTd_rftFEEh4zp59vI/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/3a3e7c27-e3aa-43fb-8bbd-d18ef28f7e33.png',
    'Spooky Night': 'https://img-v2-prod.whop.com/aqN_MUYyIWK1YPCflECQlExGsDTd_rftFEEh4zp59vI/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/3a3e7c27-e3aa-43fb-8bbd-d18ef28f7e33.png',
    'Summer': 'https://img-v2-prod.whop.com/43qiVSNwFVt0p1Yl0FwS76ArpS_MaMTP0vN5fVz3svA/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/96ffbe3b-f279-4850-9ae3-5aa471201ea4.png',
    'Winter': 'https://img-v2-prod.whop.com/Ni_KZbrHHlNz2gw5zWinFI1_s4Q7mZ92vVANhQCu9eQ/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/db5bf662-2cdf-461d-b55c-7d20e77c6662.png',
    'Winter Frost': 'https://img-v2-prod.whop.com/Ni_KZbrHHlNz2gw5zWinFI1_s4Q7mZ92vVANhQCu9eQ/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/db5bf662-2cdf-461d-b55c-7d20e77c6662.png',
    'Autumn': 'https://img-v2-prod.whop.com/zx2JzitsjsKHimZ-sTR6BLdvR7Ecn41Hzy1JPOUt7-c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-11-04/6911df86-f29f-4e0f-ace6-43e20f9a3820.png',
    'Autumn Harvest': 'https://img-v2-prod.whop.com/zx2JzitsjsKHimZ-sTR6BLdvR7Ecn41Hzy1JPOUt7-c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-11-04/6911df86-f29f-4e0f-ace6-43e20f9a3820.png',
    'Black Friday': 'https://img-v2-prod.whop.com/LpAWtPhmyrvfSLDlQbkLwzdL4wwZI_9R4RJtSjIukeQ/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-11-04/edbb3d96-0248-4ecf-8345-921c100a064d.png',
  };
  
  return themePlaceholders[themeName] || defaultPlaceholder;
}

/**
 * Get background style object for SeasonalStore
 * Returns CSS style object with background image or placeholder
 */
export function getBackgroundStyle(
  backgroundAttachmentUrl: string | null | undefined,
  currentSeason: string,
  legacyTheme: any
): Record<string, string | number> {
  // Use WHOP attachment URL if available
  if (backgroundAttachmentUrl) {
    return {
      backgroundImage: `url(${backgroundAttachmentUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'scroll',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      width: '100%',
      zIndex: -1,
      transition: 'background-image 0.5s ease-in-out, opacity 0.3s ease-in-out',
      opacity: 1
    };
  }

  // Use theme's custom placeholder if available
  const placeholderUrl = (legacyTheme as any)?.placeholderImage || getThemePlaceholderUrl(currentSeason);
  const placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';

  return {
    backgroundImage: `url(${placeholderUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'scroll',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100vh',
    width: '100%',
    zIndex: -1,
    transition: 'background-image 0.5s ease-in-out, opacity 0.3s ease-in-out',
    opacity: 1,
    filter: placeholderFilter
  };
}

