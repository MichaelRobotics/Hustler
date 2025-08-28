import React from 'react';
import { Funnel } from '../../types/funnel';

interface EditingFunnelName {
  id: string | null;
  name: string;
}

interface FunnelsDashboardProps {
  funnels: Funnel[];
  selectedFunnelId: string;
  setSelectedFunnelId: (id: string) => void;
  handleEditFunnel: (funnel: Funnel) => void;
  handleDeployFunnel: (funnelId: string) => void;
  setFunnelToDelete: (funnelId: string | null) => void;
  setFunnelSettingsToEdit: (funnel: Funnel | null) => void;
  editingFunnelName: EditingFunnelName;
  setEditingFunnelName: (editing: EditingFunnelName) => void;
  handleSaveFunnelName: (funnelId: string) => void;
  isAddingFunnel: boolean;
  setIsAddingFunnel: (isAdding: boolean) => void;
  newFunnelName: string;
  setNewFunnelName: (name: string) => void;
  handleAddNewFunnel: () => void;
}

/**
 * --- Funnels Dashboard Component ---
 * This component displays the list of funnels and provides controls for managing them.
 * It handles funnel selection, editing, deployment, and deletion.
 *
 * @param {FunnelsDashboardProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered FunnelsDashboard component.
 */
const FunnelsDashboard: React.FC<FunnelsDashboardProps> = ({ 
    funnels, 
    selectedFunnelId, 
    setSelectedFunnelId, 
    handleEditFunnel, 
    handleDeployFunnel, 
    setFunnelToDelete, 
    setFunnelSettingsToEdit, 
    editingFunnelName, 
    setEditingFunnelName, 
    handleSaveFunnelName, 
    isAddingFunnel, 
    setIsAddingFunnel, 
    newFunnelName, 
    setNewFunnelName, 
    handleAddNewFunnel 
}) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 p-6 rounded-2xl shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">My Funnels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:max-h-full max-h-96 overflow-y-auto md:overflow-visible">
                {funnels.map(funnel => (
                    <div key={funnel.id} onClick={() => setSelectedFunnelId(funnel.id)} className={`p-4 rounded-lg border flex flex-col justify-between transition-colors ${selectedFunnelId === funnel.id ? 'bg-violet-600/30 border-violet-500' : 'bg-gray-900/50 border-gray-700 hover:bg-gray-700/50'}`}>
                        <div>
                            {editingFunnelName.id === funnel.id ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingFunnelName.name}
                                        onChange={(e) => setEditingFunnelName({...editingFunnelName, name: e.target.value})}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()} // Prevent card click when editing
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); handleSaveFunnelName(funnel.id)}} className="p-1 text-green-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingFunnelName({id: null, name: ''})}} className="p-1 text-red-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-start gap-2 min-w-0">
                                        <span
                                            className="font-semibold text-white cursor-pointer"
                                            onClick={(e) => {e.stopPropagation(); setEditingFunnelName({id: funnel.id, name: funnel.name})}}
                                        >
                                            {funnel.name}
                                        </span>
                                        {funnel.isDeployed && <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full flex-shrink-0 mt-1">Deployed</span>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setFunnelSettingsToEdit(funnel);}} className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-600/50 transition-colors" title="Funnel Settings">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleEditFunnel(funnel);}} className="px-3 py-1 text-sm rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors flex-shrink-0">Edit</button>
                                    </div>
                                </div>
                            )}
                        </div>
                         <div className="mt-4 pt-2 border-t border-gray-700/50 flex items-center justify-between">
                            <button
                                onClick={(e) => {e.stopPropagation(); handleDeployFunnel(funnel.id)}}
                                disabled={funnel.isDeployed}
                                className="text-xs font-semibold text-gray-300 hover:text-white disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                {funnel.isDeployed ? 'Currently Deployed' : 'Deploy'}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFunnelToDelete(funnel.id); }}
                                disabled={funnel.isDeployed}
                                className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-red-600/50 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={funnel.isDeployed ? "Cannot delete a deployed funnel" : "Delete funnel"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                         </div>
                    </div>
                ))}
                 {funnels.length < 6 && (
                    isAddingFunnel ? (
                        <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col gap-2 border border-gray-700 w-full">
                            <input
                                type="text"
                                value={newFunnelName}
                                onChange={(e) => setNewFunnelName(e.target.value)}
                                placeholder="New Funnel Name"
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleAddNewFunnel} className="flex-grow px-3 py-1 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">Add</button>
                                <button onClick={() => setIsAddingFunnel(false)} className="px-3 py-1 text-sm rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingFunnel(true)} className="bg-gray-900/50 p-4 rounded-lg flex justify-center items-center border-2 border-dashed border-gray-600 hover:border-violet-500 hover:text-violet-400 transition-colors w-full">
                            <span className="font-semibold text-white">+ Add New Funnel</span>
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default FunnelsDashboard;
