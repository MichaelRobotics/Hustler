import React from 'react';
import { Zap } from 'lucide-react';
import { Heading, Text } from 'frosted-ui';
import { Funnel, Resource } from '../../types/resource';

interface FunnelGenerationSectionProps {
  funnel: Funnel;
  currentResources: Resource[];
  isGenerating: (funnelId: string) => boolean;
  onGlobalGeneration: (funnelId: string) => Promise<void>;
}

export const FunnelGenerationSection: React.FC<FunnelGenerationSectionProps> = ({
  funnel,
  currentResources,
  isGenerating,
  onGlobalGeneration
}) => {
  if (funnel.flow || currentResources.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 mb-8">
      <div className="text-center py-12 px-8 bg-gradient-to-br from-violet-50/30 via-purple-50/20 to-indigo-50/15 dark:from-gray-800/40 dark:via-gray-700/30 dark:to-gray-600/20 rounded-2xl border border-violet-200/30 dark:border-gray-600/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.12)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12)_0%,transparent_50%)]" />
        
        <div className="relative z-10">
          <div className="mb-6">
            {isGenerating(funnel.id) ? (
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
                  <Zap className="w-8 h-8 text-green-500" strokeWidth={2.5} />
                </div>
              </div>
            ) : (
              <button
                onClick={() => onGlobalGeneration(funnel.id)}
                disabled={funnel.generationStatus === 'generating'}
                className={`group w-24 h-24 mx-auto mb-4 p-5 rounded-full bg-gradient-to-br from-violet-300/20 to-purple-400/25 dark:from-gray-700/30 dark:to-gray-600/25 border border-violet-200/30 dark:border-gray-500/30 flex items-center justify-center shadow-lg shadow-violet-500/15 animate-pulse hover:scale-110 hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-500 ease-out cursor-pointer ${
                  funnel.generationStatus === 'generating' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-500 dark:from-green-300 dark:via-green-400 dark:to-emerald-400 animate-ping group-hover:animate-none group-hover:scale-125 group-hover:shadow-lg group-hover:shadow-green-400/50 transition-all duration-300 relative">
                  <Zap className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" strokeWidth={2.5} />
                </div>
              </button>
            )}
          </div>
          
          <div className="mb-8">
            <div className="text-center space-y-4">
              <Text size="2" color="gray" className="text-muted-foreground">
                {currentResources.length} product{currentResources.length !== 1 ? 's' : ''} selected
              </Text>
              <Heading size="5" weight="bold" className="text-violet-600 dark:text-violet-400">
                {funnel.generationStatus === 'generating' ? 'Generating...' : 
                 funnel.generationStatus === 'completed' ? 'Generated' :
                 funnel.generationStatus === 'failed' ? 'Generation Failed' : 'Generate'}
              </Heading>
              {funnel.generationStatus === 'failed' && funnel.generationError && (
                <Text size="2" color="red" className="text-red-600 dark:text-red-400">
                  Error: {funnel.generationError}
                </Text>
              )}
              {funnel.generationStatus === 'completed' && funnel.lastGeneratedAt && (
                <Text size="2" color="gray" className="text-muted-foreground">
                  Last generated: {new Date(funnel.lastGeneratedAt).toLocaleString()}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
