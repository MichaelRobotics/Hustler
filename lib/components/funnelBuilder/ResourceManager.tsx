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

interface NewResource {
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

interface ResourceManagerProps {
  isAddingResource: boolean;
  setIsAddingResource: (isAdding: boolean) => void;
  allResources: Resource[];
  setAllResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  currentFunnel: Funnel;
  onUpdate: (funnel: Funnel) => void;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
}

/**
 * --- Resource Manager Component ---
 * This component provides a modal interface for managing all marketing resources.
 * It allows users to view their resource library, add existing resources to a funnel,
 * create new resources, edit existing ones, and delete them from the library.
 *
 * @param {ResourceManagerProps} props - The props passed to the component.
 * @returns {JSX.Element|null} The rendered ResourceManager modal or null if not active.
 */
const ResourceManager: React.FC<ResourceManagerProps> = ({ 
    isAddingResource, 
    setIsAddingResource, 
    allResources, 
    setAllResources, 
    currentFunnel, 
    onUpdate,
    funnels,
    setFunnels
}) => {
    const [addResourceView, setAddResourceView] = React.useState<'library' | 'new'>('library');
    const [newResource, setNewResource] = React.useState<NewResource>({ 
      type: 'AFFILIATE', 
      name: '', 
      link: '', 
      code: '', 
      category: 'FREE_VALUE' 
    });
    const [editingResource, setEditingResource] = React.useState<Resource | null>(null);
    const [resourceToDelete, setResourceToDelete] = React.useState<string | null>(null);

    // --- Event Handlers for Resource Management ---

    const handleAddNewResource = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResource.name || !newResource.link) return;

        const newResourceWithId: Resource = { ...newResource, id: Date.now().toString() };
        const updatedAllResources = [...allResources, newResourceWithId];
        setAllResources(updatedAllResources);
        localStorage.setItem('allResources', JSON.stringify(updatedAllResources));

        // Also add the new resource directly to the current funnel
        const updatedFunnelResources = [...(currentFunnel.resources || []), newResourceWithId];
        onUpdate({ ...currentFunnel, resources: updatedFunnelResources });

