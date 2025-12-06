'use client';

import React from 'react';
import { Button, Heading, Card } from 'frosted-ui';
import { Eye } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  templateData: {
    products: any[];
    floatingAssets: any[];
    discountSettings?: any;
  };
  currentSeason: string;
  createdAt?: Date;
}

interface LiveTemplateCardProps {
  template: Template;
  onPreview?: (templateId: string, options?: { restorePrevious?: boolean }) => void;
  onClose: () => void;
}

export const LiveTemplateCard: React.FC<LiveTemplateCardProps> = ({
  template,
  onPreview,
  onClose,
}) => {
  return (
    <div>
      <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
        Live Shop
      </Heading>
      <Card className="p-4 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 overflow-visible min-w-0">
        <div className="fui-reset">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                <Heading size="4" weight="semi-bold" className="text-foreground truncate">
                  {template.name}
                </Heading>
              </div>
            </div>
          </div>
          {onPreview && (
            <Button
              size="3"
              color="violet"
              variant="surface"
              onClick={() => {
                onPreview(template.id, { restorePrevious: true });
                onClose();
              }}
              className="w-full !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 flex items-center justify-center gap-2"
            >
              <Eye size={20} strokeWidth={2.5} />
              <span className="ml-1">Live Preview</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};




