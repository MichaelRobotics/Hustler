'use client';

import React from 'react';
import { generateMockData, generateSalesData } from '@/lib/utils/dataSimulation';
import { createDefaultFunnel } from '@/lib/utils/funnelUtils';
import AIFunnelBuilderPage from '../funnelBuilder/AIFunnelBuilderPage';
import FunnelsDashboard from './FunnelsDashboard';
import SalesPerformance from './SalesPerformance';
import FunnelAnalytics from './FunnelAnalytics';

// Type definitions
interface Funnel {
  id: string;
  name: string;
  flow?: any;
  isDeployed?: boolean;
  delay?: number;
  resources?: any[];
}

interface User {
  id: string;
  funnelId: string;
  isQualified: boolean;
  stepCompleted: number;
}

interface SalesData {
  funnelId: string;
  name: string;
  price: number;
  type: string;
}

interface Resource {
  id: string;
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

interface Stats {
  total: number;
  qualifiedUsers: number;
  converted: number;
}

interface SalesStats {
  affiliate: any[];
  myProducts: any[];
  affiliateTotal: { sales: number; revenue: number };
  myProductsTotal: { sales: number; revenue: number };
}

/**
 * --- Main Admin Component ---
 * This is the top-level component that manages the overall application state and views.
 * It handles data initialization, state management for funnels, users, and sales,
 * and renders the appropriate view (dashboard or funnel builder).
 *
 * @returns {JSX.Element} The rendered AdminPanel component.
 */
const AdminPanel = () => {
    // State for managing the current view ('dashboard' or 'builder')
    const [view, setView] = React.useState<'dashboard' | 'builder'>('dashboard');
    
    // State for all application data
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [stats, setStats] = React.useState<Stats>({ total: 0, qualifiedUsers: 0, converted: 0 });
    const [salesStats, setSalesStats] = React.useState<SalesStats>({ 
        affiliate: [], 
        myProducts: [], 
        affiliateTotal: { sales: 0, revenue: 0 }, 
        myProductsTotal: { sales: 0, revenue: 0 } 
    });
    const [loading, setLoading] = React.useState(true);
    const [funnels, setFunnels] = React.useState<Funnel[]>([]);
    const [allSalesData, setAllSalesData] = React.useState<SalesData[]>([]);
    const [allResources, setAllResources] = React.useState<Resource[]>([]);
    const [generations, setGenerations] = React.useState(1);

    // State for dashboard interactions
    const [selectedFunnelId, setSelectedFunnelId] = React.useState<string | null>('A');
    const [editingFunnel, setEditingFunnel] = React.useState<Funnel | null>(null);
    const [editingFunnelName, setEditingFunnelName] = React.useState<{ id: string | null; name: string }>({ id: null, name: '' });
    const [newFunnelName, setNewFunnelName] = React.useState("");
    const [isAddingFunnel, setIsAddingFunnel] = React.useState(false);
    const [funnelToDelete, setFunnelToDelete] = React.useState<string | null>(null);
    const [funnelSettingsToEdit, setFunnelSettingsToEdit] = React.useState<Funnel | null>(null);

    // This effect runs once on component mount to initialize all data from localStorage or generate mock data.
    React.useEffect(() => {
        let userData = JSON.parse(localStorage.getItem('allUsersData') || '[]');
        if (userData.length === 0) {
            userData = generateMockData(1000);
            localStorage.setItem('allUsersData', JSON.stringify(userData));
        }
        setAllUsers(userData);

        let savedFunnels = JSON.parse(localStorage.getItem('funnels') || '[]');
        if (savedFunnels.length === 0) {
            savedFunnels = [
                createDefaultFunnel('A', 'Sales Funnel', 50, true),
                createDefaultFunnel('B', 'Lead Gen Funnel', 50)
            ];
            localStorage.setItem('funnels', JSON.stringify(savedFunnels));
        }
        setFunnels(savedFunnels);

        let salesData = JSON.parse(localStorage.getItem('salesData') || '[]');
        if (salesData.length === 0) {
            salesData = generateSalesData();
            localStorage.setItem('salesData', JSON.stringify(salesData));
        }
        setAllSalesData(salesData);

        const savedResources = JSON.parse(localStorage.getItem('allResources') || '[]');
        if (savedResources.length === 0) {
            const defaultResources = [
                { id: '1', type: 'AFFILIATE', name: 'Beginner Dropshipping Course', link: 'https://example.com/ds-beg', code: 'SAVE10', category: 'PAID_PRODUCT' },
                { id: '2', type: 'MY_PRODUCT', name: 'Advanced E-commerce Guide to $100k Months', link: 'https://example.com/my-guide', code: '', category: 'PAID_PRODUCT' },
                { id: '3', type: 'AFFILIATE', name: 'SMMA Client Finder Tool for Agencies', link: 'https://example.com/smma-tool', code: 'SMMA20', category: 'FREE_VALUE' },
            ];
            setAllResources(defaultResources);
            localStorage.setItem('allResources', JSON.stringify(defaultResources));
        } else {
            setAllResources(savedResources);
        }

        const savedGenerations = localStorage.getItem('generations');
        if (savedGenerations === null) {
            setGenerations(1);
            localStorage.setItem('generations', '1');
        } else {
            setGenerations(JSON.parse(savedGenerations));
        }
    }, []);

    // Effect to persist generation count to localStorage whenever it changes.
    React.useEffect(() => {
        localStorage.setItem('generations', JSON.stringify(generations));
    }, [generations]);

    // Effect to recalculate sales statistics when the selected funnel or sales data changes.
    React.useEffect(() => {
        if (!allSalesData.length) return;

        const funnelSales = allSalesData.filter(s => s.funnelId === selectedFunnelId);

        const productSummary = funnelSales.reduce((acc: any, sale) => {
            if (!acc[sale.name]) {
                acc[sale.name] = { name: sale.name, sales: 0, revenue: 0, type: sale.type };
            }
            acc[sale.name].sales += 1;
            acc[sale.name].revenue += sale.price;
            return acc;
        }, {});

        const allProducts = Object.values(productSummary);
        const affiliateProducts = allProducts.filter((p: any) => p.type === 'AFFILIATE');
        const myProducts = allProducts.filter((p: any) => p.type === 'MY_PRODUCTS');
        const affiliateTotal = affiliateProducts.reduce((acc: { sales: number; revenue: number }, p: any) => ({ sales: acc.sales + p.sales, revenue: acc.revenue + p.revenue }), { sales: 0, revenue: 0 });
        const myProductsTotal = myProducts.reduce((acc: { sales: number; revenue: number }, p: any) => ({ sales: acc.sales + p.sales, revenue: acc.revenue + p.revenue }), { sales: 0, revenue: 0 });

        setSalesStats({
            affiliate: affiliateProducts.sort((a: any, b: any) => b.revenue - a.revenue),
            myProducts: myProducts.sort((a: any, b: any) => b.revenue - a.revenue),
            affiliateTotal,
            myProductsTotal
        });
    }, [selectedFunnelId, allSalesData]);

    // Effect to recalculate funnel analytics when the selected funnel or user data changes.
    React.useEffect(() => {
        if (allUsers.length === 0) return;

        const funnelUsers = allUsers.filter(u => u.funnelId === selectedFunnelId);
        const total = funnelUsers.length;
        const funnelStats = {
            total,
            qualifiedUsers: funnelUsers.filter(u => u.isQualified).length,
            converted: funnelUsers.filter(u => u.stepCompleted === 6).length,
        };
        setStats(funnelStats);
        setLoading(false);
    }, [selectedFunnelId, allUsers]);

    // --- Event Handlers ---

    const handleEditFunnel = (funnel: Funnel) => {
        setEditingFunnel(funnel);
        setView('builder');
    };

    const handleUpdateFunnel = React.useCallback((updatedFunnel: Funnel) => {
        setFunnels(prevFunnels => {
            const updatedFunnels = prevFunnels.map(f =>
                f.id === updatedFunnel.id ? updatedFunnel : f
            );
            localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
            return updatedFunnels;
        });
        setEditingFunnel(updatedFunnel);
    }, []);

    const handleAddNewFunnel = () => {
        if (!newFunnelName.trim() || funnels.length >= 6) return;
        const newId = String.fromCharCode(65 + funnels.length); // Generates A, B, C...
        const newFunnel = createDefaultFunnel(newId, newFunnelName);
        const updatedFunnels = [...funnels, newFunnel];
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
        setNewFunnelName("");
        setIsAddingFunnel(false);
    };

    const handleSaveFunnelName = (funnelId: string) => {
        const updatedFunnels = funnels.map(f => f.id === funnelId ? {...f, name: editingFunnelName.name} : f);
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
        setEditingFunnelName({ id: null, name: '' });
    };

    const handleSaveFunnelSettings = () => {
        if (!funnelSettingsToEdit) return;
        const updatedFunnels = funnels.map(f => f.id === funnelSettingsToEdit.id ? funnelSettingsToEdit : f);
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
        setFunnelSettingsToEdit(null);
    };

    const handleDeployFunnel = (funnelId: string) => {
        const updatedFunnels = funnels.map(f => ({
            ...f,
            isDeployed: f.id === funnelId
        }));
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
    };

    const handleConfirmDeleteFunnel = () => {
        if (!funnelToDelete) return;
        const updatedFunnels = funnels.filter(f => f.id !== funnelToDelete);
        if (selectedFunnelId === funnelToDelete) {
            setSelectedFunnelId(updatedFunnels.length > 0 ? updatedFunnels[0].id : null);
        }
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));
        setFunnelToDelete(null);
    };

    // --- Render Logic ---

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-gray-900"><div className="text-2xl font-bold text-gray-400">Loading Analytics...</div></div>;
    }

    if (view === 'builder' && editingFunnel) {
        return <AIFunnelBuilderPage
            funnel={editingFunnel}
            onUpdate={handleUpdateFunnel}
            onBack={() => setView('dashboard')}
            allResources={allResources}
            setAllResources={setAllResources}
            funnels={funnels}
            setFunnels={setFunnels}
            generations={generations}
            setGenerations={setGenerations}
        />
    }

    return (
        <div className="bg-gray-900 min-h-screen p-4 sm:p-8 font-sans text-gray-300" style={{'--dot-bg': '#111827', '--dot-color': '#374151', backgroundImage: 'radial-gradient(var(--dot-color) 1px, transparent 1px)', backgroundSize: '20px 20px'} as React.CSSProperties}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-6">Admin Dashboard</h1>

                <FunnelsDashboard
                    funnels={funnels}
                    selectedFunnelId={selectedFunnelId || 'A'}
                    setSelectedFunnelId={setSelectedFunnelId}
                    handleEditFunnel={handleEditFunnel}
                    handleDeployFunnel={handleDeployFunnel}
                    setFunnelToDelete={setFunnelToDelete}
                    setFunnelSettingsToEdit={setFunnelSettingsToEdit}
                    editingFunnelName={editingFunnelName}
                    setEditingFunnelName={setEditingFunnelName}
                    handleSaveFunnelName={handleSaveFunnelName}
                    isAddingFunnel={isAddingFunnel}
                    setIsAddingFunnel={setIsAddingFunnel}
                    newFunnelName={newFunnelName}
                    setNewFunnelName={setNewFunnelName}
                    handleAddNewFunnel={handleAddNewFunnel}
                />

                <SalesPerformance salesStats={salesStats} />

                <FunnelAnalytics stats={stats} />

                {funnelToDelete && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-red-500/50 rounded-lg shadow-2xl w-full max-w-md">
                            <div className="p-6 text-center">
                                <h3 className="text-lg font-bold text-red-400 mb-2">Confirm Funnel Deletion</h3>
                                <p className="text-gray-300 mb-4">Are you sure you want to delete this funnel? This action cannot be undone.</p>
                                <div className="flex justify-center gap-4">
                                    <button onClick={() => setFunnelToDelete(null)} className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">Cancel</button>
                                    <button onClick={handleConfirmDeleteFunnel} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Delete Funnel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {funnelSettingsToEdit && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                 <div className="bg-gray-900 border border-violet-500/50 rounded-lg shadow-2xl w-full max-w-sm">
                                     <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                                         <h3 className="text-lg font-bold text-violet-400">Funnel Settings</h3>
                                         <button onClick={() => setFunnelSettingsToEdit(null)} className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                         </button>
                                     </div>
                                     <div className="p-6 space-y-4">
                                         <div>
                                             <label htmlFor="delay" className="block text-sm font-medium text-gray-300 mb-2">Welcome Message Delay (seconds)</label>
                                             <input
                                                 type="text"
                                                 id="delay"
                                                 value={funnelSettingsToEdit.delay || 0}
                                                 onChange={(e) => setFunnelSettingsToEdit({...funnelSettingsToEdit, delay: parseInt(e.target.value) || 0})}
                                                 className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                             />
                                         </div>
                                         <div className="flex justify-end gap-2">
                                             <button onClick={() => setFunnelSettingsToEdit(null)} className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">Cancel</button>
                                             <button onClick={handleSaveFunnelSettings} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors">Save</button>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
