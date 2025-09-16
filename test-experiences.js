const { db } = require('./lib/supabase/db-server');
const { experiences } = require('./lib/supabase/schema');
const { eq } = require('drizzle-orm');

async function testExperiences() {
  try {
    console.log('Checking all experiences in database...');
    
    const allExperiences = await db.query.experiences.findMany();
    console.log('All experiences:', allExperiences.map(exp => ({
      id: exp.id,
      whopExperienceId: exp.whopExperienceId,
      name: exp.name
    })));
    
    const targetExperienceId = 'exp_wl5EtbHqAqLdjV';
    console.log(`\nLooking for experience with whopExperienceId: ${targetExperienceId}`);
    
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, targetExperienceId),
    });
    
    if (experience) {
      console.log('Found experience:', experience);
    } else {
      console.log('Experience not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testExperiences();
