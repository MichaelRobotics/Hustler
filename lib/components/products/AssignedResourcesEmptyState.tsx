import React from 'react';
import { Library } from 'lucide-react';
import { Heading, Text } from 'frosted-ui';

export const AssignedResourcesEmptyState: React.FC = () => {
  return (
    <div className="text-center py-16 px-8 bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-violet-50/20 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-indigo-900/20 rounded-2xl border border-border/30 dark:border-border/20 shadow-lg backdrop-blur-sm">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-6 p-4 rounded-full bg-gradient-to-br from-violet-100/80 to-purple-100/60 dark:from-violet-900/40 dark:to-purple-900/30 border border-violet-200/50 dark:border-violet-700/30 flex items-center justify-center">
          <Library className="w-10 h-10 text-violet-500 dark:text-violet-400" strokeWidth={2.5} />
        </div>
      </div>
      
      <div className="mb-8">
        <Heading size="5" weight="bold" className="mb-3 text-foreground">
          No Products Assigned
        </Heading>
        <Text size="3" color="gray" className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Add products from your library to start building your funnel.
        </Text>
      </div>
    </div>
  );
};
