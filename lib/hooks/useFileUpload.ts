import { useState } from 'react';

interface FileUploadState {
  isUploadingImage: boolean;
  isDragOverImage: boolean;
  isUploadingAsset: boolean;
  isDragOverAsset: boolean;
}

interface FileUploadActions {
  handleImageUpload: (file: File, onSuccess: (url: string) => void) => Promise<void>;
  handleAssetUpload: (file: File, onSuccess: (url: string) => void) => Promise<void>;
  handleImageDragOver: (e: React.DragEvent) => void;
  handleImageDragLeave: (e: React.DragEvent) => void;
  handleImageDrop: (e: React.DragEvent, onSuccess: (url: string) => void) => void;
  handleAssetDragOver: (e: React.DragEvent) => void;
  handleAssetDragLeave: (e: React.DragEvent) => void;
  handleAssetDrop: (e: React.DragEvent, onSuccess: (url: string) => void) => void;
}

export const useFileUpload = (): FileUploadState & FileUploadActions => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOverImage, setIsDragOverImage] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isDragOverAsset, setIsDragOverAsset] = useState(false);

  const handleImageUpload = async (file: File, onSuccess: (url: string) => void) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        onSuccess(result.url);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAssetUpload = async (file: File, onSuccess: (url: string) => void) => {
    setIsUploadingAsset(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        onSuccess(result.url);
      }
    } catch (error) {
      console.error('Asset upload failed:', error);
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverImage(true);
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverImage(false);
  };

  const handleImageDrop = (e: React.DragEvent, onSuccess: (url: string) => void) => {
    e.preventDefault();
    setIsDragOverImage(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleImageUpload(imageFile, onSuccess);
    }
  };

  const handleAssetDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverAsset(true);
  };

  const handleAssetDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverAsset(false);
  };

  const handleAssetDrop = (e: React.DragEvent, onSuccess: (url: string) => void) => {
    e.preventDefault();
    setIsDragOverAsset(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleAssetUpload(files[0], onSuccess);
    }
  };

  return {
    isUploadingImage,
    isDragOverImage,
    isUploadingAsset,
    isDragOverAsset,
    handleImageUpload,
    handleAssetUpload,
    handleImageDragOver,
    handleImageDragLeave,
    handleImageDrop,
    handleAssetDragOver,
    handleAssetDragLeave,
    handleAssetDrop,
  };
};


