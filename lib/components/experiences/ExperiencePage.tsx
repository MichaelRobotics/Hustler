'use client';

import React, { useState } from 'react';
import AdminPanel from '@/lib/components/admin/AdminPanel';
import { CustomerView } from '@/lib/components/userChat';
import ViewSelectionPanel from './ViewSelectionPanel';
import { useAuth } from '@/lib/context/auth-context';

/**
 * --- Experience View Component ---
 * This component handles the view selection and routing between admin and customer views.
 * It now uses the auth context instead of props for user data.
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
  const { user, isLoading, error } = useAuth();
  const [selectedView, setSelectedView] = useState<'admin' | 'customer' | null>(null);

  // Use auth context data if available, fallback to props
  const currentUser = user || { name: userName, accessLevel };
  const currentAccessLevel = (user?.accessLevel || accessLevel) as 'admin' | 'customer';

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

  // Show loading state if auth is still loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen px-8 bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
          <p className="text-gray-300">Please wait while we authenticate you.</p>
        </div>
      </div>
    );
  }

  // Show error state if auth failed
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen px-8 bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show view selection panel if no view is selected
  if (!selectedView) {
    return (
      <ViewSelectionPanel
        userName={currentUser.name}
        accessLevel={currentAccessLevel}
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
