import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db-server';
import { templates } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const templatesList = await db.select().from(templates);
    return NextResponse.json({ templates: templatesList });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, experienceId, userId, themeId, theme, currentSeason, templateData, isLive, isLastEdited } = body;
    
    const newTemplate = await db.insert(templates).values({
      experienceId: experienceId || '4969a696-3708-40f2-a716-662dbdcd4cf8',
      userId: userId || '7707d022-ce9d-4d9d-85d9-6993ce69512e',
      name,
      themeId,
      themeSnapshot: theme,
      currentSeason,
      templateData,
      isLive: isLive || false,
      isLastEdited: isLastEdited || false
    }).returning();
    
    return NextResponse.json(newTemplate[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
