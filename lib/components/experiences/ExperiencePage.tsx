'use client';

import React, { useState } from 'react';
import AdminPanel from '@/lib/components/admin/AdminPanel';
import { CustomerView } from '@/lib/components/userChat';
import ViewSelectionPanel from './ViewSelectionPanel';

/**
 * --- Experience View Component ---
 * This component handles the view selection and routing between admin and customer views.
 * It uses the props passed from the server-side authentication.
 */

interface ExperienceViewProps {
  userName: string;
  accessLevel: 'admin' | 'customer';
  experienceId: string;
}

const ExperienceView: React.FC<ExperienceViewProps> = ({
  userName,
  accessLevel,
  experienceId
}) => {
  const [selectedView, setSelectedView] = useState<'admin' | 'customer' | null>(null);

  // Use props directly since authentication is handled server-side
  const currentUser = { name: userName, accessLevel };
  const currentAccessLevel = accessLevel;

  const handleViewSelected = (view: 'admin' | 'customer') => {
    setSelectedView(view);
  };

  const handleCustomerMessage = (message: string, conversationId?: string) => {
    // Handle customer messages - could send to analytics, backend, etc.
    console.log('Customer interaction:', {
      message,
      conversationId,
      userName: currentUser.name,
      experienceId,
      accessLevel: currentAccessLevel,
      timestamp: new Date().toISOString()
    });
  };

  // Authentication is handled server-side, so no loading/error states needed

  // Show view selection panel only for admins, customers go directly to CustomerView
  if (!selectedView) {
    // Customers go directly to CustomerView - no choice
    if (currentAccessLevel === 'customer') {
      return (
        <CustomerView
          userName={currentUser.name}
          experienceId={experienceId}
          onMessageSent={handleCustomerMessage}
        />
      );
    }
    
    // Admins see view selection panel
    return (
      <ViewSelectionPanel
        userName={currentUser.name}
        accessLevel={currentAccessLevel as 'admin'}
        onViewSelected={handleViewSelected}
      />
    );
  }

  // Show admin view
  if (selectedView === 'admin') {
    return <AdminPanel />;
  }

  // Show customer view
  if (selectedView === 'customer') {
    return (
      <CustomerView
        userName={currentUser.name}
        experienceId={experienceId}
        onMessageSent={handleCustomerMessage}
      />
    );
  }

  // Fallback (should not reach here)
  return (
    <div className="flex justify-center items-center h-screen px-8 bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
        <p className="text-gray-300">Please wait while we prepare your experience.</p>
      </div>
    </div>
  );
};

export default ExperienceView;
