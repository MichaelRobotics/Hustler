import { apiGet, apiPost, apiPut } from "@/lib/utils/api-client";

export interface OriginTemplate {
  id: string;
  experienceId: string;
  companyLogoUrl: string | null;
  companyBannerImageUrl: string | null;
  themePrompt: string | null;
  defaultThemeData: {
    background: string | null;
    logo: any;
    themePrompt: string;
    products: any[];
    fixedTextStyles: any;
    floatingAssets?: any[];
    promoButton?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOriginTemplateData {
  companyLogoUrl?: string | null;
  companyBannerImageUrl?: string | null;
  themePrompt?: string | null;
  defaultThemeData: {
    background: string | null;
    logo: any;
    themePrompt: string;
    products: any[];
    fixedTextStyles: any;
    floatingAssets?: any[];
    promoButton?: any;
  };
}

export async function getOriginTemplate(experienceId: string): Promise<OriginTemplate | null> {
  try {
    const response = await apiGet(`/api/origin-templates?experienceId=${experienceId}`, experienceId);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch origin template");
    }
    const data = await response.json();
    return data.originTemplate;
  } catch (error) {
    console.error("Error fetching origin template:", error);
    return null;
  }
}

export async function createOriginTemplate(
  experienceId: string,
  templateData: CreateOriginTemplateData
): Promise<OriginTemplate> {
  const response = await apiPost("/api/origin-templates", templateData, experienceId);
  if (!response.ok) {
    throw new Error("Failed to create origin template");
  }
  const data = await response.json();
  return data.originTemplate;
}

export async function updateOriginTemplate(
  experienceId: string,
  updates: Partial<CreateOriginTemplateData>
): Promise<OriginTemplate> {
  const response = await apiPut(`/api/origin-templates/${experienceId}`, updates, experienceId);
  if (!response.ok) {
    throw new Error("Failed to update origin template");
  }
  const data = await response.json();
  return data.originTemplate;
}


