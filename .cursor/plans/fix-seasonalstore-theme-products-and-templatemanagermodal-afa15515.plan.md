<!-- afa15515-f0c2-40cb-90da-a4825afbbc5d 1013fe54-9169-4ec2-8ad9-efc2ddbb5a9f -->
# Fix default_theme_data Structure and Remove Theme Creation

## Overview

Update the origin template service to store complete theme data in `default_theme_data` instead of creating themes in the "themes" table. Templates should use theme data directly from `default_theme_data` without referencing the themes table.

## Implementation Plan

### 1. Update default_theme_data Structure in Origin Template Creation

**File to modify:** `lib/services/origin-template-service.ts`

**Changes:**

- In `createOriginTemplateFromProduct`:
- Remove or make optional the call to `createCompanyTheme` (don't create theme in themes table)
- Generate theme styles directly from banner image (or use Black Friday fallback)
- Include complete theme data in `defaultThemeData`:
- `name`: Use `companyTitle` (from `productResult.company.title`)
- `card`: From banner analysis or Black Friday fallback
- `text`: From banner analysis or Black Friday fallback
- `welcomeColor`: From banner analysis or Black Friday fallback
- `accent`: From banner analysis or Black Friday fallback
- `ringColor`: Same as accent
- `mainHeader`: From banner analysis or Black Friday fallback
- `subHeader`/`aiMessage`: From banner analysis or Black Friday fallback
- `emojiTip`: From banner analysis or Black Friday fallback
- `themePrompt`: Generated from banner or default
- `placeholderImage`: Refined product placeholder or default
- Update text styles to use proper colors from `welcomeColor`
- Update `promoButton.buttonClass` to use theme `accent` instead of hardcoded 'bg-indigo-500'

**Implementation:**

- Call `generateThemeStylesFromBannerImage` directly (or use Black Friday fallback)
- Build complete theme object with all fields
- Store in `defaultThemeData` with structure matching what templates expect

### 2. Update default_theme_data in Origin Template Updates

**File to modify:** `lib/services/origin-template-service.ts`

**Changes:**

- In `updateOriginTemplateFromProduct`:
- Remove call to `createCompanyTheme` when banner changes
- Instead, regenerate theme styles from new banner image
- Update `defaultThemeData` with new theme data (name, card, text, welcomeColor, accent, etc.)
- Preserve existing `defaultThemeData` fields that aren't changing

**Implementation:**

- Generate new theme styles if banner changed
- Merge new theme data into existing `defaultThemeData`
- Update origin template with merged data

### 3. Update Template Creation to Use default_theme_data Directly

**File to modify:** `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts`

**Changes:**

- In auto-creation logic (around line 1187-1350):
- Remove logic that fetches company theme from themes table
- Use theme data directly from `originTemplate.defaultThemeData`
- Extract theme fields from `defaultThemeData`:
- `name`: `originData.name` or `originData.themeName`
- `card`: `originData.card`
- `text`: `originData.text`
- `welcomeColor`: `originData.welcomeColor`
- `accent`: `originData.accent`
- `ringColor`: `originData.ringColor`
- `mainHeader`: `originData.mainHeader`
- `subHeader`/`aiMessage`: `originData.subHeader` or `originData.aiMessage`
- `emojiTip`: `originData.emojiTip`
- `themePrompt`: `originData.themePrompt`
- `placeholderImage`: `originData.placeholderImage`
- Use these values for `themeSnapshot` and `currentTheme` in template creation
- Apply theme styles to Market Stall products using theme data from `defaultThemeData`

**Implementation:**

- Extract theme data from `originData` (which is `defaultThemeData`)
- Use extracted theme data for all theme-related fields
- Don't query themes table for company theme

### 4. Update "Create new Shop" Button Logic

**File to m

### To-dos

- [x] Create generateThemeStylesFromBannerImage function in origin-template-service.ts that analyzes banner image directly with Gemini Flash to generate theme styles
- [x] Update createCompanyTheme to use banner image analysis directly instead of themePrompt, and use companyTitle parameter with Black Friday fallback
- [x] Update createOriginTemplateFromProduct to extract company.title and pass it to createCompanyTheme along with banner URL
- [x] Update useThemeApplication to preserve banner background when switching to/from company theme, while allowing other styles to change