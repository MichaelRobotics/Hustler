import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, users, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { whopUserId, experienceId } = await request.json();

    if (!whopUserId || !experienceId) {
      return NextResponse.json(
        { success: false, error: "Whop User ID and Experience ID are required" },
        { status: 400 }
      );
    }

    console.log(`Finding conversation for user ${whopUserId} in experience ${experienceId}`);

    // First, find the internal experience ID from the experiences table
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.log(`No experience found for whopExperienceId ${experienceId}`);
      return NextResponse.json({
        success: true,
        conversation: null,
        funnelFlow: null,
        message: "No experience found for this ID"
      });
    }

    console.log(`Found experience ${experience.id} for whopExperienceId ${experienceId}`);

    // Find active conversation directly using whopUserId (faster lookup)
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.whopUserId, whopUserId),
        eq(conversations.experienceId, experience.id),
        eq(conversations.status, "active")
      ),
      with: {
        funnel: true,
        messages: {
          orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
        },
        funnelInteractions: {
          orderBy: (funnelInteractions: any, { asc }: any) => [asc(funnelInteractions.createdAt)],
        },
      },
    });

    if (!conversation) {
      console.log(`No active conversation found for whopUserId ${whopUserId} in experience ${experienceId}`);
      return NextResponse.json({
        success: true,
        conversation: null,
        funnelFlow: null,
        message: "No active conversation found"
      });
    }

    // Load funnel flow if available
    let funnelFlow = null;
    if (conversation.funnel?.flow) {
      funnelFlow = conversation.funnel.flow;
    }

    console.log(`Found conversation ${conversation.id} for whopUserId ${whopUserId}`);

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        messages: conversation.messages || [],
        funnelInteractions: conversation.funnelInteractions || [],
      },
      funnelFlow,
      user: {
        whopUserId: whopUserId,
        // Note: User details can be fetched from Whop API if needed
      }
    });

  } catch (error) {
    console.error("Error finding user conversation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
