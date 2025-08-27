'use client';

import React from 'react';

interface GenerationPacksProps {
  isBuyGenerationsModalOpen: boolean;
  setIsBuyGenerationsModalOpen: (isOpen: boolean) => void;
  setGenerations: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * --- Generation Packs Component ---
 * This component renders a modal for purchasing additional AI generations.
 * It displays different packages and allows the user to "purchase" them, which
 * in this simulation, simply increases the generation count in the parent state.
 *
 * @param {GenerationPacksProps} props - The props passed to the component.
 * @param {boolean} props.isBuyGenerationsModalOpen - Whether the modal is currently visible.
 * @param {function} props.setIsBuyGenerationsModalOpen - The function to close the modal.
 * @param {function} props.setGenerations - The function to update the total number of generations.
 * @returns {JSX.Element|null} The rendered GenerationPacks modal or null if not active.
 */
const GenerationPacks: React.FC<GenerationPacksProps> = ({ 
  isBuyGenerationsModalOpen, 
  setIsBuyGenerationsModalOpen, 
  setGenerations 
}) => {
    
    // If the modal is not open, render nothing.
    if (!isBuyGenerationsModalOpen) {
        return null;
    }

    const handlePurchase = (amount: number) => {
        setGenerations(prev => prev + amount);
        setIsBuyGenerationsModalOpen(false);
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-violet-500/50 rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-violet-400">Buy Generations</h3>
                    <button onClick={() => setIsBuyGenerationsModalOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Generation Pack Option 1 */}
                    <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white">5 Generations</p>
                            <p className="text-sm text-gray-400">$5.00</p>
                        </div>
                        <button onClick={() => handlePurchase(5)} className="px-4 py-2 text-sm rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors">Purchase</button>
                    </div>
                    {/* Generation Pack Option 2 */}
                    <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white">10 Generations</p>
                            <p className="text-sm text-gray-400">$10.00</p>
                        </div>
                        <button onClick={() => handlePurchase(10)} className="px-4 py-2 text-sm rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors">Purchase</button>
                    </div>
                    {/* Generation Pack Option 3 */}
                    <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white">50 Generations</p>
                            <p className="text-sm text-gray-400">$40.00</p>
                        </div>
                        <button onClick={() => handlePurchase(50)} className="px-4 py-2 text-sm rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors">Purchase</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerationPacks;

