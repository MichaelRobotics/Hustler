# Abandoned Experiences Cleanup System

## Problem Statement

When a Whop owner:
1. **Installs app** → Creates `experience_1` with `whopCompanyId: "company_123"`
2. **Deletes app** → `experience_1` remains in database (orphaned)
3. **Reinstalls app** → Creates `experience_2` with same `whopCompanyId: "company_123"`

**Result:** Multiple experiences for the same company, but only the latest is active.

## Solution Overview

The system now automatically detects and cleans up abandoned experiences when a new experience is created for a company that already has multiple experiences.

## How It Works

### 1. Automatic Cleanup (During New Experience Creation)

When a new experience is created in `lib/context/user-context.ts`:

```typescript
// Before creating new experience, check if we need to cleanup abandoned ones
const companyId = whopCompanyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || "";
if (companyId) {
    const needsCleanup = await checkIfCleanupNeeded(companyId);
    if (needsCleanup) {
        const { cleaned, kept } = await cleanupAbandonedExperiences(companyId);
    }
}
```

### 2. Cleanup Criteria

An experience is considered **abandoned** if:
- ✅ It's not the most recent experience for the company
- ✅ There is a newer experience for the same `whop_company_id`
- ✅ No recent user activity (no users created in last 7 days)
- ✅ No active funnels (`isDeployed` or `wasEverDeployed`)
- ✅ No recent conversations (created in last 7 days)

### 3. Cleanup Process

1. **Identify:** Find all experiences for the company, ordered by creation date
2. **Keep Latest:** Always keep the most recent experience
3. **Evaluate Older:** Check each older experience against cleanup criteria
4. **Delete Safely:** Remove abandoned experiences (CASCADE deletes related data)
5. **Log Results:** Track what was cleaned vs kept

## Manual Cleanup API

### Check Cleanup Status

```bash
# Check specific company
GET /api/admin/cleanup-experiences?companyId=company_123

# Check all companies
GET /api/admin/cleanup-experiences
```

### Perform Cleanup

```bash
# Cleanup specific company (dry run)
POST /api/admin/cleanup-experiences
{
  "companyId": "company_123",
  "dryRun": true
}

# Cleanup specific company (actual)
POST /api/admin/cleanup-experiences
{
  "companyId": "company_123",
  "dryRun": false
}

# Cleanup all companies with multiple experiences
POST /api/admin/cleanup-experiences
{
  "dryRun": false
}
```

## Safety Features

### 1. Conservative Cleanup
- Only cleans up experiences that meet ALL criteria
- Always keeps the most recent experience
- Requires 7 days of inactivity before cleanup

### 2. Data Preservation
- Checks for active funnels before cleanup
- Checks for recent conversations
- Only removes truly abandoned experiences

### 3. Error Handling
- Cleanup failures don't block new experience creation
- Comprehensive logging for debugging
- Graceful fallback if cleanup fails

## Database Impact

### What Gets Deleted (CASCADE)
- ✅ Experience record
- ✅ All users in that experience
- ✅ All funnels in that experience
- ✅ All conversations in that experience
- ✅ All resources in that experience
- ✅ All analytics data for that experience

### What Stays Safe
- ✅ Latest experience (always kept)
- ✅ Experiences with recent activity
- ✅ Experiences with active funnels
- ✅ Experiences with recent conversations

## Monitoring

### Logs to Watch
```
🧹 Company company_123 has multiple experiences, cleaning up abandoned ones...
✅ Cleanup completed: cleaned 1, kept 1 experiences
🗑️ Marking experience exp_456 for cleanup (abandoned)
✅ Keeping experience exp_789 (has active data)
```

### API Response Example
```json
{
  "companyId": "company_123",
  "cleaned": 1,
  "kept": 1,
  "cleanedIds": ["exp_456"],
  "keptIds": ["exp_789"],
  "message": "Cleaned up 1 abandoned experiences, kept 1"
}
```

## Configuration

### Environment Variables
- No additional configuration needed
- Uses existing database connection
- Leverages existing CASCADE delete constraints

### Timing
- Cleanup runs during new experience creation
- 7-day inactivity threshold
- Background processing (non-blocking)

## Testing

### Test Scenarios
1. **Fresh Install:** No cleanup needed
2. **Reinstall After Delete:** Cleanup old experience
3. **Reinstall With Active Data:** Keep old experience
4. **Multiple Reinstalls:** Cleanup all but latest

### Manual Testing
```bash
# Check current state
curl "http://localhost:3000/api/admin/cleanup-experiences"

# Test cleanup for specific company
curl -X POST "http://localhost:3000/api/admin/cleanup-experiences" \
  -H "Content-Type: application/json" \
  -d '{"companyId": "company_123", "dryRun": true}'
```

## Credits Behavior

### Fresh Install (First Time)
- ✅ Admin users get **2 credits** when they first install the app
- ✅ This is a one-time welcome bonus

### Reinstall Scenario (After Delete/Reinstall)
- ❌ Admin users get **0 credits** when reinstalling the app
- ❌ Prevents credit farming through repeated installs
- ✅ System detects reinstall by checking for existing experiences

### Detection Logic
```typescript
// Check if there are existing experiences for this company
const needsCleanup = await checkIfCleanupNeeded(companyId);
const isReinstallScenario = needsCleanup; // Multiple experiences = reinstall

// Only give credits on fresh installs
const shouldGiveCredits = initialAccessLevel === "admin" && !isReinstallScenario;
const initialCredits = shouldGiveCredits ? 2 : 0;
```

## Benefits

1. **Prevents Database Bloat:** Removes orphaned experiences
2. **Maintains Data Integrity:** Keeps only active experiences
3. **Automatic:** No manual intervention required
4. **Safe:** Conservative cleanup criteria
5. **Transparent:** Comprehensive logging and monitoring
6. **Efficient:** Runs only when needed
7. **Prevents Credit Abuse:** No credits on reinstalls

## Future Enhancements

- Configurable inactivity threshold
- Batch cleanup for multiple companies
- Cleanup scheduling (cron job)
- Metrics and reporting
- Webhook notifications for cleanup events
