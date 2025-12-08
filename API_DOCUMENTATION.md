# Bulk Link Creation API Documentation

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/bulk-create-links
```

## Authentication

This is a public endpoint that doesn't require authentication. For production use, you may want to add API key authentication.

## Request Format

### Headers
```
Content-Type: application/json
```

### Body Schema
```typescript
{
  "links": Array<{
    original_url: string;        // Required: Must start with http:// or https://
    custom_code?: string;        // Optional: Custom short code (alphanumeric only)
    is_affiliate?: boolean;      // Optional: Mark as affiliate link (default: false)
    redirect_delay?: number;     // Optional: Delay in seconds (default: 3)
    title?: string;              // Optional: Link title
  }>
}
```

### Constraints
- Maximum 100 links per request
- Each `original_url` must start with `http://` or `https://`
- Custom codes are alphanumeric only
- Duplicate short codes are automatically handled

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "created": 5,
  "failed": 0,
  "links": [
    {
      "id": "uuid-string",
      "short_code": "abc123",
      "original_url": "https://example.com/page1",
      "title": "My Link",
      "is_affiliate": false,
      "redirect_delay": 3,
      "total_clicks": 0,
      "estimated_revenue": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "is_active": true
    }
  ],
  "errors": []
}
```

### Partial Success Response (200)
```json
{
  "success": true,
  "created": 3,
  "failed": 2,
  "links": [...],
  "errors": [
    {
      "index": 1,
      "error": "Missing original_url"
    },
    {
      "index": 4,
      "error": "URL must start with http:// or https://"
    }
  ]
}
```

### Error Response (400/500)
```json
{
  "error": "Error message description"
}
```

## Usage Examples

### Example 1: Basic Link Creation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/bulk-create-links \
  -H "Content-Type: application/json" \
  -d '{
    "links": [
      {
        "original_url": "https://example.com/product1"
      },
      {
        "original_url": "https://example.com/product2"
      }
    ]
  }'
```

### Example 2: Custom Codes and Affiliate Links

```bash
curl -X POST https://your-project.supabase.co/functions/v1/bulk-create-links \
  -H "Content-Type: application/json" \
  -d '{
    "links": [
      {
        "original_url": "https://amazon.com/product1",
        "custom_code": "amzn1",
        "is_affiliate": true,
        "redirect_delay": 5,
        "title": "Amazon Product 1"
      },
      {
        "original_url": "https://amazon.com/product2",
        "custom_code": "amzn2",
        "is_affiliate": true,
        "redirect_delay": 5,
        "title": "Amazon Product 2"
      }
    ]
  }'
```

### Example 3: JavaScript/Node.js

```javascript
const createBulkLinks = async (links) => {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/bulk-create-links',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ links }),
    }
  );

  return await response.json();
};

const links = [
  {
    original_url: 'https://example.com/page1',
    custom_code: 'custom1',
    is_affiliate: false,
    redirect_delay: 3,
  },
  {
    original_url: 'https://example.com/page2',
    is_affiliate: true,
    redirect_delay: 5,
  },
];

const result = await createBulkLinks(links);
console.log(`Created ${result.created} links, ${result.failed} failed`);
```

### Example 4: Python

```python
import requests
import json

url = "https://your-project.supabase.co/functions/v1/bulk-create-links"

payload = {
    "links": [
        {
            "original_url": "https://example.com/page1",
            "custom_code": "custom1",
            "is_affiliate": False,
            "redirect_delay": 3
        },
        {
            "original_url": "https://example.com/page2",
            "is_affiliate": True,
            "redirect_delay": 5
        }
    ]
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
result = response.json()

print(f"Created {result['created']} links, {result['failed']} failed")
for link in result['links']:
    print(f"Short URL: {link['short_code']}")
```

## Rate Limiting

Currently, there are no rate limits enforced. For production use, consider implementing:
- API key authentication
- Rate limiting per API key
- Request throttling
- IP-based rate limiting

## Error Handling

The API will continue processing even if some links fail. Check the `errors` array in the response for details about failed links. The `index` field corresponds to the position in the input array.

Common error messages:
- `"Missing original_url"` - URL field is required
- `"URL must start with http:// or https://"` - Invalid URL format
- `"Could not generate unique short code"` - Too many collisions (retry with different custom code)
- `"Maximum 100 links per request"` - Exceeded batch size limit

## Best Practices

1. **Batch Size**: Keep requests under 100 links for optimal performance
2. **Custom Codes**: Use meaningful, memorable codes for better user experience
3. **Affiliate Links**: Mark affiliate links to track revenue accurately
4. **Error Handling**: Always check the `errors` array in responses
5. **Retry Logic**: Implement exponential backoff for failed requests
6. **Validation**: Validate URLs on the client side before sending

## Support

For issues or questions, refer to the main README.md file.

---

# Facebook Story Scheduler Guide

## Overview

The Facebook Story Scheduler allows you to automatically post stories to Facebook at scheduled times. Perfect for content creators, businesses, and marketers who want to maintain a consistent posting schedule.

## Features

- Connect multiple Facebook accounts
- Schedule image stories with captions
- Automatic posting at scheduled times
- Track posting status (pending, processing, posted, failed)
- Manual scheduler trigger
- Retry logic for failed posts

## Getting Started

### Step 1: Access the Scheduler

