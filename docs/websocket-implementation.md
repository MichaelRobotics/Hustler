# WebSocket Implementation Documentation

## Overview

This document describes the real-time WebSocket implementation for the WHOP funnel builder app. The implementation provides real-time communication for live chat, funnel updates, and system notifications.

## Architecture

### Core Components

1. **WHOP WebSocket Manager** (`lib/websocket/whop-websocket.ts`)
   - Handles WebSocket connection management
   - Manages channel joining/leaving
   - Provides connection state monitoring
   - Implements auto-reconnection logic

2. **Real-Time Messaging** (`lib/websocket/messaging.ts`)
   - Live chat message broadcasting
   - Typing indicators
   - User presence tracking
   - Message delivery confirmation

3. **Real-Time Updates** (`lib/websocket/updates.ts`)
   - Funnel generation progress updates
   - Deployment notifications
   - Resource sync updates
   - Analytics updates
   - System notifications

4. **React Hook** (`lib/hooks/useWebSocket.ts`)
   - Easy integration with React components
   - Automatic connection management
   - Subscription handling
   - Error handling

## API Routes

### WebSocket Connection Management

- `POST /api/websocket/connect` - Initialize WebSocket connection
- `DELETE /api/websocket/disconnect` - Disconnect WebSocket
- `GET /api/websocket/status` - Get connection status

### Channel Management

- `POST /api/websocket/channels` - Join a channel
- `DELETE /api/websocket/channels` - Leave a channel
- `GET /api/websocket/channels` - Get joined channels

## Channel Types

### Company Channels
- `company:{companyId}` - Company-wide updates
- `funnel_updates:{companyId}` - Funnel-related updates
- `resource_updates:{companyId}` - Resource-related updates
- `analytics:{companyId}` - Analytics updates

### User Channels
- `user:{userId}` - User-specific updates
- `conversation:{conversationId}` - Conversation messages

### System Channels
- `system` - System-wide notifications

## Message Types

### Chat Messages
```typescript
interface ChatMessage {
  id: string;
  conversationId: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: any;
  userId?: string;
}
```

### Typing Indicators
```typescript
interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}
```

### Funnel Updates
```typescript
interface FunnelUpdate {
  type: 'generation_started' | 'generation_progress' | 'generation_completed' | 'generation_failed' | 'deployed' | 'undeployed';
  funnelId: string;
  funnelName: string;
  progress?: number;
  message?: string;
  timestamp: Date;
  userId: string;
  companyId: string;
}
```

## Usage Examples

### React Component Integration

```typescript
import { useWebSocket } from '../hooks/useWebSocket';

function LiveChatComponent() {
  const {
    isConnected,
    sendMessage,
    subscribeToConversation,
    subscribeToTyping
  } = useWebSocket({
    autoConnect: true,
    onConnectionChange: (connected) => {
      console.log('WebSocket connected:', connected);
    }
  });

  useEffect(() => {
    if (isConnected) {
      // Subscribe to conversation messages
      subscribeToConversation('conv-123', (message) => {
        console.log('New message:', message);
      });

      // Subscribe to typing indicators
      subscribeToTyping('conv-123', (typing) => {
        console.log('User typing:', typing);
      });
    }
  }, [isConnected, subscribeToConversation, subscribeToTyping]);

  const handleSendMessage = async (content: string) => {
    await sendMessage('conv-123', content, 'user');
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Chat UI */}
    </div>
  );
}
```

### Server-Side Integration

```typescript
import { realTimeUpdates } from '../websocket/updates';

// Send funnel generation update
await realTimeUpdates.sendFunnelGenerationUpdate(
  user,
  funnelId,
  funnelName,
  'generation_started',
  0,
  'Starting generation...'
);

// Send deployment notification
await realTimeUpdates.sendFunnelDeploymentUpdate(
  user,
  funnelId,
  funnelName,
  true
);
```

## Environment Configuration

### Required Environment Variables

```bash
# WHOP Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_app_id
WHOP_API_KEY=your_api_key
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id

# WebSocket Configuration (if using custom WebSocket server)
NEXT_PUBLIC_WHOP_WS_URL=wss://api.whop.com/ws
```

## Security

### Channel Access Control

- Users can only join channels for their own company
- Conversation channels require access to the specific conversation
- System channels are available to all authenticated users
- User-specific channels are restricted to the user themselves

### Message Validation

- All messages are validated before broadcasting
- User permissions are checked for each operation
- Company isolation is enforced at the channel level

## Error Handling

### Connection Errors

- Automatic reconnection with exponential backoff
- Connection state monitoring
- Error logging and reporting

### Message Errors

- Graceful degradation when WebSocket is unavailable
- Fallback to API calls for critical operations
- Error notifications to users

## Testing

### Unit Tests

```bash
# Run WebSocket tests
npm test lib/websocket/__tests__/websocket.test.ts
```

### Integration Tests

```bash
# Run WebSocket integration test script
node scripts/test-websocket.js
```

## Deployment

### Prerequisites

1. Set up WHOP API keys
2. Run database migrations
3. Configure environment variables
4. Test WebSocket connectivity

### Steps

1. **Database Setup**
   ```bash
   pnpm drizzle-kit push
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your WHOP credentials
   ```

3. **Test Implementation**
   ```bash
   node scripts/test-websocket.js
   ```

4. **Deploy**
   ```bash
   pnpm build
   pnpm start
   ```

## Monitoring

### Connection Monitoring

- Track connection status
- Monitor reconnection attempts
- Log connection errors

### Message Monitoring

- Track message delivery rates
- Monitor typing indicator frequency
- Log failed message deliveries

### Performance Monitoring

- WebSocket connection latency
- Message processing time
- Channel subscription counts

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WHOP API credentials
   - Verify network connectivity
   - Check firewall settings

2. **Messages Not Received**
   - Verify channel subscriptions
   - Check user permissions
   - Validate message format

3. **Typing Indicators Not Working**
   - Check typing indicator subscriptions
   - Verify user presence updates
   - Check channel permissions

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will provide detailed WebSocket connection and message logs.

## Future Enhancements

1. **Message Persistence**
   - Store WebSocket messages in database
   - Implement message history
   - Add message search functionality

2. **Advanced Presence**
   - User activity tracking
   - Online/offline status
   - Last seen timestamps

3. **File Sharing**
   - Real-time file uploads
   - Image sharing in chat
   - Document collaboration

4. **Voice/Video**
   - WebRTC integration
   - Voice messages
   - Video calls

## Support

For issues or questions regarding the WebSocket implementation:

1. Check the troubleshooting section
2. Review the error logs
3. Test with the provided test scripts
4. Contact the development team
