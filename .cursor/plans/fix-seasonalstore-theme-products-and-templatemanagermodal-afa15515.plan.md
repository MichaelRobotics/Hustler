<!-- afa15515-f0c2-40cb-90da-a4825afbbc5d 1013fe54-9169-4ec2-8ad9-efc2ddbb5a9f -->
# Company Theme Banner Analysis and Save Protection

## Overview

Update company theme generation to analyze banner images directly with Gemini Flash for instant style generation, use company.title as theme name, prevent company theme updates on save, and ensure theme switching preserves banner background while allowing other styles to change.

## Implementation Plan

### 1. Create Banner Image Direct Analysis Function

**File to modify:** `lib/services/origin-template-service.ts`

**Changes:**

- Create new function `generateThemeStylesFromBannerImage(bannerImageUrl: string)` that:
- Uses Gemini Flash (`gemini-2.5-flash`) to analyze the banner image directly
- Generates full theme data (accent, card, text, welcomeColor, mainHeader, aiMessage, emojiTip, colorPalette) from image analysis
- Returns theme data object similar to custom theme generation
- Uses same prompt structure as `generate-custom-theme/route.ts` but with image input instead of text prompt
- If banner image analysis fails or no banner exists, fallback to default theme styles (from default theme)

**Implementation:**

- Fetch banner image and convert to base64
- Use Gemini Flash with image input to generate theme styles
- Parse JSON response with theme data (accent, card, text, welcomeColor, etc.)
- Handle errors gracefully with default theme fallback

### 2. Update Company Theme Creation to Use Direct Banner Analysis

**File to modify:** `lib/services/origin-template-service.ts`

**Changes:**

- Modify `createCompanyTheme` function to:
- Accept `bannerImageUrl` parameter instead of just `themePrompt`
- Call `generateThemeStylesFromBannerImage` if banner exists
- If no banner, use default theme styles (from default theme constants)
- Use `companyTitle` parameter for theme name instead of hardcoded "Company Theme"
- Store theme with `season: 'Company'` to identify it as company theme

**Implementation:**

- Update function signature: `createCompanyTheme(experienceId: string, bannerImageUrl: string | null, companyTitle: string)`
- If `bannerImageUrl` exists, call `generateThemeStylesFromBannerImage(bannerImageUrl)`
- If no banner or analysis fails, extract default theme styles from default theme constants
- Use `companyTitle` for theme name
- Store card, text, welcomeColor fields in theme record (may need schema update)

### 3. Update Origin Template Creation to Pass Company Title

**File to modify:** `lib/services/origin-template-service.ts`

**Changes:**

- In `createOriginTemplateFromProduct`:
- Extract `companyTitle` from `productResult.company.title`
- Pass `companyTitle` to `createCompanyTheme` instead of hardcoded "Company Theme"
- Pass `companyBannerUrl` directly to `createCompanyTheme` instead of themePrompt

**Implementation:**

- Extract: `const companyTitle = productResult.company?.title || 'Company Theme'`
- Update call: `createCompanyTheme(experienceId, companyBannerUrl, companyTitle)`
- Remove themePrompt generation step (no longer needed for company theme)

### 4. Prevent Company Theme Updates on Save

**File to modify:** `lib/components/store/SeasonalStore/hooks/useTemplateSave.ts`

**Changes:**

- In `saveOrUpdateTemplate` function:
- Check if `currentSeason === 'Company'` before saving
- If company theme, skip theme update but still save template
- Log that company theme update was skipped

**Implementation:**

- Add check: `if (currentSeason === 'Company') { /* skip theme update */ }`
- Still allow template save/update to proceed
- Only skip the theme-related updates

### 5. Update Theme Schema to Store Card, Text, WelcomeColor

**File to modify:** `lib/supabase/schema.ts`

**Changes:**

