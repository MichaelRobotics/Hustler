import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db-server';
import { themes } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const themesList = await db.select().from(themes);
    return NextResponse.json({ themes: themesList });
  } catch (error) {
    console.error('Error fetching themes:', error);
    return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, season, themePrompt, accentColor, ringColor } = body;
    
    const newTheme = await db.insert(themes).values({
      experienceId: 'dev-experience-id',
      name,
      season,
      themePrompt,
      accentColor,
      ringColor
    }).returning();
    
    return NextResponse.json(newTheme[0]);
  } catch (error) {
    console.error('Error creating theme:', error);
    return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
  }
}
