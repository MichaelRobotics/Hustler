import React from 'react';
import { CheckCircle, Upload } from 'lucide-react';

interface FormFieldsProps {
  resource: any;
  setResource: (resource: any) => void;
  isSaving: boolean;
  isSingleFunnel?: boolean;
  error?: string | null;
  onImageUpload: (file: File) => void;
  onAssetUpload: (file: File) => void;
  onGenerateImage: () => void;
  onRefineImage: () => void;
  isUploadingImage: boolean;
  isDragOverImage: boolean;
  isUploadingAsset: boolean;
  isDragOverAsset: boolean;
  isGeneratingImage: boolean;
  isRefiningImage: boolean;
  onImageDragOver: (e: React.DragEvent) => void;
  onImageDragLeave: (e: React.DragEvent) => void;
  onImageDrop: (e: React.DragEvent) => void;
  onAssetDragOver: (e: React.DragEvent) => void;
  onAssetDragLeave: (e: React.DragEvent) => void;
  onAssetDrop: (e: React.DragEvent) => void;
}

export const FormFields: React.FC<FormFieldsProps> = ({
  resource,
  setResource,
  isSaving,
  isSingleFunnel = false,
  error,
  onImageUpload,
  onAssetUpload,
  onGenerateImage,
  onRefineImage,
  isUploadingImage,
  isDragOverImage,
  isUploadingAsset,
  isDragOverAsset,
  isGeneratingImage,
  isRefiningImage,
  onImageDragOver,
  onImageDragLeave,
  onImageDrop,
  onAssetDragOver,
  onAssetDragLeave,
  onAssetDrop,
}) => {
  const getFieldClassName = (hasError = false) => {
    const baseClasses = "w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    if (hasError) {
      return `${baseClasses} border-red-500 focus:border-red-500 focus:ring-red-500/50`;
    }
    
    if (isSingleFunnel) {
      return `${baseClasses} border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400`;
    }
    
    return `${baseClasses} border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800`;
  };

  return (
    <div className="space-y-3">
      {/* Type and Category Selectors */}
      <div className="flex gap-2">
        <select
          value={resource.type || "MY_PRODUCTS"}
          onChange={(e) =>
            setResource({
              ...resource,
              type: e.target.value as "AFFILIATE" | "MY_PRODUCTS",
            })
          }
          disabled={isSaving}
          className="flex-1 px-3 py-2 text-sm border-2 border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="AFFILIATE">Affiliate</option>
          <option value="MY_PRODUCTS">Owned</option>
        </select>
        <select
          value={resource.category || "FREE_VALUE"}
          onChange={(e) =>
            setResource({
              ...resource,
              category: e.target.value as "PAID" | "FREE_VALUE",
            })
          }
          disabled={isSaving}
          className={getFieldClassName()}
        >
          <option value="FREE_VALUE" className="bg-white dark:bg-black text-gray-900 dark:text-white">Gift</option>
          <option value="PAID" className="bg-white dark:bg-black text-gray-900 dark:text-white">Paid</option>
        </select>
      </div>

      {/* Name Field */}
      <input
        type="text"
        value={resource.name || ""}
        onChange={(e) => setResource({ ...resource, name: e.target.value })}
        placeholder={isSingleFunnel ? "Digital Asset name" : "Digital Asset name"}
        disabled={isSaving}
        className={getFieldClassName()}
        autoFocus
      />

      {/* Price Field - Only for Paid products */}
      {resource.category === "PAID" && (
        <div className="space-y-1">
          <input
            type="text"
            value={resource.price || ""}
            onChange={(e) => setResource({ ...resource, price: e.target.value })}
            placeholder="$0.00"
            disabled={isSaving}
            className={getFieldClassName()}
          />
          {(() => {
            const price = parseFloat(resource.price || "0");
            const isValidPrice = price >= 5 && price <= 50000;
            const hasPrice = resource.price && resource.price.trim() !== "";
            
            if (hasPrice && !isValidPrice) {
              return (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Price must be between $5 and $50,000
                </p>
              );
            }
            
            return (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                *Only whop fees will be deducted
              </p>
            );
          })()}
        </div>
      )}

      {/* URL Field - For Affiliate products and actual Whop products */}
      {(resource.type === "AFFILIATE" || (resource.type === "MY_PRODUCTS" && resource.whopProductId)) && (
        <input
          type="url"
          value={resource.link || ""}
          onChange={(e) => setResource({ ...resource, link: e.target.value })}
          placeholder={resource.type === "AFFILIATE" ? "Affiliate URL" : "Product link"}
          disabled={isSaving}
          className={getFieldClassName()}
        />
      )}

      {/* Description Field */}
      <textarea
        value={resource.description || ""}
        onChange={(e) => setResource({ ...resource, description: e.target.value })}
        placeholder="Product description (optional)..."
        disabled={isSaving}
        rows={3}
        className={`${getFieldClassName()} resize-none`}
      />

      {/* Digital Asset Upload - Only for Owned products that are NOT actual Whop products */}
      {resource.type === "MY_PRODUCTS" && !resource.whopProductId && (
        <div className="space-y-2">
          <div
            onDragOver={onAssetDragOver}
            onDragLeave={onAssetDragLeave}
            onDrop={onAssetDrop}
            className={`relative border-2 border-solid rounded-xl p-4 text-center transition-all duration-200 h-24 flex items-center justify-center ${
              isDragOverAsset
                ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-300 dark:ring-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-800"
                : isUploadingAsset
                ? "border-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700"
                : resource.storageUrl
                ? "border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-300 dark:ring-green-700 shadow-lg shadow-green-200 dark:shadow-green-800"
                : "border-gray-500 dark:border-gray-400 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-800"
            }`}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.zip"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAssetUpload(file);
              }}
              disabled={isSaving || isUploadingAsset}
              className="hidden"
              id="asset-upload"
            />
            
            {isUploadingAsset ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-sm text-blue-600 dark:text-blue-400">Uploading...</span>
              </div>
            ) : resource.storageUrl ? (
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => document.getElementById('asset-upload')?.click()}
                title="Click to change asset"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div className="flex flex-col">
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {resource.storageUrl.split('/').pop() || 'File uploaded'}
                    </span>
                  </div>
                </div>
                <div className="bg-violet-500/90 text-white p-1.5 rounded-md ml-auto">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Drop file here</span>
                  <span className="text-xs ml-2">or</span>
                  <label
                    htmlFor="asset-upload"
                    className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer ml-1"
                  >
                    browse
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promo Code Field - Only for Paid products */}
      {resource.category === "PAID" && (
        <input
          type="text"
          value={resource.promoCode || ""}
          onChange={(e) => setResource({ ...resource, promoCode: e.target.value })}
          placeholder="Promo code (optional)..."
          disabled={isSaving}
          className={getFieldClassName()}
        />
      )}
    </div>
  );
};


