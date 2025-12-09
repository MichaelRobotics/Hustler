import { Button, Text, Switch } from "frosted-ui";
import {
	Check,
	PenLine,
	Plus,
	Sparkles,
	Target,
	Trash2,
	X,
	DollarSign,
	Gift,
	CheckCircle,
	GripVertical,
	Link2,
	FileText,
} from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Resource } from "@/lib/types/resource";

interface StoreResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string, resourceName: string) => void;
  onUpdate: (resourceId: string, updatedResource: Partial<Resource>) => Promise<void>;
  isRemoving?: boolean;
  isJustCreated?: boolean;
  isJustEdited?: boolean;
  isHighlighted?: boolean;
  // Store context props
  themeContext: {
    themeId: string;
    season: string;
    themeName: string;
  };
  onAddToTheme: (resource: Resource) => void;
  onRemoveFromTheme: (resource: Resource) => void;
  isResourceInTheme: (resourceId: string) => boolean;
  isBeingEdited?: boolean;
  // Drag handle props
  dragHandleProps?: any; // Props from @dnd-kit useSortable hook
  isDragging?: boolean; // Whether this card is currently being dragged
}

export const StoreResourceCard: React.FC<StoreResourceCardProps> = ({
  resource,
  onEdit,
  onDelete,
  onUpdate,
  isRemoving = false,
  isJustCreated = false,
  isJustEdited = false,
  isHighlighted = false,
  themeContext,
  onAddToTheme,
  onRemoveFromTheme,
  isResourceInTheme,
  isBeingEdited = false,
  dragHandleProps,
  isDragging = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isRemovingState, setIsRemovingState] = useState(false);
  const [isJustAdded, setIsJustAdded] = useState(false);
  const [isJustRemoved, setIsJustRemoved] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showRemovePopup, setShowRemovePopup] = useState(false);

  const isInTheme = isResourceInTheme(resource.id);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "PAID":
        return (
          <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
        );
      case "FREE_VALUE":
        return (
          <Gift className="w-6 h-6 text-green-600 dark:text-green-400" strokeWidth={2.5} />
        );
      default:
        return <Sparkles className="w-5 h-5" strokeWidth={2.5} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "LINK":
        return (
          <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
        );
      case "FILE":
        return (
          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
        );
      default:
        return null;
    }
  };

  const handleStartEdit = () => {
    // For Market Stall, use the edit form above the grid (same as global context)
    onEdit(resource);
    return;
  };


  const handleDelete = () => {
    onDelete(resource.id, resource.name);
  };

  // Store context handlers
  const handleAddToTheme = () => {
    setIsAdding(true);
    try {
      onAddToTheme(resource);
      
      // Show success animation and popup
      setIsJustAdded(true);
      setShowAddPopup(true);
      
      // Reset animation after delay
      setTimeout(() => {
        setIsAdding(false);
        setIsJustAdded(false);
      }, 2000);
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setShowAddPopup(false);
      }, 3000);
    } catch (error) {
      console.error("Error adding resource to theme:", error);
      setIsAdding(false);
    }
  };

  const handleRemoveFromTheme = () => {
    setIsRemovingState(true);
    try {
      onRemoveFromTheme(resource);
      
      // Show success animation and popup for removal
      setIsJustRemoved(true);
      setShowRemovePopup(true);
      
      // Reset states after animations
      setTimeout(() => {
        setIsRemovingState(false);
        setIsJustRemoved(false);
      }, 2000);
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setShowRemovePopup(false);
      }, 3000);
    } catch (error) {
      console.error("Error removing resource from theme:", error);
      setIsRemovingState(false);
    }
  };


  return (
    <div 
      onClick={handleStartEdit}
      className={`group relative bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-gray-200/40 dark:from-orange-900/80 dark:via-gray-800/60 dark:to-gray-900/30 rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer ${
      isDragging
        ? "opacity-20 shadow-2xl scale-95 z-50"
        : ""
      } ${
      isJustAdded 
        ? "border-green-500/80 dark:border-green-400/80 shadow-lg shadow-green-500/20 dark:shadow-green-400/20 animate-pulse bg-gradient-to-br from-green-50/90 via-green-100/70 to-green-200/50 dark:from-green-900/90 dark:via-green-800/70 dark:to-green-900/40" 
        : isJustRemoved
        ? "border-red-500/80 dark:border-red-400/80 shadow-lg shadow-red-500/20 dark:shadow-red-400/20 animate-pulse bg-gradient-to-br from-red-50/90 via-red-100/70 to-red-200/50 dark:from-red-900/90 dark:via-red-800/70 dark:to-red-900/40"
        : isJustCreated
        ? "border-green-500/80 dark:border-green-400/80 shadow-lg shadow-green-500/20 dark:shadow-green-400/20 animate-pulse bg-gradient-to-br from-green-50/90 via-green-100/70 to-green-200/50 dark:from-green-900/90 dark:via-green-800/70 dark:to-green-900/40"
        : isJustEdited
        ? "border-green-500/80 dark:border-green-400/80 shadow-lg shadow-green-500/20 dark:shadow-green-400/20 animate-pulse bg-gradient-to-br from-green-50/90 via-green-100/70 to-green-200/50 dark:from-green-900/90 dark:via-green-800/70 dark:to-green-900/40"
        : "border-border/50 dark:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10"
    }`}>
      {/* Top Half: Image with Overlay Icons */}
      <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp'})`,
          }}
        />
        
        {/* Overlay with Icons and Badges */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        
        {/* Drag Handle - Top Left Corner */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 left-2 z-10 p-3 sm:p-1.5 rounded-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm cursor-grab active:cursor-grabbing hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm touch-manipulation active:scale-95"
            style={{
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" strokeWidth={2} />
          </div>
        )}
        
        <div className={`absolute top-2 ${dragHandleProps ? 'left-12' : 'left-2'} flex items-center gap-1`}>
          {getCategoryIcon(resource.category)}
          {resource.type && getTypeIcon(resource.type)}
        </div>
        
        {/* Action Button in Top Right */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isRemoving ? (
            <span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-600 shadow-sm backdrop-blur-sm">
              <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full mr-2 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Removing</span>
              <span className="sm:hidden">●</span>
            </span>
          ) : (
            <>
              {/* Store context Switch - Replace Add/Remove buttons */}
              {!isBeingEdited && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                >
                  <Switch
                    color="violet"
                    checked={isInTheme}
                    size="2"
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleAddToTheme();
                      } else {
                        handleRemoveFromTheme();
                      }
                    }}
                    disabled={isAdding || isRemovingState}
                  />
                </div>
              )}

              {/* Delete Button */}
              <Button
                size="1"
                variant="ghost"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors backdrop-blur-sm"
                aria-label="Delete product"
              >
                <Trash2 size={14} strokeWidth={2.5} />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Bottom Half: Name and Description */}
      <div className="p-4 space-y-2">
        <Text
          size="3"
          weight="semi-bold"
          className="text-foreground line-clamp-2"
        >
          {resource.name}
        </Text>
        <Text
          size="2"
          color="gray"
          className="text-muted-foreground line-clamp-2"
        >
          {resource.description || resource.link}
        </Text>
        {resource.promoCode && (
          <div className="flex items-center gap-2">
            <Text size="1" color="gray" className="text-muted-foreground">
              Promo:
            </Text>
            <span className="px-2 py-1 rounded text-xs font-mono bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
              {resource.promoCode}
            </span>
          </div>
        )}
      </div>

      {/* Success Notification Popup - Top Right Corner - Portal to Body */}
      {showAddPopup && createPortal(
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300" style={{ zIndex: 99999 }}>
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
            <CheckCircle size={18} className="animate-bounce text-green-100" />
            <div className="flex flex-col">
              <span className="font-semibold">Added to {themeContext.themeName}!</span>
              <span className="text-xs text-green-100">{resource.name}</span>
            </div>
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          </div>
        </div>,
        document.body
      )}

      {/* Remove Notification Popup - Top Right Corner - Portal to Body */}
      {showRemovePopup && createPortal(
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300" style={{ zIndex: 99999 }}>
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-red-600 backdrop-blur-sm">
            <X size={18} className="animate-bounce text-red-100" />
            <div className="flex flex-col">
              <span className="font-semibold">Removed from {themeContext.themeName}!</span>
              <span className="text-xs text-red-100">{resource.name}</span>
            </div>
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};