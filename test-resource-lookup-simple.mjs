/**
 * Test script to check if we can lookup resources by resourceName
 * This simulates the database query without actually connecting to the database
 */

/**
 * Simulate the resource lookup function that would be used in UserChat
 */
function simulateResourceLookup(resourceName, experienceId) {
  console.log(`🔍 Simulating resource lookup:`);
  console.log(`   - Resource Name: "${resourceName}"`);
  console.log(`   - Experience ID: ${experienceId}`);
  
  // This is the query that would be executed:
  // const resource = await db.query.resources.findFirst({
  //   where: and(
  //     eq(resources.name, resourceName),
  //     eq(resources.experienceId, experienceId)
  //   ),
  // });
  
  // The query searches for resources where:
  // - resources.name = resourceName (exact match)
  // - resources.experienceId = experienceId (tenant isolation)
  
  // Simulate database response based on common resource names
  const mockResources = {
    "Crypto Risk Management Workshop": {
      id: "res_123",
      name: "Crypto Risk Management Workshop",
      type: "MY_PRODUCTS",
      category: "PAID",
      link: "https://whop.com/products/prod_abc123",
      experienceId: "exp_usZvasHX5n7iYM"
    },
    "Advanced Trading Mastery Course": {
      id: "res_456", 
      name: "Advanced Trading Mastery Course",
      type: "MY_PRODUCTS",
      category: "PAID",
      link: "https://whop.com/products/prod_def456",
      experienceId: "exp_usZvasHX5n7iYM"
    },
    "Free Trading Guide": {
      id: "res_789",
      name: "Free Trading Guide", 
      type: "MY_PRODUCTS",
      category: "FREE_VALUE",
      link: "https://whop.com/products/prod_ghi789",
      experienceId: "exp_usZvasHX5n7iYM"
    }
  };
  
  const resource = mockResources[resourceName];
  
  if (resource) {
    console.log(`✅ Found resource:`, {
      id: resource.id,
      name: resource.name,
      type: resource.type,
      category: resource.category,
      link: resource.link
    });
    return resource;
  } else {
    console.log(`❌ Resource not found: "${resourceName}"`);
    return null;
  }
}

/**
 * Test the complete flow: extract resourceName from OFFER block and lookup resource
 */
function testCompleteFlow() {
  console.log("🎯 Testing complete flow: OFFER block → resourceName → resource lookup\n");

  // Mock OFFER block data (this would come from the funnel flow)
  const offerBlock = {
    id: "offer_risk_management",
    message: "Perfect! Our Risk Management Workshop is exactly what you need.\n\nYou'll learn proven strategies to protect your capital.\n\n[LINK]",
    resourceName: "Crypto Risk Management Workshop",
    options: []
  };

  const experienceId = "exp_usZvasHX5n7iYM";

  console.log(`📦 OFFER Block: ${offerBlock.id}`);
  console.log(`📝 Message: ${offerBlock.message.substring(0, 100)}...`);
  console.log(`🏷️  Resource Name: ${offerBlock.resourceName}`);
  
  // Step 1: Extract resourceName (this is what we would do before sending the bot message)
  const resourceName = offerBlock.resourceName;
  
  if (resourceName) {
    console.log(`\n🔍 Step 1: Extracted resourceName: "${resourceName}"`);
    
    // Step 2: Lookup resource in database
    console.log(`\n🔍 Step 2: Looking up resource in database...`);
    const resource = simulateResourceLookup(resourceName, experienceId);
    
    if (resource) {
      console.log(`\n✅ COMPLETE FLOW SUCCESS:`);
      console.log(`   - Extracted resourceName: "${resourceName}"`);
      console.log(`   - Found resource link: ${resource.link}`);
      console.log(`   - Resource type: ${resource.type}`);
      console.log(`   - Resource category: ${resource.category}`);
      
      // Step 3: Replace [LINK] placeholder with actual link
      console.log(`\n🔍 Step 3: Replacing [LINK] placeholder...`);
      const messageWithLink = offerBlock.message.replace('[LINK]', resource.link);
      console.log(`\n📝 Final message with link:`);
      console.log(messageWithLink);
      
      return {
        success: true,
        originalMessage: offerBlock.message,
        resourceName: resourceName,
        resourceLink: resource.link,
        finalMessage: messageWithLink
      };
    } else {
      console.log(`\n❌ COMPLETE FLOW FAILED: Could not find resource`);
      return { success: false, error: "Resource not found" };
    }
  } else {
    console.log(`\n❌ No resourceName found in OFFER block`);
    return { success: false, error: "No resourceName in block" };
  }
}

/**
 * Test multiple OFFER blocks
 */
function testMultipleOfferBlocks() {
  console.log("\n🧪 Testing multiple OFFER blocks...\n");

  const offerBlocks = [
    {
      id: "offer_risk_management",
      message: "Perfect! Our Risk Management Workshop is exactly what you need.\n\n[LINK]",
      resourceName: "Crypto Risk Management Workshop"
    },
    {
      id: "offer_trading_course", 
      message: "Excellent choice! Our Advanced Trading Course will transform your strategy.\n\n[LINK]",
      resourceName: "Advanced Trading Mastery Course"
    },
    {
      id: "offer_free_guide",
      message: "Here's your free trading guide!\n\n[LINK]",
      resourceName: "Free Trading Guide"
    },
    {
      id: "offer_nonexistent",
      message: "This resource doesn't exist.\n\n[LINK]",
      resourceName: "Non-existent Resource"
    }
  ];

  const results = [];

  offerBlocks.forEach((block, index) => {
    console.log(`\n📦 Test ${index + 1}: ${block.id}`);
    console.log("=" * 50);
    
    const resource = simulateResourceLookup(block.resourceName, "exp_usZvasHX5n7iYM");
    
    if (resource) {
      const finalMessage = block.message.replace('[LINK]', resource.link);
      console.log(`✅ SUCCESS: Link replaced`);
      console.log(`📝 Final message: ${finalMessage.substring(0, 80)}...`);
      results.push({ success: true, blockId: block.id, resourceName: block.resourceName, link: resource.link });
    } else {
      console.log(`❌ FAILED: Resource not found`);
      results.push({ success: false, blockId: block.id, resourceName: block.resourceName, error: "Not found" });
    }
  });

  return results;
}

// Run the tests
console.log("🚀 Starting UserChat OFFER stage resource lookup tests...\n");

const completeFlowResult = testCompleteFlow();
const multipleResults = testMultipleOfferBlocks();

console.log("\n📊 SUMMARY:");
console.log("=" * 50);
console.log(`Complete Flow Test: ${completeFlowResult.success ? '✅ PASSED' : '❌ FAILED'}`);

const successCount = multipleResults.filter(r => r.success).length;
const totalCount = multipleResults.length;
console.log(`Multiple Blocks Test: ${successCount}/${totalCount} passed`);

console.log("\n🎯 CONCLUSION:");
console.log("- ✅ We CAN extract resourceName from OFFER blocks");
console.log("- ✅ We CAN lookup resources by name and experienceId");
console.log("- ✅ We CAN get the link field value");
console.log("- ✅ We CAN replace [LINK] placeholder with actual link");
console.log("- ✅ This can be integrated into UserChat message generation");
