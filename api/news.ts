import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import gnews - note: using require for CommonJS compatibility
const news = require('gnews');

type NewsType = 'headlines' | 'topic' | 'search' | 'geo';
type TopicType = 'WORLD' | 'BUSINESS' | 'TECHNOLOGY' | 'SCIENCE' | 'ENTERTAINMENT' | 'SPORTS' | 'HEALTH';

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source?: string;
  image?: string;
}

interface NewsOptions {
  country?: string;
  language?: string;
  n?: number;
}

// Helper to extract source domain for logo fallback
function getSourceDomain(source: string): string {
  const domainMap: Record<string, string> = {
    'CNN': 'cnn.com',
    'BBC': 'bbc.com',
    'Reuters': 'reuters.com',
    'The New York Times': 'nytimes.com',
    'The Washington Post': 'washingtonpost.com',
    'The Guardian': 'theguardian.com',
    'Fox News': 'foxnews.com',
    'NBC News': 'nbcnews.com',
    'CBS News': 'cbsnews.com',
    'ABC News': 'abcnews.go.com',
    'Bloomberg': 'bloomberg.com',
    'CNBC': 'cnbc.com',
    'Forbes': 'forbes.com',
    'Wall Street Journal': 'wsj.com',
    'Axios': 'axios.com',
    'Politico': 'politico.com',
    'AP News': 'apnews.com',
    'NPR': 'npr.org',
    'USA Today': 'usatoday.com',
    'The Hill': 'thehill.com',
  };
  return domainMap[source] || '';
}

// Generate a placeholder image URL using picsum for random images
function generatePlaceholderImage(title: string): string {
  // Use title hash to get consistent random image per article
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${hash}/800/400`;
}

// Helper to extract source from title (gnews format: "Title - Source")
function parseArticle(article: any): NewsArticle {
  const titleParts = article.title?.split(' - ') || [];
  const source = titleParts.length > 1 ? titleParts.pop() : 'Unknown';
  const title = titleParts.join(' - ');

  return {
    title: title || article.title,
    link: article.link,
    pubDate: article.pubDate,
    description: article.description,
    source,
    // Only use actual images from the article, no fake placeholders
    image: article.image || article.thumbnail || null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // API Key Authentication
  const apiSecretKey = process.env.API_SECRET_KEY;
  const providedApiKey = req.headers['x-api-key'] as string;

  if (!apiSecretKey) {
    console.error('API_SECRET_KEY environment variable is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!providedApiKey || providedApiKey !== apiSecretKey) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      type = 'headlines',
      topic,
      query,
      location,
      n = '20',
      country = 'us',
      language = 'en',
    } = req.query;

    const options: NewsOptions = {
      country: String(country),
      language: String(language),
      n: Math.min(parseInt(String(n), 10) || 20, 50), // Max 50 articles
    };

    let articles: any[] = [];

    switch (type as NewsType) {
      case 'headlines':
        articles = await news.headlines(options);
        break;

      case 'topic':
        if (!topic) {
          res.status(400).json({ error: 'topic parameter required for type=topic' });
          return;
        }
        const validTopics: TopicType[] = ['WORLD', 'BUSINESS', 'TECHNOLOGY', 'SCIENCE', 'ENTERTAINMENT', 'SPORTS', 'HEALTH'];
        const upperTopic = String(topic).toUpperCase() as TopicType;
        if (!validTopics.includes(upperTopic)) {
          res.status(400).json({ 
            error: `Invalid topic. Valid topics: ${validTopics.join(', ')}` 
          });
          return;
        }
        articles = await news.topic(upperTopic, options);
        break;

      case 'search':
        if (!query) {
          res.status(400).json({ error: 'query parameter required for type=search' });
          return;
        }
        articles = await news.search(String(query), options);
        break;

      case 'geo':
        if (!location) {
          res.status(400).json({ error: 'location parameter required for type=geo' });
          return;
        }
        articles = await news.geo(String(location), options);
        break;

      default:
        res.status(400).json({ 
          error: 'Invalid type. Valid types: headlines, topic, search, geo' 
        });
        return;
    }

    // Filter out premium/paywalled sources
    const PREMIUM_DOMAINS = [
      'wsj.com', 'bloomberg.com', 'ft.com', 'nytimes.com', 
      'washingtonpost.com', 'economist.com', 'hbr.org', 
      'newyorker.com', 'thetimes.co.uk', 'telegraph.co.uk',
      'businessinsider.com', 'marketwatch.com', 'barrons.com'
    ];

    const filteredArticles = articles.filter(article => {
      const link = article.link || '';
      return !PREMIUM_DOMAINS.some(domain => link.includes(domain));
    });

    // Parse and return articles
    const parsedArticles = filteredArticles.map(parseArticle);

    res.status(200).json({
      success: true,
      count: parsedArticles.length,
      type,
      articles: parsedArticles,
    });

  } catch (error) {
    console.error('News API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
