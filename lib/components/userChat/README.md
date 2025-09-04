# User Chat Components

## Overview
The UserChat components provide the customer-facing chat interface that works exactly like the funnel builder preview mode. These components allow customers to interact with deployed funnels through a clean, intuitive chat interface.

## Components

### 1. UserChat
The core chat component that handles the conversation logic.

**Features:**
- Real-time conversation with funnel bot
- Option clicking for guided flow
- Custom text input for user responses
- Invalid input handling with friendly responses
- Escalation to creator when needed
- Auto-scrolling and responsive design

**Props:**
```typescript
interface UserChatProps {
  funnelFlow: FunnelFlow;                    // The funnel flow to interact with
  conversationId?: string;                   // Optional conversation ID for tracking
  onMessageSent?: (message: string, conversationId?: string) => void; // Message callback
}
```

### 2. UserChatPage
Full-page chat interface for standalone chat pages.

**Features:**
- Full-screen chat experience
- Loading state
- Clean, distraction-free UI
- Responsive design

**Props:**
```typescript
interface UserChatPageProps {
  funnelFlow: FunnelFlow;                    // The funnel flow to interact with
  conversationId?: string;                   // Optional conversation ID for tracking
  onMessageSent?: (message: string, conversationId?: string) => void; // Message callback
  className?: string;                        // Additional CSS classes
}
```

### 3. UserChatContainer
Embeddable chat container for use in other pages.

**Features:**
- Flexible sizing
- Embeddable in any layout
- Customizable height
- Maintains all chat functionality

**Props:**
```typescript
interface UserChatContainerProps {
  funnelFlow: FunnelFlow;                    // The funnel flow to interact with
  conversationId?: string;                   // Optional conversation ID for tracking
  onMessageSent?: (message: string, conversationId?: string) => void; // Message callback
  className?: string;                        // Additional CSS classes
  height?: string;                           // Custom height (default: '500px')
}
```

## Usage Examples

### Full Page Chat
```tsx
import { UserChatPage } from '@/lib/components/userChat';

function ChatPage() {
  return (
    <UserChatPage
      funnelFlow={funnelData}
      conversationId="conv-123"
      onMessageSent={(message, convId) => {
        console.log('User sent:', message, 'to conversation:', convId);
      }}
    />
  );
}
```

### Embedded Chat
```tsx
import { UserChatContainer } from '@/lib/components/userChat';

function LandingPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Welcome to Our Service</h1>
      <UserChatContainer
        funnelFlow={funnelData}
        height="600px"
        className="mt-8"
        onMessageSent={(message) => {
          // Track user engagement
          analytics.track('chat_message', { message });
        }}
      />
    </div>
  );
}
```

### Direct Chat Component
```tsx
import { UserChat } from '@/lib/components/userChat';

function CustomLayout() {
  return (
    <div className="flex h-screen">
      <div className="w-1/2 p-4">
        <h2>Product Information</h2>
        {/* Product content */}
      </div>
      <div className="w-1/2">
        <UserChat
          funnelFlow={funnelData}
          onMessageSent={(message) => {
            // Handle message
          }}
        />
      </div>
    </div>
  );
}
```

## Integration with Funnel Builder

The UserChat components use the same `useFunnelPreviewChat` hook as the funnel builder preview, ensuring:

- **Identical behavior** - Same conversation logic and flow
- **Consistent responses** - Same AI responses and validation
- **Same features** - Option clicking, custom input, invalid input handling
- **Real-time updates** - Immediate reflection of funnel changes

## Styling

The components use Tailwind CSS classes and follow the app's design system:

- **Light/Dark mode** support
- **Responsive design** for all screen sizes
- **Consistent colors** with the main app theme
- **Smooth animations** and transitions
- **Accessibility** features built-in

## Backend Integration

The components are ready for backend integration:

- **Conversation tracking** via `conversationId` prop
- **Message callbacks** for analytics and logging
- **Flexible data flow** for real-time updates
- **Error handling** built into the chat logic

## Customization

All components accept `className` props for custom styling:

```tsx
<UserChatContainer
  funnelFlow={funnelData}
  className="border-2 border-blue-500 rounded-xl"
  height="700px"
/>
```

## Performance

- **Optimized rendering** with React hooks
- **Efficient re-renders** with proper dependency arrays
- **Memory management** with cleanup functions
- **Smooth scrolling** with ref-based auto-scroll
