// Test script to fetch real resources from database and test AI generation
import dotenv from 'dotenv';
import { generateFunnelFlow } from './lib/actions/ai-actions';
import { db, checkDatabaseConnection } from './lib/supabase/db';
import { resources } from './lib/supabase/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testWithRealDatabaseResources() {
  console.log("=== REAL DATABASE RESOURCES TEST ===");
  
  // Check database connection
  console.log("Checking database connection...");
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.error("❌ Cannot connect to database. Exiting.");
    return;
  }

  try {
    // Fetch real resources from database
    console.log("\nFetching real resources from database...");
    const realResources = await db
      .select()
      .from(resources)
      .limit(10); // Get up to 10 resources for testing

    if (realResources.length === 0) {
      console.log("❌ No resources found in database. Please add some resources first.");
      return;
    }

    console.log(`\nFound ${realResources.length} real resources from database:`);
    realResources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.name} (ID: ${resource.id}, Category: ${resource.category}, Type: ${resource.type})`);
    });

    // Convert database resources to the format expected by generateFunnelFlow
    const formattedResources = realResources.map(resource => ({
      id: resource.id,
      name: resource.name,
      link: resource.link,
      type: resource.type as "AFFILIATE" | "MY_PRODUCTS",
      category: resource.category as "PAID" | "FREE_VALUE",
      description: resource.description || undefined,
      promoCode: resource.code || undefined
    }));

    console.log("\n=== STRICT REQUIREMENTS ===");
    console.log("✅ VALUE_DELIVERY blocks:");
    console.log("   - MUST contain ONLY products with category FREE_VALUE");
    console.log("   - NO duplicates of FREE_VALUE products");
    console.log("   - NO imaginary or made-up products");
    console.log("   - Each FREE_VALUE product gets exactly ONE block");

    console.log("✅ OFFER blocks:");
    console.log("   - MUST contain ONLY products with category PAID");
    console.log("   - NO duplicates of PAID products");
    console.log("   - NO imaginary or made-up products");
    console.log("   - Each PAID product gets exactly ONE block");

    const freeValueResources = formattedResources.filter(r => r.category === "FREE_VALUE");
    const paidResources = formattedResources.filter(r => r.category === "PAID");

    console.log(`\nExpected VALUE_DELIVERY blocks: ${freeValueResources.length}`);
    freeValueResources.forEach(r => console.log(`  - ${r.name}`));

    console.log(`\nExpected OFFER blocks: ${paidResources.length}`);
    paidResources.forEach(r => console.log(`  - ${r.name}`));

    console.log("\n=== CALLING generateFunnelFlow WITH REAL DATABASE RESOURCES ===");

    // Test the function with real database resources
    const result = await generateFunnelFlow(formattedResources);
    
    console.log("\n=== GENERATED RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    
    console.log("\n=== RIGID VALIDATION ===");
    
    // Find VALUE_DELIVERY blocks
    const valueDeliveryBlocks = Object.values(result.blocks).filter(block => {
      const isValueDelivery = result.stages.some(
        stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(block.id)
      );
      return isValueDelivery;
    });
    
    // Find OFFER blocks
    const offerBlocks = Object.values(result.blocks).filter(block => {
      const isOffer = result.stages.some(
        stage => stage.name === "OFFER" && stage.blockIds.includes(block.id)
      );
      return isOffer;
    });
    
    console.log(`\nVALUE_DELIVERY blocks found: ${valueDeliveryBlocks.length}`);
    valueDeliveryBlocks.forEach(block => {
      console.log(`  - Block ID: ${block.id}, resourceName: ${block.resourceName}`);
    });
    
    console.log(`\nOFFER blocks found: ${offerBlocks.length}`);
    offerBlocks.forEach(block => {
      console.log(`  - Block ID: ${block.id}, resourceName: ${block.resourceName}`);
    });
    
    // RIGID VALIDATION
    let allTestsPassed = true;
    const errors: string[] = [];
    
    console.log("\n=== RIGID VALIDATION CHECKS ===");
    
    // 1. Check VALUE_DELIVERY blocks contain only FREE_VALUE products
    console.log("\n1. VALUE_DELIVERY BLOCKS VALIDATION:");
    valueDeliveryBlocks.forEach(block => {
      if (!block.resourceName) {
        errors.push(`❌ VALUE_DELIVERY block ${block.id} has no resourceName`);
        allTestsPassed = false;
        return;
      }
      
      const resource = formattedResources.find(r => r.name === block.resourceName);
      if (!resource) {
        errors.push(`❌ VALUE_DELIVERY block ${block.id} references non-existent resource: ${block.resourceName}`);
        allTestsPassed = false;
      } else if (resource.category !== "FREE_VALUE") {
        errors.push(`❌ VALUE_DELIVERY block ${block.id} contains PAID resource: ${block.resourceName} (${resource.category})`);
        allTestsPassed = false;
      } else {
        console.log(`✅ CORRECT: ${block.resourceName} (${resource.category}) in VALUE_DELIVERY block`);
      }
    });
    
    // 2. Check OFFER blocks contain only PAID products
    console.log("\n2. OFFER BLOCKS VALIDATION:");
    offerBlocks.forEach(block => {
      if (!block.resourceName) {
        errors.push(`❌ OFFER block ${block.id} has no resourceName`);
        allTestsPassed = false;
        return;
      }
      
      const resource = formattedResources.find(r => r.name === block.resourceName);
      if (!resource) {
        errors.push(`❌ OFFER block ${block.id} references non-existent resource: ${block.resourceName}`);
        allTestsPassed = false;
      } else if (resource.category !== "PAID") {
        errors.push(`❌ OFFER block ${block.id} contains FREE_VALUE resource: ${block.resourceName} (${resource.category})`);
        allTestsPassed = false;
      } else {
        console.log(`✅ CORRECT: ${block.resourceName} (${resource.category}) in OFFER block`);
      }
    });
    
    // 3. Check for duplicates in VALUE_DELIVERY blocks
    console.log("\n3. VALUE_DELIVERY DUPLICATE CHECK:");
    const valueDeliveryResourceNames = valueDeliveryBlocks
      .map(block => block.resourceName)
      .filter(name => name);
    
    const valueDeliveryDuplicates = valueDeliveryResourceNames.filter((name, index) => 
      valueDeliveryResourceNames.indexOf(name) !== index
    );
    
    if (valueDeliveryDuplicates.length > 0) {
      errors.push(`❌ DUPLICATE FREE_VALUE resources in VALUE_DELIVERY: ${valueDeliveryDuplicates.join(', ')}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ NO duplicates in VALUE_DELIVERY blocks`);
    }
    
    // 4. Check for duplicates in OFFER blocks
    console.log("\n4. OFFER DUPLICATE CHECK:");
    const offerResourceNames = offerBlocks
      .map(block => block.resourceName)
      .filter(name => name);
    
    const offerDuplicates = offerResourceNames.filter((name, index) => 
      offerResourceNames.indexOf(name) !== index
    );
    
    if (offerDuplicates.length > 0) {
      errors.push(`❌ DUPLICATE PAID resources in OFFER: ${offerDuplicates.join(', ')}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ NO duplicates in OFFER blocks`);
    }
    
    // 5. Check that all FREE_VALUE resources are represented
    console.log("\n5. FREE_VALUE COVERAGE CHECK:");
    const representedFreeValue = valueDeliveryResourceNames;
    const missingFreeValue = freeValueResources.filter(r => !representedFreeValue.includes(r.name));
    
    if (missingFreeValue.length > 0) {
      errors.push(`❌ MISSING FREE_VALUE resources in VALUE_DELIVERY: ${missingFreeValue.map(r => r.name).join(', ')}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ ALL FREE_VALUE resources represented in VALUE_DELIVERY`);
    }
    
    // 6. Check that all PAID resources are represented
    console.log("\n6. PAID COVERAGE CHECK:");
    const representedPaid = offerResourceNames;
    const missingPaid = paidResources.filter(r => !representedPaid.includes(r.name));
    
    if (missingPaid.length > 0) {
      errors.push(`❌ MISSING PAID resources in OFFER: ${missingPaid.map(r => r.name).join(', ')}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ ALL PAID resources represented in OFFER`);
    }
    
    // 7. Check for imaginary products
    console.log("\n7. IMAGINARY PRODUCT CHECK:");
    const allResourceNames = [...valueDeliveryResourceNames, ...offerResourceNames];
    const imaginaryProducts = allResourceNames.filter(name => 
      !formattedResources.some(r => r.name === name)
    );
    
    if (imaginaryProducts.length > 0) {
      errors.push(`❌ IMAGINARY products found: ${imaginaryProducts.join(', ')}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ NO imaginary products found`);
    }
    
    // 8. Check exact count match
    console.log("\n8. COUNT MATCH CHECK:");
    if (valueDeliveryBlocks.length !== freeValueResources.length) {
      errors.push(`❌ VALUE_DELIVERY block count mismatch: Expected ${freeValueResources.length}, got ${valueDeliveryBlocks.length}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ VALUE_DELIVERY block count matches FREE_VALUE resources: ${valueDeliveryBlocks.length}`);
    }
    
    if (offerBlocks.length !== paidResources.length) {
      errors.push(`❌ OFFER block count mismatch: Expected ${paidResources.length}, got ${offerBlocks.length}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ OFFER block count matches PAID resources: ${offerBlocks.length}`);
    }
    
    // Print all errors
    if (errors.length > 0) {
      console.log("\n=== ERRORS FOUND ===");
      errors.forEach(error => console.log(error));
    }
    
    console.log(`\n=== FINAL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'} ===`);
    
    if (allTestsPassed) {
      console.log("\n🎉 RIGID VALIDATION SUCCESSFUL WITH REAL DATABASE RESOURCES!");
      console.log("✅ All real resources placed in correct stages");
      console.log("✅ No duplicates found");
      console.log("✅ No imaginary products");
      console.log("✅ Perfect 1:1 mapping");
      console.log("✅ All resources represented");
    } else {
      console.log("\n❌ RIGID VALIDATION FAILED WITH REAL DATABASE RESOURCES!");
      console.log("❌ Some requirements not met");
    }

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

// Run the test
testWithRealDatabaseResources()
  .then(() => {
    console.log("\n=== TEST COMPLETED ===");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  });
