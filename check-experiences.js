const { db } = require('./lib/supabase/db-server');
const { experiences } = require('./lib/supabase/schema');
const { eq } = require('drizzle-orm');

async function checkExperiences() {
  try {
    console.log('Checking experiences in database...');
    
    const allExperiences = await db.query.experiences.findMany({
      columns: {
        id: true,
        whopExperienceId: true,
      }
    });
    
    console.log('Found experiences:', allExperiences);
    
    // Check for the specific experience ID
    const specificExp = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, 'exp_wl5EtbHqAqLdjV'),
      columns: {
        id: true,
        whopExperienceId: true,
      }
    });
    
    console.log('Specific experience exp_wl5EtbHqAqLdjV:', specificExp);
    
  } catch (error) {
    console.error('Error checking experiences:', error);
  }
}

checkExperiences();