Navigate to the Facebook Story Scheduler:
- Click "FB Scheduler" button in the navigation
- Or go directly to `/facebook-scheduler`

### Step 2: Connect Your Facebook Account

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app from the dropdown
3. Click "Add a Permission" and select:
   - `pages_manage_posts`
   - `pages_read_engagement`
4. Click "Generate Access Token"
5. Copy the access token
6. Return to the scheduler and click "Add Account"
7. Fill in the form:
   - **Access Token**: Paste your token from step 5
   - **Page ID**: (Optional) Your Facebook page ID if posting to a page
   - **Page Name**: (Optional) Friendly name for reference
   - **Token Expiry Date**: When your token expires
8. Click "Add Account"

### Step 3: Schedule a Story

1. Click "Schedule New Story"
2. Fill in the form:
   - **Facebook Account**: Select the account to post to
   - **Image URL**: Direct URL to your image (must start with http:// or https://)
   - **Caption**: Optional text to display with the story
   - **Scheduled Time**: When to post the story
3. Click "Schedule Story"

### Step 4: Manage Scheduled Stories

- View all scheduled stories in the "Scheduled Stories" section
- See status: pending, processing, posted, or failed
- Delete pending stories if needed
- Click "Run Scheduler" to manually process pending posts

## API Endpoints

### Post Story to Facebook

**URL**: `POST /functions/v1/post-facebook-story`

**Request**:
```json
{
  "story_id": "uuid-of-scheduled-story"
}
```

**Response** (Success):
```json
{
  "success": true,
  "facebook_story_id": "story-id-from-facebook",
  "message": "Story posted successfully"
}
```

**Response** (Error):
```json
{
  "error": "Error message",
  "details": {}
}
```

### Process Scheduled Stories

**URL**: `POST /functions/v1/process-scheduled-stories`

This endpoint checks for pending stories whose scheduled time has arrived and automatically posts them.

**Response**:
```json
{
  "success": true,
  "processed": 5,
  "successful": 4,
  "failed": 1,
  "results": [
    {
      "story_id": "uuid",
      "success": true,
      "facebook_story_id": "story-id"
    }
  ]
}
```

## Database Schema

### facebook_accounts Table

- `id` (UUID, PK) - Account ID
- `user_id` (TEXT) - Owner's user ID
- `facebook_user_id` (TEXT) - Facebook user ID
- `access_token` (TEXT) - Facebook access token
- `page_id` (TEXT, optional) - Facebook page ID
- `page_name` (TEXT, optional) - Page name for reference
- `token_expires_at` (TIMESTAMP) - When token expires
- `is_active` (BOOLEAN) - Whether account is active
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Last update time

### scheduled_stories Table

- `id` (UUID, PK) - Story ID
- `facebook_account_id` (UUID, FK) - Associated account
- `story_type` (TEXT) - Type: 'image' or 'video'
- `media_url` (TEXT) - URL to the media file
- `caption` (TEXT, optional) - Story caption
- `link_url` (TEXT, optional) - Swipe-up link
- `scheduled_time` (TIMESTAMP) - When to post
- `status` (TEXT) - pending, processing, posted, failed, cancelled
- `posted_at` (TIMESTAMP, optional) - When it was posted
- `facebook_story_id` (TEXT, optional) - Facebook's ID
- `error_message` (TEXT, optional) - Error details
- `retry_count` (INTEGER) - Number of retries
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Last update time

## Important Notes

### Access Token Management

- Long-lived tokens last 60 days
- For permanent posting, exchange for page access tokens
- Always monitor token expiry dates
- Refresh tokens before they expire

### Image Requirements

- Must be publicly accessible URL
- Common formats: JPEG, PNG
- Size: 1080 x 1920 pixels (optimal)
- Facebook has specific requirements - refer to their documentation

### Scheduling Best Practices

1. **Schedule Ahead**: Give yourself buffer time before posting
2. **Monitor Status**: Check story status after posting
3. **Timezone**: Use local timezone for scheduled times
4. **Backup**: Keep copies of important stories
5. **Token Management**: Refresh tokens monthly

### Error Handling

If a story fails to post:
- Check if token is still valid
- Verify image URL is accessible
- Ensure account is still active
- Check Facebook account permissions

Manual retry is handled through the "Run Scheduler" button, which will retry failed stories up to 3 times.

## Workflow Example

```
1. Connect Facebook Account
   ↓
2. Schedule Story with Image URL and Time
   ↓
3. Story Status: PENDING
   ↓
4. When scheduled time arrives:
   - System changes status to PROCESSING
   - Posts to Facebook
   ↓
5. Story Status: POSTED or FAILED
   ↓
6. If FAILED:
   - Retry up to 3 times
   - Or schedule a new story
```

## Tips for Success

- Use high-quality images
- Write engaging captions
- Post during peak audience hours
- Monitor which stories perform best
- Use consistent branding
- Plan content in advance
- Test with one story first

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Token expired" | Get a new access token from Graph API Explorer |
| "Account not active" | Check if account is connected and active |
| "Image URL not found" | Verify URL is public and accessible |
| "Failed to post to Facebook" | Check account permissions and token validity |
| "Story not showing up" | Facebook may have deleted it or account restrictions |

## Security

- Access tokens are stored securely in Supabase
- Only account owner can manage their stories
- Row-level security enforces data isolation
- Tokens should never be shared
- Use page tokens for production accounts
