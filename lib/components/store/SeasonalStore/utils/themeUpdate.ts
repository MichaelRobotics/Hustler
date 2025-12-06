import { updateTheme, createTheme } from '../../../../actions/themes-actions';

interface ThemeUpdate {
  name?: string;
  themePrompt?: string;
  accent?: string;
}

export async function handleUpdateTheme(
  season: string,
  updates: ThemeUpdate,
  themes: any[],
  setAllThemes: (fn: (prev: any) => any) => void,
  setError: (error: string) => void,
  experienceId: string
) {
  try {
    const existingTheme = themes.find((t: any) => t.season === season);
    
    if (existingTheme) {
      await updateTheme(experienceId, existingTheme.id, {
        name: updates.name || existingTheme.name,
        themePrompt: updates.themePrompt,
        accentColor: updates.accent,
        ringColor: updates.accent,
      });
    } else {
      const newTheme = await createTheme(experienceId, {
        name: updates.name || `${season} Custom Theme`,
        season: season,
        themePrompt: updates.themePrompt || '',
        accentColor: updates.accent || 'bg-blue-600',
        ringColor: updates.accent || 'bg-blue-600',
      });
    }
    
    setAllThemes((prev: any) => ({
      ...prev,
      [season]: {
        ...prev[season],
        ...updates,
      },
    }));
  } catch (error) {
    setError(`Failed to update theme: ${(error as Error).message}`);
    throw error;
  }
}

