# Experience Components

## Overview
The Experience components handle the view selection and routing between admin and customer perspectives for the funnel experience.

## Components

### 1. ExperienceView
Main component that handles view selection and routing.

**Features:**
- View selection between admin and customer perspectives
- Maintains existing logic from the original Experience page
- Handles customer message tracking
- Clean separation of concerns

**Props:**
```typescript
interface ExperienceViewProps {
  userName: string;                    // User's name for personalization
  accessLevel: 'admin' | 'customer';  // User's access level
  experienceId: string;               // Experience identifier
}
```

### 2. ViewSelectionPanel
Beautiful selection panel for choosing between admin and customer views.

**Features:**
- Modern, responsive design
- Clear visual distinction between views
- Access level indication
- Smooth transitions and animations
- Mobile-friendly layout

**Props:**
```typescript
interface ViewSelectionPanelProps {
  userName: string;                    // User's name for greeting
  accessLevel: 'admin' | 'customer';  // User's access level
  onViewSelected: (view: 'admin' | 'customer') => void; // Callback for view selection
}
```

## Usage

### In Experience Page
```tsx
// app/experiences/[experienceId]/page.tsx
import { ExperienceView } from "@/lib/components/experiences";

export default async function ExperiencePage({ params }) {
  // ... existing logic ...
  
  if (accessLevel === 'admin' || accessLevel === 'customer') {
    return (
      <ExperienceView
        userName={user.name || 'User'}
        accessLevel={accessLevel}
        experienceId={experienceId}
      />
    );
  }
  
  // ... rest of component
}
```

## Flow

1. **User Access**: User accesses the experience page
2. **View Selection**: ViewSelectionPanel is shown with admin/customer options
3. **View Routing**: Based on selection:
   - **Admin View**: Shows AdminPanel with full dashboard
   - **Customer View**: Shows CustomerView with clean chat interface
4. **Message Tracking**: Customer messages are logged and can be sent to backend

## Integration Points

### Customer View Integration
- Uses `CustomerView` from `@/lib/components/userChat`
- Handles message tracking and analytics
- Provides clean, focused chat experience
- Maintains conversation state

### Admin View Integration
- Uses existing `AdminPanel` component
- No changes to existing admin functionality
- Maintains all current features and logic

## Styling

The components use:
- **Tailwind CSS** for styling
- **Dark theme** with gradient backgrounds
- **Violet/Green color scheme** for admin/customer distinction
- **Responsive design** for all screen sizes
- **Smooth animations** and transitions

## Testing

### Admin View Testing
1. Select "Admin View" from the selection panel
2. Verify AdminPanel loads with all features
3. Test funnel builder, analytics, live chat, etc.

### Customer View Testing
1. Select "Customer View" from the selection panel
2. Verify clean chat interface loads
3. Test conversation flow with mock data
4. Test custom text input and invalid input handling
5. Verify message tracking in console

## Future Enhancements

- **Persistent view selection** (remember user's choice)
- **URL-based routing** for direct access to specific views
- **Real-time updates** between admin and customer views
- **Advanced analytics** for customer interactions
- **Custom branding** for different experiences
