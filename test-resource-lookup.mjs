/**
 * Test script to check if we can lookup resources by resourceName
 * and get the link field value for OFFER stage messages
 */

import { db } from "./lib/supabase/db-server.js";
import { resources, experiences } from "./lib/supabase/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Lookup resource by resourceName and experienceId
 */
async function lookupResourceByName(resourceName, experienceId) {
  try {
    console.log(`🔍 Looking up resource: "${resourceName}" for experience: ${experienceId}`);
    
    // First, find the database UUID for this Whop experience ID
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.log(`❌ Experience not found for Whop ID: ${experienceId}`);
      return null;
    }

    console.log(`✅ Found experience: ${experience.id} (${experience.whopExperienceId})`);

    // Search for resource by name and experience
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.name, resourceName),
        eq(resources.experienceId, experience.id)
      ),
    });

    if (resource) {
      console.log(`✅ Found resource:`, {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        category: resource.category,
        link: resource.link,
        experienceId: resource.experienceId
      });
      return resource;
    } else {
      console.log(`❌ Resource not found: "${resourceName}"`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error looking up resource:`, error);
    return null;
  }
}

/**
 * Test the resource lookup with sample data
 */
async function testResourceLookup() {
  console.log("🧪 Testing resource lookup by resourceName...\n");

  // Test with a sample experience ID (you can replace this with a real one)
  const testExperienceId = "exp_usZvasHX5n7iYM"; // Replace with actual experience ID
  const testResourceNames = [
    "Crypto Risk Management Workshop",
    "Advanced Trading Mastery Course", 
    "Free Trading Guide",
    "Non-existent Resource"
  ];

  for (const resourceName of testResourceNames) {
    console.log(`\n📦 Testing resource: "${resourceName}"`);
    console.log("=" * 50);
    
    const resource = await lookupResourceByName(resourceName, testExperienceId);
    
    if (resource) {
      console.log(`✅ SUCCESS: Found resource with link: ${resource.link}`);
    } else {
      console.log(`❌ FAILED: Resource not found`);
    }
  }
}

/**
 * Test the complete flow: extract resourceName from OFFER block and lookup resource
 */
async function testCompleteFlow() {
  console.log("\n🎯 Testing complete flow: OFFER block → resourceName → resource lookup\n");

  // Mock OFFER block data
  const offerBlock = {
    id: "offer_risk_management",
    message: "Perfect! Our Risk Management Workshop is exactly what you need.\n\nYou'll learn proven strategies to protect your capital.\n\n[LINK]",
    resourceName: "Crypto Risk Management Workshop",
    options: []
  };

  const experienceId = "exp_usZvasHX5n7iYM"; // Replace with actual experience ID

  console.log(`📦 OFFER Block: ${offerBlock.id}`);
  console.log(`📝 Message: ${offerBlock.message.substring(0, 100)}...`);
  console.log(`🏷️  Resource Name: ${offerBlock.resourceName}`);
  
  // Extract resourceName (this is what we would do before sending the bot message)
  const resourceName = offerBlock.resourceName;
  
  if (resourceName) {
    console.log(`\n🔍 Looking up resource with name: "${resourceName}"`);
    const resource = await lookupResourceByName(resourceName, experienceId);
    
    if (resource) {
      console.log(`\n✅ COMPLETE FLOW SUCCESS:`);
      console.log(`   - Extracted resourceName: "${resourceName}"`);
      console.log(`   - Found resource link: ${resource.link}`);
      console.log(`   - Resource type: ${resource.type}`);
      console.log(`   - Resource category: ${resource.category}`);
      
      // This is what we would use to replace [LINK] in the message
      const messageWithLink = offerBlock.message.replace('[LINK]', resource.link);
      console.log(`\n📝 Final message with link:`);
      console.log(messageWithLink);
    } else {
      console.log(`\n❌ COMPLETE FLOW FAILED: Could not find resource`);
    }
  } else {
    console.log(`\n❌ No resourceName found in OFFER block`);
  }
}

// Run the tests
async function runTests() {
  try {
    await testResourceLookup();
    await testCompleteFlow();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

runTests();


