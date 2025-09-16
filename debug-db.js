import { db } from './lib/supabase/db-server.js';
import { experiences, conversations, messages } from './lib/supabase/schema.js';
import { eq, and } from 'drizzle-orm';

async function debugDatabase() {
  try {
    console.log('=== DEBUGGING DATABASE ===');
    
    // 1. Check all experiences
    console.log('\n1. All experiences:');
    const allExperiences = await db.query.experiences.findMany();
    console.log(allExperiences.map(exp => ({
      id: exp.id,
      whopExperienceId: exp.whopExperienceId,
      name: exp.name
    })));
    
    // 2. Check for specific experience
    const targetWhopId = 'exp_wl5EtbHqAqLdjV';
    console.log(`\n2. Looking for experience with whopExperienceId: ${targetWhopId}`);
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, targetWhopId),
    });
    
    if (experience) {
      console.log('Found experience:', experience);
      
      // 3. Check conversations for this experience
      console.log(`\n3. Conversations for experience ${experience.id}:`);
      const expConversations = await db.query.conversations.findMany({
        where: eq(conversations.experienceId, experience.id),
        with: {
          messages: true
        }
      });
      console.log(expConversations.map(conv => ({
        id: conv.id,
        whopUserId: conv.whopUserId,
        status: conv.status,
        currentBlockId: conv.currentBlockId,
        messageCount: conv.messages?.length || 0
      })));
      
      // 4. Check recent messages
      console.log(`\n4. Recent messages for experience ${experience.id}:`);
      const recentMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.conversationId, expConversations[0]?.id || ''),
        ),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        limit: 5
      });
      console.log(recentMessages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content.substring(0, 50) + '...',
        createdAt: msg.createdAt
      })));
      
    } else {
      console.log('Experience not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDatabase();
