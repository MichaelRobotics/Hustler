'use client';

import React from 'react';

interface Template {
  id: string;
  name: string;
  templateData: {
    products: any[];
    floatingAssets: any[];
  };
  currentSeason: string;
}

interface TemplateManagerModalProps {
  isOpen: boolean;
  isAnimating: boolean;
  templates: Template[];
  liveTemplate: Template | null;
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  
  // Handlers
  onClose: () => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  setLiveTemplate: (id: string) => void;
  redirectToPublicShop: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  isAnimating,
  templates,
  liveTemplate,
  backgroundAnalysis,
  onClose,
  loadTemplate,
  deleteTemplate,
  setLiveTemplate,
  redirectToPublicShop,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shop Manager"
        className={`w-full max-w-md bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-300 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
          <h3 className={`text-sm font-semibold tracking-wide flex items-center ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Shop Manager
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Public Shop Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold uppercase text-gray-300 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Public Shop
            </h4>
            
            {liveTemplate ? (
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <h5 className="font-semibold text-white truncate">{liveTemplate.name}</h5>
                    <span className="ml-2 px-2 py-1 bg-green-600 text-green-100 text-xs rounded-full">LIVE</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  {liveTemplate.templateData.products.length} products • {liveTemplate.templateData.floatingAssets.length} assets • {liveTemplate.currentSeason} theme
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      loadTemplate(liveTemplate.id);
                      onClose();
                    }}
                    className="flex-1 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm rounded transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={redirectToPublicShop}
                    className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm rounded transition-colors flex items-center"
                    title="View Public Shop"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Shop
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <h5 className="font-semibold text-white truncate">Default Template</h5>
                    <span className="ml-2 px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">PUBLIC</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  No template is live - customers see the default shop appearance
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled
                    className="flex-1 px-3 py-1 bg-gray-600 text-gray-400 text-sm rounded cursor-not-allowed transition-colors"
                    title="Default template cannot be loaded"
                  >
                    Load
                  </button>
                  <button
                    onClick={redirectToPublicShop}
                    className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm rounded transition-colors flex items-center"
                    title="View Public Shop"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Shop
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Templates List */}
          <div>
            <h4 className="text-sm font-semibold uppercase text-gray-300 mt-2 mb-1">Templates {templates.filter(template => template.name !== "Default" && template.id !== liveTemplate?.id).length}</h4>
            {templates.length > 10 && (
              <div className="mb-2 text-xs text-gray-400">
                Showing first 10 templates
              </div>
            )}
            <div className="mb-8"></div>
            {templates.filter(template => template.name !== "Default" && template.id !== liveTemplate?.id).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No templates saved yet</p>
                <p className="text-xs mt-1">Create your first template by clicking "Save as New Template"</p>
              </div>
            ) : (
              <div className="max-h-[30rem] overflow-y-auto space-y-3">
                {/* Default Template Option - Only show when there IS a live template */}
                {liveTemplate && (
                  <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-white">Default (No Template Live)</h5>
                      <div className="w-4 h-4"></div> {/* Spacer for alignment */}
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      Clear all live templates - use default shop appearance
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setLiveTemplate("default");
                          onClose();
                        }}
                        className="flex-1 px-3 py-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-sm rounded transition-colors"
                      >
                        Make Shop Public
                      </button>
                      <div className="w-16"></div> {/* Spacer for alignment */}
                    </div>
                  </div>
                )}
                
                {templates.filter(template => template.name !== "Default" && template.id !== liveTemplate?.id).slice(0, 10).map((template) => (
                  <div key={template.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-white truncate">{template.name}</h5>
                      <button
                        onClick={() => {
                          if (confirm(`Delete template "${template.name}"?`)) {
                            deleteTemplate(template.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 rounded transition-colors"
                        title="Delete Template"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      {template.templateData.products.length} products • {template.templateData.floatingAssets.length} assets • {template.currentSeason} theme
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          loadTemplate(template.id);
                          onClose();
                        }}
                        className="flex-1 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm rounded transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => {
                          setLiveTemplate(template.id);
                          onClose();
                        }}
                        className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm rounded transition-colors flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Make Shop Public
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

