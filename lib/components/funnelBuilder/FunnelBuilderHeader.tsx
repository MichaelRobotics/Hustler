'use client';

import React from 'react';

interface FunnelBuilderHeaderProps {
  onBack: () => void;
  funnelName: string;
  generations: number;
  onBuyGenerations: () => void;
}

/**
 * --- Funnel Builder Header Component ---
 * This component renders the header for the AI Funnel Builder page.
 * It includes a back button, the funnel's title, and the generation balance display.
 *
 * @param {FunnelBuilderHeaderProps} props - The props passed to the component.
 * @param {function} props.onBack - The function to call when the back button is clicked.
 * @param {string} props.funnelName - The name of the current funnel being edited.
 * @param {number} props.generations - The number of available AI generations.
 * @param {function} props.onBuyGenerations - The function to call to open the 'Buy Generations' modal.
 * @returns {JSX.Element} The rendered FunnelBuilderHeader component.
 */
const FunnelBuilderHeader: React.FC<FunnelBuilderHeaderProps> = ({ 
  onBack, 
  funnelName, 
  generations, 
  onBuyGenerations 
}) => (
    <header className="relative p-2 sm:p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-white">&larr; Back</button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg sm:text-2xl font-bold text-white text-center px-2 truncate w-1/2 sm:w-auto">
            {funnelName}
        </h1>
        <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm font-semibold text-gray-300">Generations: {generations}</span>
            <button onClick={onBuyGenerations} className="px-3 py-1 text-xs rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors">
                Buy
            </button>
        </div>
    </header>
);

export default FunnelBuilderHeader;


