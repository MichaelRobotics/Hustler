import { useState } from 'react';

interface AIImageState {
  isGeneratingImage: boolean;
  isRefiningImage: boolean;
}

interface AIImageActions {
  handleGenerateImage: (name: string, description: string, onSuccess: (url: string) => void) => Promise<void>;
  handleRefineImage: (name: string, description: string, existingImageUrl: string, onSuccess: (url: string) => void) => Promise<void>;
}

export const useAIImageGeneration = (): AIImageState & AIImageActions => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isRefiningImage, setIsRefiningImage] = useState(false);

  const handleGenerateImage = async (
    name: string, 
    description: string, 
    onSuccess: (url: string) => void
  ) => {
    if (!name || !description) {
      alert('Please enter both name and description before generating an image');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/resources/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          action: 'generate',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.imageUrl);
      } else {
        const errorData = await response.json();
        alert(`Failed to generate image: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRefineImage = async (
    name: string, 
    description: string, 
    existingImageUrl: string, 
    onSuccess: (url: string) => void
  ) => {
    if (!name || !description) {
      alert('Please enter both name and description before refining the image');
      return;
    }

    if (!existingImageUrl) {
      alert('Please upload an image first before refining it');
      return;
    }

    setIsRefiningImage(true);
    try {
      const response = await fetch('/api/resources/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          action: 'refine',
          existingImageUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.imageUrl);
      } else {
        const errorData = await response.json();
        alert(`Failed to refine image: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error refining image:', error);
      alert('Failed to refine image. Please try again.');
    } finally {
      setIsRefiningImage(false);
    }
  };

  return {
    isGeneratingImage,
    isRefiningImage,
    handleGenerateImage,
    handleRefineImage,
  };
};


