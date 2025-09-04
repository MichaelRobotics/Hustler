# UserChat Usage Guide

## Quick Start

### 1. Simple Demo Page
```tsx
import { UserChatDemo } from '@/lib/components/userChat';

// Use this for a simple demo page
<UserChatDemo />
```

### 2. Full Page Chat
```tsx
import { UserChatPage, mockFunnelFlow } from '@/lib/components/userChat';

<UserChatPage
  funnelFlow={mockFunnelFlow}
  conversationId="conv-123"
  onMessageSent={(message, convId) => {
    console.log('User sent:', message);
  }}
/>
```

### 3. Embedded Chat
```tsx
import { UserChatContainer, mockFunnelFlow } from '@/lib/components/userChat';

<UserChatContainer
  funnelFlow={mockFunnelFlow}
  height="600px"
  className="mt-8 shadow-lg"
/>
```

## Available Mock Funnels

### E-commerce Funnel (Default)
- Business growth focus
- SEO, marketing, sales
- Lead generation flow
- Email capture

### Coaching Funnel
- Personal development
- Career advancement
- Life coaching
- Confidence building

### SaaS Funnel
- User acquisition
- Retention strategies
- Growth hacking
- Product optimization

## Testing Features

### 1. Option Clicking
- Click any numbered option
- Follow the conversation flow
- Test different paths

### 2. Custom Text Input
- Type custom responses
- Test invalid input handling
- See escalation logic

### 3. Invalid Input Scenarios
- **First invalid input**: Friendly reminder
- **Second invalid input**: Escalation to creator
- **Valid input**: Resets counter and proceeds

## Example Conversations

### E-commerce Flow
```
Bot: "Hi there! What brings you here today?"
User: "I need help growing my business"
Bot: "What type of business are you running?"
User: "Online/E-commerce business"
Bot: "What's your biggest challenge?"
User: "Getting more website traffic"
Bot: "I can help with SEO strategies..."
```

### Personal Development Flow
```
Bot: "What would you like to work on today?"
User: "Building confidence and self-esteem"
Bot: "What's your biggest confidence challenge?"
User: "Speaking in public or presenting"
Bot: "I have a step-by-step system..."
```

## Integration Examples

### Landing Page Integration
```tsx
function LandingPage() {
  return (
    <div className="container mx-auto">
      <h1>Welcome to Our Service</h1>
      <p>Get personalized help from our AI assistant</p>
      
      <UserChatContainer
        funnelFlow={mockFunnelFlow}
        height="500px"
        onMessageSent={(message) => {
          // Track engagement
          analytics.track('chat_interaction', { message });
        }}
      />
    </div>
  );
}
```

### Product Page Integration
```tsx
function ProductPage() {
  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h2>Product Information</h2>
        {/* Product details */}
      </div>
      <div>
        <h3>Need Help? Chat with our AI</h3>
        <UserChatContainer
          funnelFlow={mockFunnelFlow}
          height="400px"
        />
      </div>
    </div>
  );
}
```

## Customization

### Custom Styling
```tsx
<UserChatContainer
  funnelFlow={mockFunnelFlow}
  className="border-2 border-blue-500 rounded-xl"
  height="700px"
/>
```

### Custom Message Handling
```tsx
const handleMessage = async (message: string, convId?: string) => {
  // Send to your backend
  await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId: convId })
  });
  
  // Track analytics
  analytics.track('user_message', { message, convId });
};
```

## Development Tips

1. **Use UserChatExample** for testing different funnels
2. **Use UserChatDemo** for simple standalone testing
3. **Check console logs** for message tracking
4. **Test invalid inputs** to see escalation logic
5. **Try different conversation paths** to test all flows

## Next Steps

1. Replace `mockFunnelFlow` with real funnel data from your database
2. Implement backend API endpoints for message handling
3. Add real-time updates with WebSocket integration
4. Customize styling to match your brand
5. Add analytics tracking for user engagement
