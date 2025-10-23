import React, { useState, useEffect } from 'react';
import { useSeasonalStoreDatabase } from '@/lib/hooks/useSeasonalStoreDatabase';
import type { StoreTemplate, Theme } from '@/lib/components/store/SeasonalStore/types';

interface SeasonalStoreDatabaseProps {
  onBack: () => void;
  experienceId: string;
}

export const SeasonalStoreDatabase: React.FC<SeasonalStoreDatabaseProps> = ({ onBack, experienceId }) => {
  const {
    // Core state
    allThemes,
    currentSeason,
    setCurrentSeason,
    floatingAssets,
    availableAssets,
    setAvailableAssets,
    
    // Theme-specific state
    themeTextStyles,
    themeLogos,
    themeGeneratedBackgrounds,
    themeUploadedBackgrounds,
    themeProducts,
    
    // Current theme's computed state
    fixedTextStyles,
    logoAsset,
    generatedBackground,
    uploadedBackground,
    products,
    theme,
    
    // Database state
    templates,
    themes,
    liveTemplate,
    lastEditedTemplate,
    
    // Loading and error states
    loadingState,
    setLoadingState,
    apiError,
    setError,
    
    // Theme management
    createTheme,
    updateTheme,
    
    // Template management
    saveTemplate,
    loadTemplate,
    setLiveTemplate,
    
    // Product management
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Background management
    setBackground,
    
    // Logo management
    setLogoAsset,
    
    // Text styles management
    setFixedTextStyles,
  } = useSeasonalStoreDatabase(experienceId);

  const [showDatabaseInfo, setShowDatabaseInfo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md">
        <button
          onClick={onBack}
          className="p-1 text-white hover:text-gray-300 transition-colors duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h1 className="text-2xl font-bold text-white">Seasonal Store (Database)</h1>
        
        <button
          onClick={() => setShowDatabaseInfo(!showDatabaseInfo)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Database Info
        </button>
      </div>

      {/* Database Info Panel */}
      {showDatabaseInfo && (
        <div className="p-4 bg-gray-900/50 backdrop-blur-md border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Themes</h3>
              <p className="text-gray-300">Count: {themes.length}</p>
              <p className="text-gray-300">Current: {currentSeason}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Templates</h3>
              <p className="text-gray-300">Count: {templates.length}</p>
              <p className="text-gray-300">Live: {liveTemplate ? 'Yes' : 'No'}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Products</h3>
              <p className="text-gray-300">Count: {products.length}</p>
              <p className="text-gray-300">Season: {currentSeason}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Status</h3>
              <p className="text-gray-300">Loading: {loadingState.isTextLoading || loadingState.isImageLoading ? 'Yes' : 'No'}</p>
              <p className="text-gray-300">Error: {apiError ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {apiError && (
        <div className="p-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-100">
          <p className="font-medium">{apiError}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        <div className="bg-gray-900/50 backdrop-blur-md rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Database Integration Test</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Current Theme</h3>
              <p className="text-gray-300">Name: {theme.name}</p>
              <p className="text-gray-300">Season: {currentSeason}</p>
              <p className="text-gray-300">Prompt: {theme.themePrompt || 'None'}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Products</h3>
              <p className="text-gray-300">Count: {products.length}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-white font-semibold">{product.name}</h4>
                    <p className="text-gray-300 text-sm">{product.description}</p>
                    <p className="text-green-400 font-bold">${product.price}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Templates</h3>
              <p className="text-gray-300">Count: {templates.length}</p>
              {templates.length > 0 && (
                <div className="space-y-2 mt-4">
                  {templates.map((template) => (
                    <div key={template.id} className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-white font-semibold">{template.name}</h4>
                      <p className="text-gray-300 text-sm">Season: {template.currentSeason}</p>
                      <p className="text-gray-300 text-sm">Live: {template.isLive ? 'Yes' : 'No'}</p>
                      <p className="text-gray-300 text-sm">Last Edited: {template.isLastEdited ? 'Yes' : 'No'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
