# UserChat Backend Integration Guide

## Overview

The UserChat components have been refactored to support backend integration while maintaining backward compatibility with mock data for development.

## Architecture

### Components Structure

```
UserChat/
├── Backend Components (Production)
│   ├── UserChatBackend.tsx          # Main backend chat component
│   ├── UserChatBackendPage.tsx      # Full-page backend chat
│   └── UserChatBackendContainer.tsx # Embeddable backend chat
├── Mock Components (Development)
│   ├── UserChat.tsx                 # Mock chat component
│   ├── UserChatPage.tsx             # Mock full-page chat
│   └── UserChatContainer.tsx        # Mock embeddable chat
├── Services
│   └── userChatService.ts           # Backend API service
├── Hooks
│   └── useUserChat.ts               # Backend-ready hook
├── Config
│   └── userChatConfig.ts            # Configuration management
└── Types & Documentation
```

## Backend Components

### 1. UserChatBackend

The main backend-ready chat component that replaces the mock version.

```tsx
import { UserChatBackend } from '@/lib/components/userChat';

<UserChatBackend
  funnelId="funnel-123"
  conversationId="conv-456" // Optional
  userId="user-789" // Optional
  onMessageSent={(message, convId) => {
    console.log('Message sent:', message, 'to conversation:', convId);
  }}
  onError={(error) => {
    console.error('Chat error:', error);
  }}
/>
```

**Features:**
- Real-time API communication
- Error handling and loading states
- Conversation persistence
- User tracking
- Message callbacks

### 2. UserChatBackendPage

Full-page chat interface with backend integration.

```tsx
import { UserChatBackendPage } from '@/lib/components/userChat';

<UserChatBackendPage
  funnelId="funnel-123"
  conversationId="conv-456"
  userId="user-789"
  onMessageSent={handleMessage}
  onError={handleError}
/>
```

### 3. UserChatBackendContainer

Embeddable chat container with backend integration.

```tsx
import { UserChatBackendContainer } from '@/lib/components/userChat';

<UserChatBackendContainer
  funnelId="funnel-123"
  height="600px"
  className="mt-8"
  onMessageSent={handleMessage}
  onError={handleError}
/>
```

## Backend Service

### UserChatService

The service layer handles all backend communication.

```tsx
import { userChatService } from '@/lib/components/userChat';

// Start a new conversation
const conversation = await userChatService.startConversation('funnel-123', 'user-456');

// Send a message
const response = await userChatService.sendMessage('conv-789', 'Hello!');

// Get conversation state
const state = await userChatService.getConversation('conv-789');
```

**API Endpoints:**
- `POST /api/conversations` - Start new conversation
- `GET /api/conversations/:id` - Get conversation state
- `POST /api/conversations/:id/messages` - Send message
- `GET /api/funnels/:id` - Get funnel data
- `GET /api/users/:id/conversations` - Get user conversations
- `DELETE /api/conversations/:id` - Delete conversation

## Custom Hook

### useUserChat

A comprehensive hook for managing chat state and backend communication.

```tsx
import { useUserChat } from '@/lib/components/userChat';

const {
  messages,
  options,
  currentBlockId,
  isComplete,
  isLoading,
  isSending,
  error,
  sendMessage,
  selectOption,
  startConversation,
  resetConversation
} = useUserChat({
  funnelId: 'funnel-123',
  conversationId: 'conv-456',
  userId: 'user-789',
  onMessageSent: (message, convId) => {
    // Handle message sent
  },
  onError: (error) => {
    // Handle errors
  }
});
```

## Configuration

### UserChatConfig

Centralized configuration for backend integration.

```tsx
import { 
  setUserChatConfig, 
  getUserChatConfig 
} from '@/lib/components/userChat';

// Configure the service
setUserChatConfig({
  apiBaseUrl: 'https://api.yourapp.com/api',
  apiKey: 'your-api-key',
  timeout: 30000,
  retryAttempts: 3,
  enableLogging: true,
  enableAnalytics: true
});

// Get current configuration
const config = getUserChatConfig();
```

