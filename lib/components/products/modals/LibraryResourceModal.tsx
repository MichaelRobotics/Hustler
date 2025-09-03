import React from 'react';
import { X, Plus } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import { ResourceFormData } from '../../../types/resource';

interface LibraryResourceModalProps {
  isOpen: boolean;
  resource: Partial<ResourceFormData>;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (resource: Partial<ResourceFormData>) => void;
  isNameAvailable: (name: string, currentId?: string) => boolean;
  context: 'global' | 'funnel';
}

export const LibraryResourceModal: React.FC<LibraryResourceModalProps> = ({
  isOpen,
  resource,
  onClose,
  onSubmit,
  onChange,
  isNameAvailable,
  context
}) => {
  if (!isOpen) return null;

  const handleInputChange = (field: keyof ResourceFormData, value: string) => {
    onChange({ ...resource, [field]: value });
  };

  const isFormValid = resource.name && 
    resource.link && 
    isNameAvailable(resource.name, resource.id);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm dark:shadow-black/60 max-w-lg w-full p-6 sm:p-8 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-6">
          <Heading size="4" weight="bold" className="text-foreground">
            {context === 'global' && resource.name ? 'Edit Product' : 'Add New Product'}
          </Heading>
          <Button
            size="1"
            variant="ghost"
            color="gray"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
          >
            <X size={16} strokeWidth={2.5} />
          </Button>
        </div>
        
        <div className="space-y-5">
          <div>
            <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
              Resource Name
            </Text>
            <input
              type="text"
              value={resource.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter resource name..."
              className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                resource.name && !isNameAvailable(resource.name, resource.id) 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' 
                  : 'border-gray-300'
              }`}
            />
            {resource.name && !isNameAvailable(resource.name, resource.id) && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                This name is already taken. Please choose a different one.
              </div>
            )}
          </div>
          
          <div>
            <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
              Link/URL
            </Text>
            <input
              type="url"
              value={resource.link || ''}
              onChange={(e) => handleInputChange('link', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
            />
          </div>
          
          <div>
            <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
              Promo Code (Optional)
            </Text>
            <input
              type="text"
              value={resource.promoCode || ''}
              onChange={(e) => handleInputChange('promoCode', e.target.value)}
              placeholder="Enter promo code..."
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
            />
          </div>
          
          <div>
            <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
              Type
            </Text>
            <select
              value={resource.type || 'AFFILIATE'}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
            >
              <option value="AFFILIATE">Affiliate Resource</option>
              <option value="MY_PRODUCTS">My Product</option>
            </select>
          </div>
          
          <div>
            <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
              Category
            </Text>
            <select
              value={resource.price || 'FREE_VALUE'}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
            >
              <option value="FREE_VALUE">Free Value</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          
          <div className="flex gap-3 pt-6">
            <Button 
              color="violet" 
              onClick={onSubmit}
              disabled={!isFormValid}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:shadow-violet-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Plus size={18} strokeWidth={2.5} className="mr-2" />
              {resource.id ? 'Update Product' : 'Add Product'}
            </Button>
            <Button 
              variant="soft" 
              color="gray"
              onClick={onClose}
              className="px-6 py-3 hover:scale-105 transition-all duration-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
