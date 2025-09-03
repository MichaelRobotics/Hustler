'use client';

import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Edit, Settings, Copy, Trash2, Check, X, Circle } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import { ThemeToggle } from '../common/ThemeToggle';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean; // Track if funnel was ever live
  delay?: number;
  resources?: any[];
  sends?: number;
  flow?: any;
  // New: Per-funnel generation state
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}

interface FunnelsDashboardProps {
  funnels: Funnel[];
  handleEditFunnel: (funnel: Funnel) => void;
  handleDeployFunnel: (funnelId: string) => void;
  setFunnelToDelete: (funnelId: string | null) => void;
  setFunnelSettingsToEdit?: (funnel: Funnel | null) => void;
  editingFunnelId: string | null;
  setEditingFunnelId: (id: string | null) => void;
  handleSaveFunnelName: (funnelId: string, newName: string) => void;
  onFunnelClick: (funnel: Funnel) => void;
  handleDuplicateFunnel: (funnel: Funnel) => void;
  handleManageResources: (funnel: Funnel) => void;
}

export default function FunnelsDashboard({
    funnels, 
    handleEditFunnel, 
    handleDeployFunnel, 
    setFunnelToDelete, 
    setFunnelSettingsToEdit, 
    editingFunnelId, 
    setEditingFunnelId, 
    handleSaveFunnelName,
    onFunnelClick,
    handleDuplicateFunnel,
    handleManageResources
}: FunnelsDashboardProps) {

    // State to track which dropdown is open and which button is highlighted
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [highlightedButtonId, setHighlightedButtonId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');


    return (
      <div className="space-y-6">

      {/* Funnels Grid - Enhanced with smooth gradients for both themes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {funnels.map((funnel) => (
              <div
                  key={funnel.id}
                  onClick={() => onFunnelClick(funnel)}
                  className="group relative bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl flex flex-col justify-between transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/80 dark:hover:border-violet-400/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 shadow-lg backdrop-blur-sm dark:hover:shadow-2xl dark:hover:shadow-violet-500/20 dark:shadow-black/20 overflow-hidden"
              >
                  {/* Card Header with Status - Enhanced with smooth gradients for both themes */}
                  <div className="p-4 border-b-2 border-border dark:border-violet-500/30 bg-gradient-to-r from-gray-50 via-gray-100 to-violet-100 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-800/60">
                      <div className="flex items-start justify-between gap-3">
                          {/* Status Badge - Live (Red) or Draft (Gray) */}
                          <div className="flex items-center gap-2">
                              {funnel.isDeployed && hasValidFlow(funnel) ? (
                                  <span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-600 shadow-sm">
                                      <Circle className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full mr-2 animate-pulse fill-current" strokeWidth={0} />
                                      <span className="hidden sm:inline font-semibold">Live</span>
                                      <span className="sm:hidden">●</span>
                                  </span>
                              ) : (
                                  <span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/60 dark:to-gray-700/60 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                                      <Circle className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full mr-2 fill-current" strokeWidth={0} />
                                      <span className="hidden sm:inline font-semibold">Draft</span>
                                      <span className="sm:hidden">●</span>
                                  </span>
                              )}
                          </div>
                            </div>
                        </div>

                  {/* Card Body - Enhanced with smooth gradients for both themes */}
                  <div className="p-4 bg-gradient-to-br from-gray-50/80 via-gray-100/60 to-violet-50/40 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-indigo-900/30">
                            {editingFunnelId === funnel.id ? (
                          <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                  className="w-full border-2 border-border/60 dark:border-violet-500/40 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 dark:focus:border-violet-400/80 transition-all duration-200 shadow-sm dark:shadow-lg dark:shadow-black/20"
                                        autoFocus
                                  onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex gap-2">
                                  <Button 
                                      size="2"
                                      color="green"
                                      onClick={(e) => { e.stopPropagation(); handleSaveFunnelName(funnel.id, editingName)}} 
                                      className="flex-1 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 dark:shadow-green-500/30"
                                      aria-label="Save funnel name"
                                  >
                                      <Check className="h-4 w-4" strokeWidth={2.5} />
                                      <span>Save</span>
                                  </Button>
                                  <Button 
                                      size="2"
                                      color="red"
                                      variant="soft"
                                      onClick={(e) => { e.stopPropagation(); setEditingFunnelId(null); setEditingName('')}} 
                                      className="flex-1 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 dark:shadow-red-500/30"
                                      aria-label="Cancel editing"
                                  >
                                      <X className="h-4 w-4" strokeWidth={2.5} />
                                      <span>Cancel</span>
                                  </Button>
                              </div>
                                </div>
                            ) : (
                          <div className="space-y-4">
                              {/* Funnel Name */}
                              <div>
                                  <Text size="4" weight="semi-bold" className="cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors duration-200 text-foreground line-clamp-2">
                                            {funnel.name}
                                  </Text>
                              </div>
                              
                              {/* Sends Counter and Status Indicators - Combined to remove free space */}
                              <div className="flex flex-col gap-2">
                                  {/* Sends Counter */}
                                  <div className="flex flex-col gap-1">
                                      <Text size="4" weight="bold" color="violet" className="dark:text-violet-300">
                                          {funnel.sends || 0}
                                      </Text>
                                      <Text size="1" color="gray" className="dark:text-gray-300">
                                          Sends
                                      </Text>
                                  </div>


                              </div>
                          </div>
                      )}
                                    </div>
                                    
                  {/* Settings Dots - Moved to top right corner */}
                  <div className="absolute top-3 right-3 z-10">
                      <DropdownMenu.Root 
                          open={openDropdownId === funnel.id}
                          onOpenChange={(open) => {
                              if (open) {
                                  setOpenDropdownId(funnel.id);
                                  setHighlightedButtonId(funnel.id);
                              } else {
                                  setOpenDropdownId(null);
                                  setHighlightedButtonId(null);
                              }
                          }}
                      >
                          <DropdownMenu.Trigger asChild>
                                        <button 
                                  className={`p-2 rounded-lg transition-all duration-200 opacity-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 shadow-sm border-2 ${
                                      highlightedButtonId === funnel.id && openDropdownId === funnel.id
                                          ? 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 border-violet-300/60 dark:border-violet-600/60'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-surface/80 border-transparent hover:border-violet-500/40 dark:hover:border-violet-400/60'
                                  }`}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      if (openDropdownId === funnel.id) {
                                          setOpenDropdownId(null);
                                          setHighlightedButtonId(null);
                                      } else {
                                          setOpenDropdownId(funnel.id);
                                          setHighlightedButtonId(funnel.id);
                                      }
                                  }}
                                  aria-label="Funnel options"
                              >
                                  <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                                        </button>
                          </DropdownMenu.Trigger>
                          
                          <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                  className="min-w-[180px] sm:min-w-[200px] border-2 border-border/80 dark:border-violet-500/50 bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/50 backdrop-blur-sm rounded-xl shadow-2xl p-1 z-50"
                                  sideOffset={5}
                                  align="end"
                              >
                                  <DropdownMenu.Item
                                      onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          setEditingFunnelId(funnel.id);
                        setEditingName(funnel.name); 
                                          setOpenDropdownId(null);
                                          setHighlightedButtonId(null);
                                      }}
                                      className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 text-foreground hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-800 dark:hover:text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 border-2 border-transparent hover:border-violet-300/60 dark:hover:border-violet-600/60"
                                  >
                                      <span className="text-sm font-bold">Aa</span>
                                      <span>Rename</span>
                                  </DropdownMenu.Item>
                                  
                                  <DropdownMenu.Item
                                      onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          handleManageResources(funnel); 
                                          setOpenDropdownId(null);
                                          setHighlightedButtonId(null);
                                      }}
                                      className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 text-foreground hover:bg-sky-100 dark:hover:bg-sky-900/40 hover:text-sky-800 dark:hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 border-2 border-transparent hover:border-sky-300/60 dark:hover:border-sky-600/60"
                                  >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                      <span>Products</span>
                                  </DropdownMenu.Item>
                                  
                                  <DropdownMenu.Item
                                      onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          handleEditFunnel(funnel); 
                                          setOpenDropdownId(null);
                                          setHighlightedButtonId(null);
                                      }}
                                      className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 text-foreground hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-800 dark:hover:text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 border-2 border-transparent hover:border-violet-300/60 dark:hover:border-violet-600/60"
                                  >
                                      <Edit className="h-4 w-4" strokeWidth={2.5} />
                                      <span>Edit</span>
                                  </DropdownMenu.Item>
                                  
                                  <DropdownMenu.Item
                                      onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          handleDuplicateFunnel(funnel); 
                                          setOpenDropdownId(null);
                                          setHighlightedButtonId(null);
                                      }}
                                      className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 text-foreground hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-800 dark:hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 border-2 border-transparent hover:border-amber-300/60 dark:hover:border-amber-600/60"
                                  >
                                      <Copy className="h-4 w-4" strokeWidth={2.5} />
                                      <span>Duplicate</span>
                                  </DropdownMenu.Item>
                                  
                                  <DropdownMenu.Separator className="h-px bg-border/60 my-1 dark:bg-violet-500/30" />
                                  
                                  <DropdownMenu.Item
                                      onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          setFunnelToDelete(funnel.id); 
                                          setOpenDropdownId(null);
                                          setHighlightedButtonId(null);
                                      }}
                                                    disabled={funnel.isDeployed && hasValidFlow(funnel)}
                                      className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 disabled:cursor-not-allowed disabled:hover:bg-transparent text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-800 dark:hover:text-red-200 disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 border-2 border-transparent hover:border-red-300/60 dark:hover:border-red-600/60"
                                                    title={funnel.isDeployed && hasValidFlow(funnel) ? "Cannot delete a live funnel" : "Delete funnel"}
                                                >
                                      <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                      <span>Delete</span>
                                  </DropdownMenu.Item>
                              </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

