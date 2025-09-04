'use client';

import React from 'react';
import { Text } from 'frosted-ui';
import { FunnelBlockOption } from '../../types/funnel';

interface CustomerChatOptionsProps {
  options: FunnelBlockOption[];
  onOptionClick: (option: FunnelBlockOption, index: number) => void;
}

export const CustomerChatOptions: React.FC<CustomerChatOptionsProps> = ({
  options,
  onOptionClick
}) => {
  if (options.length === 0) return null;

  return (
    <div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
      <div className="space-y-3">
        <div className="flex flex-col items-end space-y-2">
          {options.map((opt, i) => {
            return (
              <button
                key={i}
                onClick={() => onOptionClick(opt, i)}
                className="max-w-xs lg:max-w-md p-3 border rounded-xl transition-all duration-200 text-left group bg-white dark:bg-gray-800 border-border/50 dark:border-border/30 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700/30">
                    <Text size="1" weight="bold" className="text-violet-700 dark:text-violet-300">
                      {i + 1}
                    </Text>
                  </div>
                  <Text size="2" className="text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                    {opt.text}
                  </Text>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
