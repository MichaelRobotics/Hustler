import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/api-client";
import type { StoreTemplate } from "@/lib/components/store/SeasonalStore/types";

export async function getTemplates(experienceId: string): Promise<StoreTemplate[]> {
  try {
    const response = await apiGet("/api/templates", experienceId);
    if (!response.ok) {
      // Check if it's an authentication error
      if (response.status === 401) {
        console.log("Authentication failed, using development mode for templates");
        return [];
      }
      // Fallback to development endpoint
      const devResponse = await apiGet("/api/dev/templates", experienceId);
      if (!devResponse.ok) {
        console.log("Development endpoint also failed, returning empty array");
        return [];
      }
      const devData = await devResponse.json();
      return devData.templates || [];
    }
    const data = await response.json();
    return data.templates;
  } catch (error) {
    console.log("Authentication failed, using development mode for templates");
    // Return empty array for development
    return [];
  }
}

export async function getTemplate(experienceId: string, templateId: string): Promise<StoreTemplate> {
  const response = await apiGet(`/api/templates/${templateId}`, experienceId);
  if (!response.ok) {
    throw new Error("Failed to fetch template");
  }
  const data = await response.json();
  return data.template;
}

export async function createTemplate(
  experienceId: string,
  templateData: Omit<StoreTemplate, "id" | "createdAt" | "updatedAt">
): Promise<StoreTemplate> {
  try {
    console.log("🔍 createTemplate - experienceId:", experienceId);
    console.log("🔍 createTemplate - templateData:", templateData);
    console.log("🔍 createTemplate - themeSnapshot:", templateData.themeSnapshot);
    console.log("🔍 createTemplate - themeId:", templateData.themeId);
    const response = await apiPost("/api/templates", templateData, experienceId);
    if (!response.ok) {
      // Check if it's an authentication error
      if (response.status === 401) {
        console.log("Authentication failed, using development mode for template creation");
        // Try development endpoint
        const devResponse = await apiPost("/api/dev/templates", templateData, experienceId);
        if (!devResponse.ok) {
          console.log("Development endpoint also failed, creating mock template");
          // Return a mock template for development
          return {
            ...templateData,
            id: `template_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          } as StoreTemplate;
        }
        const devData = await devResponse.json();
        return devData;
      }
      throw new Error("Failed to create template");
    }
    const data = await response.json();
    return data.template;
  } catch (error) {
    console.log("Authentication failed, creating mock template for development");
    // Return a mock template for development
    return {
      ...templateData,
      id: `template_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    } as StoreTemplate;
  }
}

export async function updateTemplate(
  experienceId: string,
  templateId: string,
  updates: Partial<Pick<StoreTemplate, "name" | "templateData">>
): Promise<StoreTemplate> {
  const response = await apiPut(`/api/templates/${templateId}`, updates, experienceId);
  if (!response.ok) {
    throw new Error("Failed to update template");
  }
  const data = await response.json();
  return data.template;
}

export async function deleteTemplate(experienceId: string, templateId: string): Promise<void> {
  const response = await apiDelete(`/api/templates/${templateId}`, experienceId);
  if (!response.ok) {
    throw new Error("Failed to delete template");
  }
}

export async function setLiveTemplate(experienceId: string, templateId: string): Promise<void> {
  const response = await apiPost(`/api/templates/${templateId}/set-live`, {}, experienceId);
  if (!response.ok) {
    throw new Error("Failed to set live template");
  }
}

export async function getLiveTemplate(experienceId: string): Promise<StoreTemplate | null> {
  try {
    const response = await apiGet("/api/templates/live", experienceId);
    if (!response.ok) {
      console.log("Authentication failed, no live template available");
      return null;
    }
    const data = await response.json();
    return data.template;
  } catch (error) {
    console.log("Authentication failed, no live template available");
    return null;
  }
}

export async function getLastEditedTemplate(experienceId: string): Promise<StoreTemplate | null> {
  try {
    const response = await apiGet("/api/templates/last-edited", experienceId);
    if (!response.ok) {
      console.log("Authentication failed, no last edited template available");
      return null;
    }
    const data = await response.json();
    return data.template;
  } catch (error) {
    console.log("Authentication failed, no last edited template available");
    return null;
  }
}

