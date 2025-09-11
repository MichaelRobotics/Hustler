const { whopSdk } = require('./lib/whop-sdk.ts');

async function testWhopAccess() {
  try {
    console.log('🔍 Testing WHOP Access Check');
    console.log('=====================================');
    
    const experienceId = 'exp_wl5EtbHqAqLdjV';
    console.log('Experience ID:', experienceId);
    
    // Test 1: Check if we can get experience info
    console.log('\n1️⃣ Getting experience info...');
    try {
      const experience = await whopSdk.experiences.getExperience({ experienceId });
      console.log('✅ Experience found:', {
        id: experience.id,
        name: experience.name,
        companyId: experience.company.id
      });
    } catch (error) {
      console.log('❌ Error getting experience:', error.message);
    }
    
    // Test 2: List all experiences to see what's available
    console.log('\n2️⃣ Listing all experiences...');
    try {
      const experiences = await whopSdk.experiences.listExperiences();
      console.log('✅ Found experiences:', experiences.map(exp => ({
        id: exp.id,
        name: exp.name,
        companyId: exp.company.id
      })));
    } catch (error) {
      console.log('❌ Error listing experiences:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWhopAccess();

