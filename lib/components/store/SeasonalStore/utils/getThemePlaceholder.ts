/**
 * Get theme-specific placeholder background URL
 * Returns the placeholder image URL for the given theme/season
 */
export function getThemePlaceholderUrl(themeName: string): string {
  const defaultPlaceholder = 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
  
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
  };
  
  return themePlaceholders[themeName] || defaultPlaceholder;
}

