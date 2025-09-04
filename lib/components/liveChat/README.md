# Live Chat Components - Backend Integration Ready

## Overview
The Live Chat system is designed to work seamlessly with a backend API. All components are prepared for real-time communication and backend integration.

## Backend Integration Points

### 1. API Endpoints Required
```
GET    /api/live-chat/conversations     - Fetch conversations with filters
POST   /api/live-chat/messages          - Send new message
PATCH  /api/live-chat/conversations     - Update conversation status
GET    /api/live-chat/conversations/:id/messages - Fetch messages for conversation
```

### 2. Real-time Updates
- **WebSocket Support**: Components are ready for WebSocket integration
- **Auto-refresh**: Built-in polling mechanism for conversation updates
- **Auto-closing**: Conversations automatically close after inactivity

### 3. Data Flow
```
Backend → API Calls → useLiveChat Hook → Components → UI Updates
```

## Key Features

### Auto-Management
- **Auto-close**: Conversations close after `autoCloseAt` timestamp
- **Auto-archive**: Closed conversations are archived after time period
- **Real-time sync**: Messages and status updates in real-time

### State Management
- **Loading states**: `isLoading` for API calls
- **Error handling**: `error` state for failed operations
- **Pagination**: `hasMore` for infinite scroll support

### Message Handling
- **Agent messages**: Type `'bot'` (appears on left)
- **User messages**: Type `'user'` (appears on right)
- **System messages**: Type `'system'` (centered notifications)

## Backend Requirements

### Conversation Lifecycle
1. **Created**: When user starts interaction with funnel
2. **Active**: While user is engaged
3. **Auto-closed**: After inactivity period
4. **Archived**: After being closed for extended time
5. **Deleted**: After archival period (backend cleanup)

### Data Structure
```typescript
interface LiveChatConversation {
  id: string;
  userId: string;
  user: LiveChatUser;
  funnelId: string;
  funnelName: string;
  status: 'open' | 'closed';
  startedAt: Date;
  lastMessageAt: Date;
  lastMessage: string;
  messageCount: number;
  messages: LiveChatMessage[];
  // Backend-specific fields
  autoCloseAt?: Date;     // When to auto-close
  isArchived?: boolean;   // Archive status
  createdAt: Date;        // Creation timestamp
  updatedAt: Date;        // Last update timestamp
}
```

## Integration Steps

### 1. Replace Mock Data
- Update `LiveChatPage.tsx` to use `useLiveChat` hook
- Remove mock data and implement API calls

### 2. Add Real-time Updates
- Implement WebSocket connection
- Add message broadcasting
- Handle conversation status updates

### 3. Add Error Handling
- Implement retry logic for failed API calls
- Add user-friendly error messages
- Handle network connectivity issues

### 4. Add Loading States
- Show loading indicators during API calls
- Implement optimistic updates for better UX
- Add skeleton loading for conversation list

## Current Implementation
- ✅ Mock data with backend-ready fields
- ✅ Async handlers prepared for API integration
- ✅ Auto-closing simulation
- ✅ State management structure
- ✅ Type definitions for all API interactions
- ✅ Error handling framework
- ✅ Loading state management

## Next Steps
1. Implement actual API endpoints
2. Replace mock data with real API calls
3. Add WebSocket integration for real-time updates
4. Implement proper error handling and retry logic
5. Add loading states and optimistic updates