**Environment Variables:**
```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourapp.com/api
NEXT_PUBLIC_API_KEY=your-api-key
NEXT_PUBLIC_DEFAULT_FUNNEL_ID=funnel-123
```

## Migration Guide

### From Mock to Backend

1. **Replace Components:**
   ```tsx
   // Before (Mock)
   import { UserChat } from '@/lib/components/userChat';
   
   // After (Backend)
   import { UserChatBackend } from '@/lib/components/userChat';
   ```

2. **Update Props:**
   ```tsx
   // Before (Mock)
   <UserChat funnelFlow={mockFunnelFlow} />
   
   // After (Backend)
   <UserChatBackend funnelId="funnel-123" />
   ```

3. **Add Error Handling:**
   ```tsx
   <UserChatBackend
     funnelId="funnel-123"
     onError={(error) => {
       // Handle API errors
       console.error('Chat error:', error);
     }}
   />
   ```

## Backend API Requirements

### Required Endpoints

Your backend must implement these endpoints:

#### 1. Start Conversation
```http
POST /api/conversations
Content-Type: application/json

{
  "funnelId": "funnel-123",
  "userId": "user-456",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "id": "conv-789",
  "funnelId": "funnel-123",
  "currentBlockId": "welcome_1",
  "messages": [],
  "options": [],
  "isComplete": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Send Message
```http
POST /api/conversations/:id/messages
Content-Type: application/json

{
  "message": "Hello!",
  "optionId": "opt-123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "message": {
    "id": "msg-456",
    "type": "bot",
    "text": "Hi there! How can I help you?",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "conversationId": "conv-789"
  },
  "options": [
    {
      "id": "opt-1",
      "text": "I need help",
      "nextBlockId": "help_1"
    }
  ],
  "currentBlockId": "help_1",
  "conversationId": "conv-789",
  "isComplete": false
}
```

#### 3. Get Funnel
```http
GET /api/funnels/:id
```

**Response:**
```json
{
  "id": "funnel-123",
  "name": "Business Growth Funnel",
  "description": "A funnel for business growth",
  "startBlockId": "welcome_1",
  "blocks": {
    "welcome_1": {
      "id": "welcome_1",
      "message": "Welcome! How can I help?",
      "options": [
        {
          "id": "opt-1",
          "text": "I need help",
          "nextBlockId": "help_1"
        }
      ]
    }
  },
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

The backend components include comprehensive error handling:

### Error Types
- **Network Errors**: Connection failures, timeouts
- **API Errors**: HTTP status codes, validation errors
- **Data Errors**: Invalid responses, missing data
- **State Errors**: Conversation not found, invalid funnel

### Error Recovery
- Automatic retries for network errors
- Graceful fallbacks for missing data
- User-friendly error messages
- Retry buttons for failed operations

## Testing

### Development Mode
Use mock components for development and testing:

```tsx
import { UserChat, mockFunnelFlow } from '@/lib/components/userChat';

// Development/testing
<UserChat funnelFlow={mockFunnelFlow} />
```

### Production Mode
Use backend components for production:

```tsx
import { UserChatBackend } from '@/lib/components/userChat';

// Production
<UserChatBackend funnelId="funnel-123" />
```

## Performance Considerations

### Optimization Features
- **Lazy Loading**: Components load only when needed
- **Message Caching**: Previous messages cached locally
- **Optimistic Updates**: UI updates before API confirmation
- **Error Boundaries**: Isolated error handling
- **Memory Management**: Proper cleanup and garbage collection

### Best Practices
- Use conversation IDs for persistence
- Implement proper loading states
- Handle network failures gracefully
- Monitor API performance
- Cache funnel data when possible

## Security

### Authentication
- API key authentication
- User session management
- Conversation ownership validation
- Rate limiting protection

### Data Protection
- Message encryption in transit
- Sensitive data filtering
- GDPR compliance
- Audit logging

## Monitoring

### Analytics
- Message tracking
- Conversation completion rates
- Error monitoring
- Performance metrics

### Logging
- API request/response logging
- Error logging
- User interaction tracking
- Performance monitoring
