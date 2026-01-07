# News API

A Vercel-deployable serverless API for fetching Google News data using the `gnews` package.

## 🔐 Authentication

All API requests require authentication using an API key. This protects the API from unauthorized access.

### Required Headers

```
X-API-Key: your-secret-api-key
```

### Environment Variables

| Variable         | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `API_SECRET_KEY` | Secret key for API authentication (must be set in Vercel) |

## Deployment

1. **Install Vercel CLI** (if not installed):

   ```bash
   npm i -g vercel
   ```

2. **Navigate to the api folder**:

   ```bash
   cd api
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Set up environment variables in Vercel**:

   Go to your Vercel Dashboard → Project → Settings → Environment Variables and add:

   ```
   API_SECRET_KEY=your-secret-key-here
   ```

   > 💡 Generate a secure key: `openssl rand -hex 32` (Linux/Mac) or use an online generator.

5. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

## API Endpoints

Base URL: `https://your-domain.vercel.app`

> ⚠️ **All requests must include the `X-API-Key` header**

### Get Headlines

```bash
curl -H "X-API-Key: your-key" "https://your-domain.vercel.app/api/news?type=headlines&n=20&country=us&language=en"
```

### Get News by Topic

```bash
curl -H "X-API-Key: your-key" "https://your-domain.vercel.app/api/news?type=topic&topic=TECHNOLOGY&n=20"
```

**Valid topics**: WORLD, BUSINESS, TECHNOLOGY, SCIENCE, ENTERTAINMENT, SPORTS, HEALTH

### Search News

```bash
curl -H "X-API-Key: your-key" "https://your-domain.vercel.app/api/news?type=search&query=SpaceX&n=20"
```

### Get News by Location

```bash
curl -H "X-API-Key: your-key" "https://your-domain.vercel.app/api/news?type=geo&location=New York&n=20"
```

## Response Format

### Success Response

```json
{
  "success": true,
  "count": 20,
  "type": "headlines",
  "articles": [
    {
      "title": "Article Title",
      "link": "https://...",
      "pubDate": "Mon, 07 Jan 2026 10:00:00 GMT",
      "description": "Article description...",
      "source": "CNN",
      "image": "https://..."
    }
  ]
}
```

### Error Responses

**401 Unauthorized** - Missing or invalid API key:

```json
{
  "error": "Unauthorized: Invalid or missing API key"
}
```

**500 Server Error** - API key not configured:

```json
{
  "error": "Server configuration error"
}
```

## Local Development

1. Create a `.env` file:

   ```env
   API_SECRET_KEY=your-dev-secret-key
   ```

2. Run the development server:
   ```bash
   cd api
   npm install
   vercel dev
   ```

The API will be available at `http://localhost:3000/api/news`