- Add optional fields to `themes` table:
- `card: text("card")` - Tailwind CSS classes for product cards
- `text: text("text")` - Tailwind CSS classes for body text  
- `welcomeColor: text("welcome_color")` - Tailwind CSS classes for welcome/accent text

**Note:** May need to create migration if these fields don't exist

### 6. Preserve Banner Background on Theme Switch

**File to modify:** `lib/components/store/SeasonalStore/hooks/useThemeApplication.ts`

**Changes:**

- In theme switching logic:
- Check if `originTemplate?.companyBannerImageUrl` exists
- If banner exists and current theme is "Company", preserve banner as background
- For all other themes, allow background to change normally
- Ensure other styles (colors, card styles, text) can still change when switching themes

**Implementation:**

- Add condition: `if (currentSeason === 'Company' && originTemplate?.companyBannerImageUrl) { /* preserve banner */ }`
- Otherwise, use theme placeholder as normal
- Ensure product styles, text colors, etc. still update on theme switch

### 7. Update Theme Loading to Use Company Theme Styles

**File to modify:** `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts`

**Changes:**

- When loading company theme:
- Apply card, text, welcomeColor styles from theme record
- Ensure these styles are applied to products and text elements
- Use same logic as custom theme application

**Implementation:**

- Check if theme has `card`, `text`, `welcomeColor` fields
- Apply these to products via `applyThemeStylesToProducts`
- Apply to text styles via theme color application

## Key Technical Details

### Banner Image Analysis Flow

1. Fetch banner image from `companyBannerImageUrl`
2. Convert to base64
3. Send to Gemini Flash with image analysis prompt
4. Parse JSON response with theme styles (accent, card, text, welcomeColor, etc.)
5. Use directly for theme creation (no intermediate prompt step)

### Company Theme Identification

- Theme with `season: 'Company'` is the company theme
- Check `currentSeason === 'Company'` to identify company theme context

### Save Protection

- When `currentSeason === 'Company'`, skip theme update
- Still allow template save/update to proceed
- Log skip action for debugging

### Theme Switching Behavior

- If company theme with banner: preserve banner background
- All other styles (colors, cards, text) can change on theme switch
- If no banner: normal theme switching applies

## Files to Modify

1. `lib/services/origin-template-service.ts` - Banner analysis and company theme creation
2. `lib/components/store/SeasonalStore/hooks/useTemplateSave.ts` - Save protection
3. `lib/components/store/SeasonalStore/hooks/useThemeApplication.ts` - Background preservation
4. `lib/supabase/schema.ts` - Theme schema updates (if needed)
5. `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts` - Theme style application

## Testing Considerations

- Test banner image analysis with various banner images
- Test fallback to default theme when no banner exists
- Test company theme save protection (should skip theme update)
- Test theme switching preserves banner background for company theme
- Test theme switching allows other styles to change
- Verify company.title is used as theme name

### To-dos

- [ ] Extract product CRUD handlers to useProductHandlers hook
- [ ] Extract drag and drop handlers to useDragAndDrop hook
- [ ] Extract ResourceLibrary product management to useResourceLibraryProducts hook
- [ ] Extract template manager handlers to useTemplateManager hook
- [ ] Remove unnecessary wrapper functions
- [ ] Consolidate state restoration logic
- [ ] Create generateThemeStylesFromBannerImage function in origin-template-service.ts that analyzes banner image directly with Gemini Flash to generate theme styles
- [ ] Update createCompanyTheme to use banner image analysis directly instead of themePrompt, and use companyTitle parameter
- [ ] Update createOriginTemplateFromProduct to extract company.title and pass it to createCompanyTheme along with banner URL
- [ ] Add check in useTemplateSave to skip theme update when currentSeason === Company, but still allow template save
- [ ] Update useThemeApplication to preserve banner background when switching to/from company theme, while allowing other styles to change
- [ ] Add card, text, welcomeColor fields to themes schema if they do not exist
- [ ] Ensure company theme styles (card, text, welcomeColor) are applied when loading company theme