// Simple test to check database connection and conversation existence
import { db } from './lib/supabase/db-server.js';
import { conversations, experiences, messages } from './lib/supabase/schema.js';
import { eq, and } from 'drizzle-orm';

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check if we can query experiences
    console.log('\n1. Checking experiences...');
    const allExperiences = await db.query.experiences.findMany();
    console.log('Found experiences:', allExperiences.length);
    allExperiences.forEach(exp => {
      console.log(`  - ${exp.whopExperienceId} (${exp.name})`);
    });
    
    // Test 2: Look for specific experience
    const targetExperienceId = 'exp_wl5EtbHqAqLdjV';
    console.log(`\n2. Looking for experience: ${targetExperienceId}`);
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, targetExperienceId),
    });
    
    if (experience) {
      console.log('Found experience:', experience);
      
      // Test 3: Check conversations for this experience
      console.log(`\n3. Checking conversations for experience ${experience.id}...`);
      const expConversations = await db.query.conversations.findMany({
        where: eq(conversations.experienceId, experience.id),
        with: {
          messages: true
        }
      });
      
      console.log(`Found ${expConversations.length} conversations:`);
      expConversations.forEach(conv => {
        console.log(`  - ${conv.id} (${conv.status}) - ${conv.messages.length} messages`);
      });
      
    } else {
      console.log('Experience not found!');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

testDatabase();
