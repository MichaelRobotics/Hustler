# User Creation Flow Analysis

## Overview
This document analyzes how user records are created when new users enter the app, and how the chat system (`useChat` hooks) and user management actions work together.

## Key Findings

### 1. There is no `useChat` hook - Instead there are:
- **`useFunnelPreviewChat`** (`lib/hooks/useFunnelPreviewChat.ts`) - Handles preview chat logic for funnel flows
- **`useWhopWebSocket`** (`lib/hooks/useWhopWebSocket.ts`) - Handles real-time WebSocket communication
- These are used together in `UserChat.tsx` component

### 2. User Record Creation Flow

User records can be created through **three different entry points**:

#### Entry Point 1: Direct App Access (Primary Flow)
**Location:** `app/experiences/[experienceId]/page.tsx` → `app/api/user/context/route.ts` → `lib/context/user-context.ts`

**Flow:**
1. User loads experience page → `ExperiencePage` component mounts
2. `fetchUserContext()` is called on mount (line 113)
3. API call to `/api/user/context?experienceId=...`
4. API route (`app/api/user/context/route.ts`):
   - Verifies user token with Whop SDK
   - Checks access to experience
   - Calls `getUserContext()` from `user-context.ts`
5. `getUserContext()` → `createUserContext()`:
   - Finds or creates experience record
   - **Checks if user exists** (lines 206-221 in `user-context.ts`)
   - **If user doesn't exist:**
     - Fetches user data from Whop API (`whopSdk.users.getUser()`)
     - Determines access level via `whopSdk.access.checkIfUserHasAccessToExperience()`
     - **Creates user record** (lines 299-310):
       ```typescript
       [newUser] = await db.insert(users).values({
         whopUserId: whopUser.id,
         experienceId: experience.id,
         email: "",
         name: whopUser.name || whopUser.username || "Unknown User",
         avatar: whopUser.profilePicture?.sourceUrl || null,
         credits: initialCredits, // 2 for admin (fresh install), 0 otherwise
         accessLevel: initialAccessLevel,
       })
       ```
     - **For customer users:** Creates conversation automatically (lines 315-322)
     - **For admin users:** Triggers product sync in background (lines 350-373)

#### Entry Point 2: Webhook User Join Event
**Location:** `lib/actions/user-join-actions.ts` → `handleUserJoinEvent()`

**Flow:**
1. Whop webhook fires when user joins/gets membership
2. `handleUserJoinEvent()` is called (line 230)
3. Finds experience by `page_id` (company ID)
4. **Checks if user exists** (lines 277-282)
5. **If user doesn't exist:**
   - Fetches user from Whop API
   - Determines access level
   - **Creates user record** (lines 312-323) - same pattern as Entry Point 1
   - Creates conversation and sends transition DM
   - Updates conversation to WELCOME stage

#### Entry Point 3: Conversation Binding
**Location:** `lib/actions/user-management-actions.ts` → `findOrCreateUserForConversation()`

**Flow:**
1. Called when a conversation needs to be bound to a user
2. **Checks if user exists** (lines 21-26)
3. **If user doesn't exist:**
   - Fetches user from Whop API
   - Determines access level
   - **Creates user record** (lines 62-73) - same pattern as other entry points

### 3. User Creation Pattern (Consistent Across All Entry Points)

All three entry points follow the **same pattern**:

1. **Check for existing user:**
   ```typescript
   const existingUser = await db.query.users.findFirst({
     where: and(
       eq(users.whopUserId, whopUserId),
       eq(users.experienceId, experienceId)
     ),
   });
   ```

2. **If not found, fetch from Whop API:**
   ```typescript
   const whopUser = await whopSdk.users.getUser({ userId: whopUserId });
   ```

3. **Determine access level:**
   ```typescript
   const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
     userId: whopUserId,
     experienceId: whopExperienceId,
   });
   const accessLevel = accessResult.accessLevel || "no_access";
   ```

4. **Create user record:**
   ```typescript
   const [newUser] = await db.insert(users).values({
     whopUserId: whopUser.id,
     experienceId: experience.id,
     email: "",
     name: whopUser.name || whopUser.username || "Unknown User",
     avatar: whopUser.profilePicture?.sourceUrl || null,
     credits: initialCredits, // 0 for customers, 2 for admin (fresh install only)
     accessLevel: accessLevel,
   }).returning();
   ```

### 4. Key Differences Between Entry Points

| Entry Point | Credits Logic | Conversation Creation | Product Sync |
|------------|---------------|----------------------|--------------|
| **Direct App Access** (`user-context.ts`) | 2 for admin (fresh install), 0 otherwise | Only for customers | Only for admins (background) |
| **Webhook Join** (`user-join-actions.ts`) | Always 0 | Always (with DM) | No |
| **Conversation Binding** (`user-management-actions.ts`) | Always 0 | No | No |

### 5. Database Schema

User records are stored with:
- **Unique constraint:** `(whopUserId, experienceId)` - one user per experience
- **Foreign key:** `experienceId` → `experiences.id` (cascade delete)
- **Indexes:** On `whopUserId`, `experienceId`, `accessLevel`, and composite indexes

### 6. Chat System Integration

The chat system (`UserChat.tsx`) uses:
- **`useFunnelPreviewChat`** - Manages conversation flow, message history, block navigation
- **`useWhopWebSocket`** - Real-time message delivery via WebSocket
- Both hooks work together to provide the chat experience

When a user enters the app:
1. User record is created (if new) via `user-context.ts`
2. Conversation is created (if customer) via `createConversationForNewCustomer()` in `user-context.ts`
3. Chat component loads conversation and connects to WebSocket
4. Messages are synced in real-time

## Summary

**User records are created when:**
1. ✅ User first loads the experience page (most common)
2. ✅ User joins via webhook (membership event)
3. ✅ Conversation needs user binding (fallback)

**All three paths use the same pattern:**
- Check for existing user by `(whopUserId, experienceId)`
- Fetch user data from Whop API if not found
- Determine access level from Whop API
- Create user record with consistent fields
- Handle post-creation logic (conversation, product sync, etc.)

**The primary entry point is `lib/context/user-context.ts`** which is called via `/api/user/context` when users load the experience page.









