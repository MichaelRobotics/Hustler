import React, { useState, useEffect } from 'react';
import { Button } from 'frosted-ui';
import { Zap } from 'lucide-react';
import { useFileUpload } from '../../../hooks/useFileUpload';
import { useAIImageGeneration } from '../../../hooks/useAIImageGeneration';
import { useResourceValidation } from '../../../hooks/useResourceValidation';
import { FormFields } from './FormFields';

interface ResourceEditFormProps {
  resource: any;
  onSave: (resource: any) => Promise<void>;
  onCancel: () => void;
  allResources: any[];
  error?: string | null;
  setError: (error: string | null) => void;
  experienceId?: string;
}

export const ResourceEditForm: React.FC<ResourceEditFormProps> = ({
  resource: initialResource,
  onSave,
  onCancel,
  allResources,
  error,
  setError,
  experienceId,
}) => {
  const [editingResource, setEditingResource] = useState(initialResource);
  const [isSaving, setIsSaving] = useState(false);

  const fileUpload = useFileUpload();
  const aiImage = useAIImageGeneration();
  const validation = useResourceValidation();

  // Scroll to form when component mounts
  useEffect(() => {
    const editForm = document.querySelector('[data-edit-form]');
    if (editForm) {
      editForm.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  const handleSave = async () => {
    console.log('🔍 ResourceEditForm: handleSave called');
    console.log('🔍 ResourceEditForm: isSaving:', isSaving);
    console.log('🔍 ResourceEditForm: onSave function:', onSave);
    console.log('🔍 ResourceEditForm: editingResource:', editingResource);
    
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('⚠️ ResourceEditForm: Already saving, ignoring duplicate call');
      return;
    }
    
    const validationResult = validation.validateResource(editingResource, allResources, editingResource.id);
    
    if (!validationResult.isValid) {
      console.log('❌ ResourceEditForm: Validation failed:', validationResult.errors);
      setError(validationResult.errors[0]);
      return;
    }

    setIsSaving(true);
    try {
      console.log('🔍 ResourceEditForm: About to save resource:', editingResource);
      await onSave(editingResource);
      console.log('✅ ResourceEditForm: Save completed successfully');
    } catch (error) {
      console.error("❌ ResourceEditForm: Failed to update product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Add delay before hiding form (matches mobile keyboard close animation)
    setTimeout(() => {
      onCancel();
    }, 250);
  };

  const handleImageUpload = (file: File) => {
    fileUpload.handleImageUpload(file, (url: string) => {
      // Always set as main image (thumbnail)
      setEditingResource((prev: any) => ({ ...prev, image: url }));
    });
  };

  const handleAssetUpload = (file: File) => {
    fileUpload.handleAssetUpload(file, (url: string) => {
      setEditingResource((prev: any) => ({ ...prev, storageUrl: url }));
    });
  };

  const handleGenerateImage = () => {
    aiImage.handleGenerateImage(
      editingResource.name,
      editingResource.description,
      (url: string) => setEditingResource((prev: any) => ({ ...prev, image: url }))
    );
  };


  const handleImageDrop = (e: React.DragEvent) => {
    fileUpload.handleImageDrop(e, (url: string) => {
      setEditingResource((prev: any) => ({ ...prev, image: url }));
    });
  };

  const handleAssetDrop = (e: React.DragEvent) => {
    fileUpload.handleAssetDrop(e, (url: string) => {
      setEditingResource((prev: any) => ({ ...prev, storageUrl: url }));
    });
  };

  const isFormValid = () => {
    const validationResult = validation.validateResource(editingResource, allResources, editingResource.id);
    return validationResult.isValid;
  };

  return (
    <div data-edit-form className="group bg-gradient-to-br from-blue-50/80 via-blue-100/60 to-gray-200/40 dark:from-blue-900/80 dark:via-gray-800/60 dark:to-gray-900/30 p-4 rounded-xl border-2 border-blue-500/60 dark:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-400 rounded-full animate-pulse" />
          {(() => {
            const inferredType = editingResource.storageUrl && !editingResource.link ? "FILE" : "LINK";
            return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {inferredType === "LINK" ? "Link" : "File"}
          </span>
            );
          })()}
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              editingResource.category === "PAID"
                ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                : "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
            }`}
          >
            {editingResource.category === "PAID" ? "Paid" : "Gift"}
          </span>
        </div>
          <button
            onClick={handleCancel}
            disabled={isSaving}
          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
          Close
          </button>
      </div>

      {/* Two-column layout: Image on left, Form on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
        {/* Left Column: Image Upload */}
        <div className="space-y-2 flex flex-col">
          <div
            onDragOver={fileUpload.handleImageDragOver}
            onDragLeave={fileUpload.handleImageDragLeave}
            onDrop={handleImageDrop}
            className={`relative border-2 border-solid rounded-xl text-center transition-all duration-200 flex items-center justify-center overflow-hidden aspect-[320/224] w-full group ${
              fileUpload.isDragOverImage
                ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-300 dark:ring-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-800 p-8"
                : fileUpload.isUploadingImage
                ? "border-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700 p-8"
                : editingResource.image
                ? "border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-300 dark:ring-green-700 shadow-lg shadow-green-200 dark:shadow-green-800 p-0"
                : "border-gray-500 dark:border-gray-400 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-800 p-8"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              disabled={isSaving || fileUpload.isUploadingImage}
              className="hidden"
              id="edit-image-upload"
            />
            
            {fileUpload.isUploadingImage ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-sm text-blue-600 dark:text-blue-400">Uploading image...</span>
              </div>
            ) : editingResource.image ? (
              <div className="relative w-full h-full">
                <div 
                  className={`relative w-full h-full overflow-hidden ${
                    aiImage.isGeneratingImage ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  onClick={aiImage.isGeneratingImage ? undefined : () => document.getElementById('edit-image-upload')?.click()}
                  title={aiImage.isGeneratingImage ? "AI processing..." : "Click to change image"}
                >
                  <img
                    src={editingResource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp'}
                    alt="Product preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-200 ${
                    aiImage.isGeneratingImage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {aiImage.isGeneratingImage ? (
                      <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="bg-violet-500/90 text-white p-2 rounded-md">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Generate Image Button - Hover show effect */}
                {!aiImage.isGeneratingImage && (
                  <Button
                    size="3"
                    color="green"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateImage();
                      }}
                      disabled={!editingResource.name || !editingResource.description}
                    className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group"
                    title="Generate Image"
                    >
                    <Zap
                      size={20}
                      strokeWidth={2.5}
                      className="group-hover:scale-110 transition-transform duration-300"
                    />
                    <span className="ml-1">Generate Image</span>
                  </Button>
                )}
              </div>
            ) : aiImage.isGeneratingImage ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="edit-image-upload"
                    className="font-medium cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    Drag & drop an image here
                  </label>
                </div>
                
                {/* Generate Image Button - Corner position in empty state */}
                {!aiImage.isGeneratingImage && (
                  <Button
                    size="3"
                    color="green"
                    onClick={handleGenerateImage}
                    disabled={!editingResource.name || !editingResource.description}
                    className="absolute top-2 right-2 z-30 px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group"
                    title="Generate Image"
                  >
                    <Zap
                      size={20}
                      strokeWidth={2.5}
                      className="group-hover:scale-110 transition-transform duration-300"
                    />
                    <span className="ml-1">Generate Image</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Form Fields */}
        <div className="flex flex-col h-full min-h-[320px]">
        <FormFields
          resource={editingResource}
          setResource={setEditingResource}
          isSaving={isSaving}
          isSingleFunnel={false}
          error={error}
          onImageUpload={handleImageUpload}
          onAssetUpload={handleAssetUpload}
          onGenerateImage={handleGenerateImage}
          isUploadingImage={fileUpload.isUploadingImage}
          isDragOverImage={fileUpload.isDragOverImage}
          isUploadingAsset={fileUpload.isUploadingAsset}
          isDragOverAsset={fileUpload.isDragOverAsset}
          isGeneratingImage={aiImage.isGeneratingImage}
          onImageDragOver={fileUpload.handleImageDragOver}
          onImageDragLeave={fileUpload.handleImageDragLeave}
          onImageDrop={handleImageDrop}
          onAssetDragOver={fileUpload.handleAssetDragOver}
          onAssetDragLeave={fileUpload.handleAssetDragLeave}
          onAssetDrop={handleAssetDrop}
          isCreating={false}
          onSave={handleSave}
          isFormValid={isFormValid()}
          saveButtonText={isSaving ? "Saving..." : "Update"}
          experienceId={experienceId}
        />
        </div>
      </div>
    </div>
  );
};
