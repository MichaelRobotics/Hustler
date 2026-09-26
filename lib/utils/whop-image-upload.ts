/**
 * Utility functions for automatically uploading images to WHOP storage
 */

export interface UploadedImage {
  attachmentId: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * Upload a base64 image to WHOP storage
 */
export async function uploadBase64ToWhop(
  base64Data: string,
  filename: string = `image-${Date.now()}.png`
): Promise<UploadedImage> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // Create a file from the blob
    const file = new File([blob], filename, { type: blob.type });
    
    // Upload to WHOP storage
    return await uploadFileToWhop(file);
  } catch (error) {
    console.error('Error uploading base64 to WHOP:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a file to WHOP storage
 */
export async function uploadFileToWhop(file: File): Promise<UploadedImage> {
  try {
    // Check if we're in a server context (API route) or client context
    const isServerContext = typeof window === 'undefined';
    
    if (isServerContext) {
      // Server context: Use WHOP SDK directly
      console.log('🔍 Server context: Using WHOP SDK directly...');
      
      const { uploadPublicWhopFile } = await import('./whop-file-upload');
      const uploaded = await uploadPublicWhopFile(file);

      console.log("🔍 Image uploaded successfully:", {
        attachmentId: uploaded.attachmentId,
        url: uploaded.url
      });

      return uploaded;
    } else {
      // Client context: Use API route
      console.log('🔍 Client context: Uploading file to WHOP via API route...');
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-to-whop', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      console.log("🔍 Image uploaded successfully:", {
        attachmentId: data.attachmentId,
        url: data.url
      });

      return {
        attachmentId: data.attachmentId,
        url: data.url,
        filename: data.filename,
        size: data.size,
        type: data.type,
      };
    }
  } catch (error) {
    console.error('Error uploading file to WHOP:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a URL-based image to WHOP storage
 */
export async function uploadUrlToWhop(
  imageUrl: string,
  filename: string = `image-${Date.now()}.png`
): Promise<UploadedImage> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });
    
    return await uploadFileToWhop(file);
  } catch (error) {
    console.error('Error uploading URL to WHOP:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
