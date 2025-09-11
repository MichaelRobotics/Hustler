/**
 * Debug script to test WHOP access check
 * Run this to see what WHOP SDK returns for your user
 */

const { WhopServerSdk } = require("@whop/api");

// Initialize WHOP SDK
const whopSdk = WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "fallback",
    appApiKey: process.env.WHOP_API_KEY ?? "fallback",
    onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
    companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
});

async function debugWhopAccess() {
    try {
        console.log("🔍 Debugging WHOP Access Check");
        console.log("=====================================");
        
        // Get your user ID from WHOP token (you'll need to provide this)
        const userId = process.argv[2];
        const experienceId = process.argv[3];
        
        if (!userId || !experienceId) {
            console.log("Usage: node debug-whop-access.js <userId> <experienceId>");
            console.log("Example: node debug-whop-access.js usr_123 exp_456");
            return;
        }
        
        console.log(`User ID: ${userId}`);
        console.log(`Experience ID: ${experienceId}`);
        console.log("");
        
        // Test 1: Get user info
        console.log("1️⃣ Getting user info...");
        try {
            const user = await whopSdk.users.getUser({ userId });
            console.log("✅ User found:", {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email
            });
        } catch (error) {
            console.log("❌ Error getting user:", error.message);
        }
        
        console.log("");
        
        // Test 2: Get experience info
        console.log("2️⃣ Getting experience info...");
        try {
            const experience = await whopSdk.experiences.getExperience({ experienceId });
            console.log("✅ Experience found:", {
                id: experience.id,
                name: experience.name,
                companyId: experience.company.id,
                companyName: experience.company.name
            });
        } catch (error) {
            console.log("❌ Error getting experience:", error.message);
        }
        
        console.log("");
        
        // Test 3: Check access to experience
        console.log("3️⃣ Checking access to experience...");
        try {
            const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
                userId,
                experienceId
            });
            console.log("✅ Access check result:", {
                hasAccess: accessResult.hasAccess,
                accessLevel: accessResult.accessLevel,
                fullResult: accessResult
            });
        } catch (error) {
            console.log("❌ Error checking access:", error.message);
        }
        
        console.log("");
        
        // Test 4: Check if user is company owner
        console.log("4️⃣ Checking if user is company owner...");
        try {
            const experience = await whopSdk.experiences.getExperience({ experienceId });
            const company = await whopSdk.companies.getCompany({ companyId: experience.company.id });
            console.log("✅ Company info:", {
                id: company.id,
                name: company.name,
                ownerId: company.ownerId
            });
            console.log(`Is user company owner? ${userId === company.ownerId ? "YES" : "NO"}`);
        } catch (error) {
            console.log("❌ Error checking company ownership:", error.message);
        }
        
    } catch (error) {
        console.error("💥 Fatal error:", error);
    }
}

debugWhopAccess();

