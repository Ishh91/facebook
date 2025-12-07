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
