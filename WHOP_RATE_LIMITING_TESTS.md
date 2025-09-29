# Whop SDK Rate Limiting Tests

This directory contains comprehensive test functions to analyze Whop's rate limiting behavior and SDK functionality.

## Test Files

### 1. `test-whop-rate-limits-simple.mjs`
**Simple and focused rate limiting test**
- Tests basic SDK functions
- Triggers rate limiting with rapid requests
- Tests recovery after rate limiting
- Quick and easy to run

```bash
node test-whop-rate-limits-simple.mjs
```

### 2. `test-whop-rate-limiting.mjs`
**Comprehensive rate limiting analysis**
- Tests multiple SDK functions
- Detailed performance monitoring
- Rate limit event tracking
- Recovery testing
- Detailed reporting

```bash
node test-whop-rate-limiting.mjs
```

### 3. `test-whop-comprehensive-rate-limits.mjs`
**Advanced rate limiting analysis**
- Most comprehensive testing
- Concurrent request testing
- Performance metrics
- Best practices validation
- Detailed recommendations

```bash
node test-whop-comprehensive-rate-limits.mjs
```

## Whop Rate Limiting Documentation

Based on Whop's official documentation:

### Rate Limits
- **v5 endpoints**: 20 requests every 10 seconds
- **v2 endpoints**: 100 requests every 10 seconds
- **Cooldown**: 60 seconds when limit is exceeded
- **Error Response**: 429 "You are being rate limited"

### Rate Limit Response
When rate limited, you receive:
```json
{
  "message": "You are being rate limited"
}
```

## Test Features

### What the tests do:
1. **Basic SDK Testing**: Tests common SDK functions
2. **Rate Limit Triggering**: Makes rapid requests to trigger limits
3. **Recovery Testing**: Waits for cooldown and tests recovery
4. **Performance Monitoring**: Tracks response times and success rates
5. **Error Analysis**: Identifies and categorizes different error types
6. **Concurrent Testing**: Tests multiple simultaneous requests

### Metrics Tracked:
- Response times
- Success/failure rates
- Rate limiting events
- Error patterns
- Recovery times

## Environment Setup

Make sure you have these environment variables in `.env.local`:

```bash
WHOP_API_KEY=your_api_key
NEXT_PUBLIC_WHOP_APP_ID=your_app_id
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_user_id
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id
```

## Running the Tests

### Quick Test (Recommended for first run)
```bash
node test-whop-rate-limits-simple.mjs
```

### Comprehensive Analysis
```bash
node test-whop-comprehensive-rate-limits.mjs
```

### Full Detailed Test
```bash
node test-whop-rate-limiting.mjs
```

## Expected Results

### Normal Operation
- Most requests should succeed
- Response times typically 100-500ms
- No rate limiting for normal usage

### Rate Limiting Triggered
- Some requests will return 429 errors
- "You are being rate limited" messages
- 60-second cooldown period
- Recovery after cooldown

### Performance Insights
- Average response times
- Success/failure rates
- Rate limiting patterns
- Recovery behavior

## Best Practices from Tests

1. **Implement Exponential Backoff**
   ```javascript
   const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
   ```

2. **Cache Frequently Accessed Data**
   ```javascript
   const cache = new Map();
   const cacheKey = `user_${userId}`;
   ```

3. **Batch Operations**
   ```javascript
   // Instead of multiple individual calls
   const batchResults = await Promise.all(requests);
   ```

4. **Monitor Rate Limits**
   ```javascript
   if (error.status === 429) {
     // Handle rate limiting
   }
   ```

5. **Use Webhooks for Real-time Updates**
   ```javascript
   // Instead of polling, use webhooks
   app.post('/webhook', (req, res) => {
     // Handle real-time updates
   });
   ```

## Troubleshooting

### Common Issues:
1. **Missing Environment Variables**: Check `.env.local` file
2. **API Key Permissions**: Ensure API key has required scopes
3. **Rate Limiting**: Normal behavior when limits are exceeded
4. **Network Issues**: Check internet connection

### Debug Mode:
Add `DEBUG=true` to see more detailed output:
```bash
DEBUG=true node test-whop-rate-limits-simple.mjs
```

## Test Results Interpretation

### Success Indicators:
- ✅ Most requests succeed
- ✅ Response times under 1 second
- ✅ Rate limiting detected when expected
- ✅ Recovery works after cooldown

### Warning Signs:
- ❌ High failure rates
- ❌ Very slow response times
- ❌ No rate limiting detected (may indicate low request volume)
- ❌ Recovery failures

## Contributing

To add new test cases:
1. Add new test functions to the test files
2. Include proper error handling
3. Add performance monitoring
4. Update documentation

## Support

For issues with the tests or Whop SDK:
1. Check Whop documentation: https://docs.whop.com
2. Review rate limiting docs: https://docs.whop.com/api-reference/v5/rate-limits
3. Check SDK reference: https://docs.whop.com/sdk



