# Whop API Data Available

## Overview
This document details what data is available from each Whop API call used in the user creation flow.

---

## 1. `whopSdk.verifyUserToken(headersList)`

**Purpose:** Verifies the user's authentication token from Whop iframe headers

**Returns:**
```typescript
{
  userId: string  // The Whop user ID (e.g., "usr_123456")
}
```

**Usage in code:**
```typescript
// app/api/user/context/route.ts (line 27)
const { userId } = await whopSdk.verifyUserToken(headersList);
```

**Available Data:**
- ✅ `userId` - The unique Whop user identifier

**Notes:**
- This is the first step - extracts the authenticated user's ID from the iframe headers
- Used to identify which user is making the request
- No other user data is available from this call

---

## 2. `whopSdk.users.getUser({ userId })`

**Purpose:** Fetches the full user profile from Whop API

**Returns:**
```typescript
{
  id: string,                    // User ID (e.g., "usr_123456")
  name?: string,                  // User's display name
  username?: string,              // User's username (fallback if name not available)
  profilePicture?: {              // Profile picture object
    sourceUrl?: string            // URL to the profile picture
  },
  // Additional properties may be available but not used in code:
  // bio?: string,
  // created_at?: string,
  // etc.
}
```

**Usage in code:**
```typescript
// lib/context/user-context.ts (line 249)
const whopUser = await whopSdk.users.getUser({ userId: whopUserId });

// Properties used:
whopUser.id                           // → whopUserId in database
whopUser.name || whopUser.username     // → name in database
whopUser.profilePicture?.sourceUrl     // → avatar in database
```

**Available Data:**
- ✅ `id` - User ID (used as `whopUserId` in database)
- ✅ `name` - Display name (fallback to `username` if not available)
- ✅ `username` - Username (used as fallback for name)
- ✅ `profilePicture.sourceUrl` - Profile picture URL (optional)

**Not Available:**
- ❌ `email` - Email is not available in public profile (stored as empty string `""`)
- ❌ `credits` - App-specific field, not from Whop
- ❌ `accessLevel` - Determined separately via access check

**Code Example:**
```typescript
// lib/context/user-context.ts (lines 302-309)
[newUser] = await db.insert(users).values({
    whopUserId: whopUser.id,                                    // ✅ From API
    experienceId: experience.id,                               // From local DB
    email: "",                                                   // ❌ Not available
    name: whopUser.name || whopUser.username || "Unknown User", // ✅ From API
    avatar: whopUser.profilePicture?.sourceUrl || null,         // ✅ From API
    credits: initialCredits,                                     // Calculated locally
    accessLevel: initialAccessLevel,                             // From access check
})
```

---

## 3. `whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId })`

**Purpose:** Checks if user has access to the experience and determines their access level

**Returns:**
```typescript
{
  hasAccess: boolean,              // Whether user has access to the experience
  accessLevel: "admin" | "customer" | "no_access"  // User's access level
}
```

**Usage in code:**
```typescript
// lib/context/user-context.ts (line 266)
const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
    userId: whopUserId,
    experienceId: whopExperienceId,
});

// Properties used:
accessResult.hasAccess    // → Used for authorization checks
accessResult.accessLevel  // → Stored as accessLevel in database
```

**Available Data:**
- ✅ `hasAccess` - Boolean indicating if user can access the experience
- ✅ `accessLevel` - One of:
  - `"admin"` - Full administrative access
  - `"customer"` - Regular customer access
  - `"no_access"` - No access (fallback)

**Code Example:**
```typescript
// app/api/user/context/route.ts (lines 39-42)
const experienceAccess = await whopSdk.access.checkIfUserHasAccessToExperience({
    userId: userId,
    experienceId: experienceId,
});

if (!experienceAccess.hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
}

// accessLevel is then used:
accessLevel: experienceAccess.accessLevel  // "admin" | "customer" | "no_access"
```

---

## Complete Data Flow Summary

```
User enters app
    ↓
1. whopSdk.verifyUserToken(headersList)
   Returns: { userId: "usr_123456" }
    ↓
2. whopSdk.users.getUser({ userId: "usr_123456" })
   Returns: {
     id: "usr_123456",
     name: "John Doe",              // or username if name not available
     username: "johndoe",
     profilePicture: {
       sourceUrl: "https://..."
     }
   }
    ↓
3. whopSdk.access.checkIfUserHasAccessToExperience({ userId, experienceId })
   Returns: {
     hasAccess: true,
     accessLevel: "admin" | "customer" | "no_access"
   }
    ↓
4. Create user record in database with:
   - whopUserId: from whopUser.id
   - name: from whopUser.name || whopUser.username
   - avatar: from whopUser.profilePicture?.sourceUrl
   - accessLevel: from accessResult.accessLevel
   - email: "" (not available from API)
   - credits: calculated locally (0 or 2)
   - experienceId: from local database
```

---

## Data Not Available from Whop API

These fields are **not** provided by Whop API and are handled locally:

- ❌ **Email** - Not available in public profile (stored as empty string)
- ❌ **Credits** - App-specific field, calculated locally:
  - `2` for admin users on fresh install
  - `0` for all other cases
- ❌ **Experience ID** - Stored in local database, linked via `whopCompanyId`
- ❌ **Messages count** - App-specific tracking field
- ❌ **Subscription** - Managed separately via webhooks
- ❌ **Membership** - Managed separately via webhooks

---

## Key Takeaways

1. **User ID** comes from `verifyUserToken()` - this is the entry point
2. **User profile data** (name, avatar) comes from `users.getUser()`
3. **Access level** comes from `access.checkIfUserHasAccessToExperience()`
4. **Email is NOT available** - always stored as empty string
5. **Credits are app-specific** - calculated locally, not from Whop
6. All three calls are needed to create a complete user record





