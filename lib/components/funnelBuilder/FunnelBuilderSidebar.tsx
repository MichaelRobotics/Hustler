'use client';

import React from 'react';
import CollapsibleText from '../common/CollapsibleText';

interface Resource {
  id: string;
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

interface Funnel {
  id: string;
  name: string;
  flow?: any;
  isDeployed?: boolean;
  delay?: number;
  resources?: Resource[];
}

interface FunnelBuilderSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentFunnel: Funnel;
  onAddResource: () => void;
  removeResourceFromFunnel: (resourceId: string) => void;
}

/**
 * --- Funnel Builder Sidebar Component ---
 * This component renders the collapsible sidebar for the AI Funnel Builder page.
 * It displays the list of resources currently added to the funnel and provides
 * controls to add or remove them.
 *
 * @param {FunnelBuilderSidebarProps} props - The props passed to the component.
 * @param {boolean} props.isSidebarOpen - Whether the sidebar is currently open.
 * @param {function} props.setIsSidebarOpen - The function to toggle the sidebar's open state.
 * @param {Funnel} props.currentFunnel - The funnel object currently being edited.
 * @param {function} props.onAddResource - The function to call to open the 'Add Resource' modal.
 * @param {function} props.removeResourceFromFunnel - The function to remove a resource from the current funnel.
 * @returns {JSX.Element} The rendered FunnelBuilderSidebar component.
 */
const FunnelBuilderSidebar: React.FC<FunnelBuilderSidebarProps> = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  currentFunnel, 
  onAddResource, 
  removeResourceFromFunnel 
}) => (
    <div className={`flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:w-1/3 md:max-w-md' : 'md:w-16'}`}>
        <div className="p-4 sm:p-6 h-full overflow-y-auto overflow-x-hidden">
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-between md:justify-center'}`}>
                <h2 className={`text-lg font-semibold text-white whitespace-nowrap ${isSidebarOpen ? '' : 'md:hidden'}`}>1. Add Resources</h2>
                <button onClick={() => setIsSidebarOpen(prev => !prev)} className="bg-gray-700/50 p-1 rounded-full text-white flex-shrink-0">
                    {/* Icon for mobile, rotates on open/close */}
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 md:hidden ${isSidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    {/* Icon for desktop, rotates on open/close */}
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 hidden md:block ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>
            
            {/* Collapsible content area */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isSidebarOpen ? 'max-h-[1000px] mt-3' : 'max-h-0'} md:max-h-full ${!isSidebarOpen && 'md:opacity-0 md:pointer-events-none'}`}>
                <button onClick={onAddResource} className="w-full px-4 py-2 my-4 rounded-lg bg-violet-600/80 text-white font-semibold hover:bg-violet-700/80 transition-colors">
                    Add Resource
                </button>
                <h3 className="text-md font-semibold text-white mb-3">Current Resources</h3>
                <div className="space-y-2">
                    {(currentFunnel.resources || []).map((res) => (
                        <div key={res.id} className="bg-gray-800/50 p-2 rounded-md text-sm flex justify-between items-center">
                            <div className="flex-1 min-w-0 mr-2">
                                <div className="font-bold text-white">
                                    <CollapsibleText text={res.name} maxLength={25} />
                                </div>
                                <p className="text-xs text-gray-400">{res.type} / {res.category === 'PAID_PRODUCT' ? 'Paid' : 'Free'}</p>
                            </div>
                            <button onClick={() => removeResourceFromFunnel(res.id)} className="p-1 text-red-400 hover:text-white rounded-md hover:bg-red-500/50 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export default FunnelBuilderSidebar;