        setNewResource({ type: 'AFFILIATE', name: '', link: '', code: '', category: 'FREE_VALUE' });
        setIsAddingResource(false);
    };

    const addResourceFromLibrary = (resource: Resource) => {
        const updatedFunnelResources = [...(currentFunnel.resources || []), resource];
        onUpdate({ ...currentFunnel, resources: updatedFunnelResources });
        setIsAddingResource(false);
    };

    const handleUpdateResource = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResource) return;

        const updatedAllResources = allResources.map(r => r.id === editingResource.id ? editingResource : r);
        setAllResources(updatedAllResources);
        localStorage.setItem('allResources', JSON.stringify(updatedAllResources));

        // Update the resource in all funnels that use it
        const updatedFunnels = funnels.map(f => ({
            ...f,
            resources: (f.resources || []).map(r => r.id === editingResource.id ? editingResource : r)
        }));
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
        
        setEditingResource(null);
    };

    const handleConfirmDelete = () => {
        if (!resourceToDelete) return;

        const updatedAllResources = allResources.filter(r => r.id !== resourceToDelete);
        setAllResources(updatedAllResources);
        localStorage.setItem('allResources', JSON.stringify(updatedAllResources));

        // Remove the resource from all funnels
        const updatedFunnels = funnels.map(f => ({
            ...f,
            resources: (f.resources || []).filter(r => r.id !== resourceToDelete)
        }));
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));

        setResourceToDelete(null);
    };

    // Render nothing if the main modal is not open
    if (!isAddingResource && !editingResource && !resourceToDelete) {
        return null;
    }

    // --- Render Logic for Modals ---

    if (editingResource) {
        return (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-blue-500/50 rounded-lg shadow-2xl w-full max-w-md">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-blue-400">Edit Resource</h3>
                        <button onClick={() => setEditingResource(null)} className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <form onSubmit={handleUpdateResource} className="p-4 space-y-3">
                        <input 
                            type="text" 
                            placeholder="Product/Link Name" 
                            value={editingResource.name} 
                            onChange={e => setEditingResource({...editingResource, name: e.target.value})} 
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input 
                            type="text" 
                            placeholder="https://example.com" 
                            value={editingResource.link} 
                            onChange={e => setEditingResource({...editingResource, link: e.target.value})} 
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input 
                            type="text" 
                            placeholder="Promo Code (optional)" 
                            value={editingResource.code} 
                            onChange={e => setEditingResource({...editingResource, code: e.target.value})} 
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select 
                            value={editingResource.type} 
                            onChange={e => setEditingResource({...editingResource, type: e.target.value})} 
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="AFFILIATE">AFFILIATE</option>
                            <option value="MY_PRODUCT">MY_PRODUCT</option>
                        </select>
                        <select 
                            value={editingResource.category} 
                            onChange={e => setEditingResource({...editingResource, category: e.target.value})} 
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="FREE_VALUE">Free Value (e.g., guide, link)</option>
                            <option value="PAID_PRODUCT">Paid Product/Service</option>
                        </select>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditingResource(null)} className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">Cancel</button>
                            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Update Resource</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (resourceToDelete) {
        return (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-red-500/50 rounded-lg shadow-2xl w-full max-w-md">
                    <div className="p-6 text-center">
                        <h3 className="text-lg font-bold text-red-400 mb-2">Confirm Resource Deletion</h3>
                        <p className="text-gray-300 mb-4">Are you sure you want to delete this resource? This action cannot be undone and will remove it from all funnels.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setResourceToDelete(null)} className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">Cancel</button>
                            <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Delete Resource</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-violet-500/50 rounded-lg shadow-2xl w-full max-w-md h-full max-h-[90vh] sm:max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-violet-400">Resource Library</h3>
                    <button onClick={() => setIsAddingResource(false)} className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-2 border-b border-gray-700 flex-shrink-0">
                    <div className="flex bg-gray-800/50 rounded-lg p-1">
                        <button onClick={() => setAddResourceView('library')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${addResourceView === 'library' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>Library</button>
                        <button onClick={() => setAddResourceView('new')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${addResourceView === 'new' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>Create New</button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {addResourceView === 'new' && (
                        <div className="p-4">
                            <h4 className="text-md font-semibold text-white mb-3 text-center">Create New Resource</h4>
                            <form onSubmit={handleAddNewResource} className="space-y-3">
                                <input type="text" placeholder="Product/Link Name" value={newResource.name} onChange={e => setNewResource({...newResource, name: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                                <input type="text" placeholder="https://example.com" value={newResource.link} onChange={e => setNewResource({...newResource, link: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                                <input type="text" placeholder="Promo Code (optional)" value={newResource.code} onChange={e => setNewResource({...newResource, code: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                                <select value={newResource.type} onChange={e => setNewResource({...newResource, type: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                                    <option value="AFFILIATE">AFFILIATE</option>
                                    <option value="MY_PRODUCT">MY_PRODUCT</option>
                                </select>
                                <select value={newResource.category} onChange={e => setNewResource({...newResource, category: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                                    <option value="FREE_VALUE">Free Value (e.g., guide, link)</option>
                                    <option value="PAID_PRODUCT">Paid Product/Service</option>
                                </select>
                                <button type="submit" className="w-full px-4 py-2 mt-4 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors">Create & Add to Funnel</button>
                            </form>
                        </div>
                    )}
                    {addResourceView === 'library' && (
                         <div className="p-4 space-y-2">
                            {allResources.map(res => (
                                <div key={res.id} className="bg-gray-800/50 p-2 rounded-md text-sm flex justify-between items-center gap-2">
                                    <div>
                                        <div className="font-bold text-white">
                                            <CollapsibleText text={res.name} maxLength={25} />
                                        </div>
                                        <p className="text-xs text-gray-400">{res.type} / {res.category === 'PAID_PRODUCT' ? 'Paid' : 'Free'}</p>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                        {!(currentFunnel.resources || []).some(fr => fr.id === res.id) ? (
                                            <button onClick={() => addResourceFromLibrary(res)} className="p-1 text-violet-400 hover:text-white rounded-md hover:bg-violet-500/50">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        ) : <div className="w-6"></div>}
                                        <button onClick={() => setEditingResource(res)} className="p-1 text-blue-400 hover:text-white rounded-md hover:bg-blue-500/50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                        </button>
                                        <button onClick={() => setResourceToDelete(res.id)} className="p-1 text-red-400 hover:text-white rounded-md hover:bg-red-500/50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceManager;

