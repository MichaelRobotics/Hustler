import React from 'react';
import { Library, BookOpen, Sparkles } from 'lucide-react';
import { Heading, Text } from 'frosted-ui';

interface LibraryEmptyStateProps {
  selectedCategory: string;
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({ selectedCategory }) => {
  const getEmptyStateContent = () => {
    if (selectedCategory === 'all') {
      return {
        icon: <Library className="w-10 h-10 text-violet-500 dark:text-violet-400" strokeWidth={2.5} />,
        title: 'Your Library is Empty'
      };
    } else if (selectedCategory === 'PAID') {
      return {
        icon: <Sparkles className="w-10 h-10 text-orange-500 dark:text-orange-400" strokeWidth={2.5} />,
        title: 'No Paid Products Yet'
      };
    } else {
      return {
        icon: <BookOpen className="w-10 h-10 text-green-500 dark:text-green-400" strokeWidth={2.5} />,
        title: 'No Free Value Products'
      };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="text-center py-16 px-8 bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-violet-50/20 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-indigo-900/20 rounded-2xl border border-border/30 dark:border-border/20 shadow-lg backdrop-blur-sm">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-6 p-4 rounded-full bg-gradient-to-br from-violet-100/80 to-purple-100/60 dark:from-violet-900/40 dark:to-purple-900/30 border border-violet-200/50 dark:border-violet-700/30 flex items-center justify-center">
          {content.icon}
        </div>
      </div>
      
      <div className="mb-8">
        <Heading size="5" weight="bold" className="mb-3 text-foreground">
          {content.title}
        </Heading>
      </div>
    </div>
  );
};
